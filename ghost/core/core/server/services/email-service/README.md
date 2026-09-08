# Email service

Renders newsletter emails, splits them into recipient batches, and submits the
batches to the configured email provider. Domain terms live in
[CONTEXT.md](CONTEXT.md).

## Recipient preparation

New emails record `preflight_email_count` when they are created. Its presence,
including zero, selects recipient accounting. Historical emails with null are
opted in before rebuilding if every existing batch is pending (or no batches
exist). Their stored `email_count` supplies the preflight estimate. This opt-in
is saved before any preparation writes, so interrupted conversions use the same
rebuild protocol on retry.

A historical email with any batch in `submitting`, `submitted`, or `failed`
reuses its entire existing batch set without selecting the audience again or
inventing accounting metadata. Legacy submission starts only after all batch
creation completes. These already-started sends retain their legacy completion
checks; they do not need a separate preparation algorithm.

For historical emails with only pending batches, rebuilding may refresh the
eligible audience even if preparation finished immediately before a crash. No
submission has started. After `prepared_at` is saved, the audience stays frozen.

Count candidates once per consumed page, excluding the lookahead row and before
splitting a page for domain warming. Invalid member data is an explicit
preparation exclusion with error logging and Sentry reporting. Every nonempty
batch stores `recipient_count` in the same transaction as its recipients.

Each batch creation operation retains its ID and intended recipient data across
database retries. After a transaction error, recovery reads through the normal
database pool and accepts a committed batch only if its metadata and exact
recipient data match. A retry insert uses the same primary key, including when
the first recovery read failed. The transaction must settle or roll back before
the recovery read; a lock-wait timeout is not evidence that the original insert
failed.

Before saving `prepared_at`, verify actual recipient rows against stored counts,
per batch and for the email, reject cross-email ownership even when swapped rows
leave those counts unchanged, and require candidates to equal prepared recipients
plus exclusions. The verified database read supplies the batches for submission.
The preflight estimate can legitimately differ from the consumed audience; a
difference of at least 1% emits a warning and a Sentry message without failing
preparation. Verification failures emit structured error logs with their reason
and counts; the event contract below distinguishes confirmed count mismatches. The email job reports terminal verification failures to Sentry
once, including during shutdown while leaving the email resumable. Failures during
safely rebuildable preparation ask the user to retry; frozen or possibly submitted batches require investigation.

An interrupted preparation without `prepared_at` is discarded on retry, using
bounded deletes of recipient rows followed by batches. Any non-pending batch
blocks cleanup. Cross-email recipient references fail verification before any
cleanup deletes in either ownership direction, including when the email has no
batches of its own. Once prepared, retries reuse the batches without selecting the
audience again. Batches created after the preparation marker fail verification.
After submission workers settle, re-read all persisted batches, verify recipient
counts again, and require every batch submitted before completing the email.

These checks account for intended recipients, not delivered copies or global
recipient uniqueness. Compensating omissions and duplicates can balance a count
equation. Provider retries after an uncertain response can cause additional
accepted submissions, and database failover can lose preparation or submission
records. This protocol does not provide exactly-once delivery.

Rolling back to code without recipient accounting can start submitting an
accounted email without establishing its preparation boundary. After rolling
forward, that email cannot safely rebuild or complete preparation automatically;
its recorded state requires reconciliation. Resending after a lost preparation
boundary can also duplicate submissions already accepted by the provider.

## Recipient accounting events

Confirmed recipient-count discrepancies emit error-level records with
`event.name = email.recipient_count.mismatch`. This event requires known, valid,
nonnegative integer `expected` and `actual` counts that differ, in either direction.
Checks that retry emit it only after those retries are exhausted.
The event is the stable selector; do not match the human-readable message or parse
`err.errorDetails`. The structured fields survive Ghost's log serialization.

```json
{
  "event": {"name": "email.recipient_count.mismatch"},
  "code": "BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED",
  "email_id": "example-email-id",
  "batch_id": "example-batch-id",
  "reason": "batch_recipient_count",
  "expected": 1000,
  "actual": 997
}
```

Every event has `code`, `email_id`, and `reason`, plus `batch_id` when the failure
identifies a batch. Counts describe the failed check:

| Reason                    | Count fields                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `batch_recipient_count`   | `expected`, `actual` recipient rows                                                                                                                                                                          |
| `preparation_totals`      | `expected`, `actual`, `count_check` (`candidate_total` or `recipient_rows`), `candidate_count`, `preparation_excluded_count`, `recipient_count` (stored batch sum), `actual_count` (rows owned by the email) |
| `batch_recovery_conflict` | `expected`, `actual` rows; only unequal valid counts emit the count-mismatch event                                                                                                                           |

Unknown or invalid counts, conflicting identities with equal counts, and ownership
or lifecycle failures use `email.verification.failed`. Both events retain the
internal code `BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED` for error handling; that
code alone does not distinguish count discrepancies from other integrity failures.
Preparation verification and cleanup check ownership in both directions before
counts and report `cross_email_recipient`. Recovery compares exact recipient
identities, including email ownership, and reports `batch_recovery_conflict`. The same failure can be observed more than
once; events describe observations, not a counter of missing recipients.

Verification errors carry `retryable: false`, and their logged error details record
`can_rebuild` and `count_mismatch`. Only the user-facing message is persisted to
`emails.error`. Automatic database retries do not retry a
terminal verification failure. These markers describe recovery within Ghost;
they do not imply that the provider accepted or delivered an email.

A legitimate preflight audience change emits `email.preparation.audience_drift`
at warning level. An explicitly excluded invalid member has its own error log;
it does not trigger this discrepancy event because the recipient is accounted
for. These records cover discrepancies Ghost can verify; they do not independently
measure Mailgun acceptance or delivery, including uncertain POST outcomes.

## Sending status

The sending status served by the Admin API's `emails/:id/status` endpoint is
derived on read. `sending-status.ts` owns the derivation from an email and its
batches with their recipient counts; `SendingStatusService` reads those rows
and `sending-status-serializers.ts` shapes the response. Submitted is terminal and the batch aggregation only
describes a send that is still in progress or has failed, so submitted emails answer with the email's stored
`email_count` as both completed and total; accounted preparation verifies that
column against the recipient rows it built. Already-started legacy sends retain
their stored intended total. That also keeps reads of long-finished
emails cheap, with no query over the batches or recipients. The endpoint is always available; Admin decides
whether to poll it while a send is active.

The phase is read from the batches: an email is submitting once any batch has
left `pending`, and preparing otherwise. Batch statuses persist across
attempts, so a retried email reports submitting with frozen progress while it
waits for its job, and `failed_during` is the same derivation applied to a
failed email.

The rough ETA measures recent recipient throughput, including work completed by
concurrent workers. It stays `null` until enough timing samples are available in
the current phase and attempt, so short sends may finish without showing an ETA.
Progress counts update independently of the estimate.

The ETA is always `null` for failed emails and `0` once no work remains in the
current phase. Batches that failed during the current attempt are not remaining
work until the email is retried, so the ETA can reach `0` while completed is
still below total. Consumers should key completion on the status, never the ETA.

Ghost does not record when a sending attempt or phase started, so the ETA uses
the email's `updated_at` as a proxy for the start of the current attempt: the
sending job saves the email when it takes its status lock and again when
preparation completes; a retry or boot resume
saves it when re-queuing the email. Batches completed before that timestamp
belong to an earlier attempt and are left out of the rate window. The proxy
only holds while nothing saves the Email model, or sets `emails.updated_at`
through a raw update, while batches are being submitted.
