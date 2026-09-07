# Email service

Renders newsletter emails, splits them into recipient batches, and submits the
batches to the configured email provider. Domain terms live in
[CONTEXT.md](CONTEXT.md).

## Recipient preparation

New emails record `preflight_email_count` when they are created. Its presence,
including zero, selects recipient accounting; historical emails with null keep
their existing preparation and retry behavior.

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
preparation. Verification failures emit `email.verification.failed` with their
reason and counts. The email job reports terminal verification failures to Sentry
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

## Sending status

The sending status served by the Admin API's `emails/:id/status` endpoint is
derived on read. `sending-status.ts` owns the derivation from an email and its
batches with their recipient counts; `SendingStatusService` reads those rows
and `sending-status-serializers.ts` shapes the response. Submitted is terminal and the batch aggregation only
describes a send that is still in progress or has failed, so submitted emails answer with the email's stored
`email_count` as both completed and total; accounted preparation verifies that
column against the recipient rows it built, while legacy preparation reconciles
it. That also keeps reads of long-finished
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
accounted preparation completes (for legacy emails, when the recipient count
changed); a retry or boot resume
saves it when re-queuing the email. Batches completed before that timestamp
belong to an earlier attempt and are left out of the rate window. The proxy
only holds while nothing saves the Email model, or sets `emails.updated_at`
through a raw update, while batches are being submitted.
