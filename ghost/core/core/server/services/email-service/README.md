# Email service

Renders newsletter emails, splits them into recipient batches, and submits the
batches to the configured email provider. Domain terms live in
[CONTEXT.md](CONTEXT.md).

## Recipient preparation

New emails record `preflight_email_count` when they are created. Its presence,
including zero, selects recipient accounting. Emails with null
`preflight_email_count` are opted in before rebuilding if every existing batch
is pending (or no batches exist). Their stored `email_count` supplies the
preflight estimate. This opt-in is saved before any preparation writes, so
interrupted conversions use the same rebuild protocol on retry.

A null `preflight_email_count` identifies an email created before recipient
accounting was introduced that has not opted in. If any of its batches is in
`submitting`, `submitted`, or `failed`, the email reuses its entire existing
batch set without selecting the audience again or inventing accounting metadata.
For these emails, all batch creation finishes before any batch is submitted to
the email provider. Completion requires every batch in that reused set to submit
successfully, without the new persisted recipient-count verification; they do
not need a separate preparation algorithm.

For emails with null `preflight_email_count` and only pending batches,
rebuilding may refresh the eligible audience even if preparation finished
immediately before a crash. No submission has started. After `prepared_at` is
saved, the audience stays frozen.

Select member IDs for every segment upfront in one `UNION ALL` statement, using
the existing audience filters and the email's member-ID cutoff. The statement
gives all segments the same database view without holding a transaction open
across selection queries or batch writes. Failed selections retry as a whole
within the existing database budget, before any batches are written. Only a
complete successful result contributes candidates.

Order the result by segment and descending member ID, collapse adjacent duplicate
IDs within each segment, and count candidates before dividing them into pages.
Choose each page's domain and cap its size at the remaining warming capacity
before dispatching it; after that capacity is exhausted, use full-size fallback
pages. Prepare the selected segments sequentially. All segments' candidate IDs
remain in memory until preparation finishes; the combined ordering can require a
database sort over the full audience.

`bulkEmail:batchCreationConcurrency` defaults to 2 and directly bounds active
pages per email, independently of database pool settings. Explicit per-site
overrides can raise it after measuring database load. The value must be a positive
integer JSON number; invalid configuration stops boot with a configuration error.
Validation happens in the `BatchSendingService` constructor. SQLite uses one database
connection, so raising the worker limit does not add database concurrency there.
A worker owns its page
through member lookup, writes, and retries. Each page creates at most one batch
in one transaction. Warming allocation follows selected candidate order,
including exclusions, rather than transaction completion order. Each nonempty
batch stores `recipient_count` atomically with its recipients.

Member lookup happens outside the write transaction. Each page loads its selected
IDs in one query and restores candidate order before preparation. Required member data
missing from an existing record is an explicit exclusion with error logging and
Sentry reporting. A selected member no longer found is a `member_not_found`
exclusion logged at information level. Database failures are not exclusions.

Selection fixes eligibility and segment assignment for the whole email:
unsubscribing, disabling email, or changing audience attributes after selection
does not remove a candidate whose data remains valid. Newly eligible members are
not added. Earlier paged preparation rechecked eligibility per page; submission
validation remains unchanged. Retries of incomplete preparation select a fresh
audience. The member-ID cutoff excludes newer members across those attempts,
but does not freeze existing members' attributes between attempts.

Each batch creation operation retains its ID and intended recipient data across
database retries of that operation. Restarting incomplete preparation before
`prepared_at` is saved reselects the audience, which may have changed. Once
`prepared_at` is persisted, subsequent attempts reuse the frozen recipient set.

After a transaction error, recovery reads through the normal
database pool and accepts a committed batch only if its metadata and exact
recipient data match. While retries remain allowed, a retry insert uses the same
primary key, including after a failed recovery read. The transaction must settle or roll back before
the recovery read; a lock-wait timeout is not evidence that the original insert
failed.

Workers stop claiming pages when shutdown or a terminal preparation failure
occurs. A per-segment abort signal wakes preparation retry backoffs and stops
further tries. It does not interrupt an in-flight transaction or recovery read,
but prevents retrying a failed recovery read. A batch that committed without an
acknowledgement can therefore remain unverified and pending until the next
attempt's cleanup. All workers drain before verification or returning a failure.
If shutdown starts after all pages finish, complete verification and save
`prepared_at` using the shutdown retry budget, preserving the finished work.
Submission
does not use this signal and retains its retry policy. Failed partial preparation
is kept until the next attempt performs bounded cleanup; cleanup time is separate
from the cost of rebuilding and can dominate a large retry.

Before saving `prepared_at`, verify actual recipient rows against stored counts,
per batch and for the email, reject cross-email ownership even when swapped rows
leave those counts unchanged, and require candidates to equal prepared recipients
plus exclusions. The verified database read supplies the batches for submission.
The preflight estimate can legitimately differ from the consumed audience; a
difference of at least 1% emits a warning and a Sentry message without failing
preparation. Verification failures emit structured error logs with their reason
and counts; the event contract below distinguishes confirmed count mismatches. The email job reports terminal verification failures to Sentry
once, including during shutdown while leaving the email resumable. Failures during
safely rebuildable preparation ask the user to retry; frozen or possibly submitted
batches require investigation. When shutdown leaves batches unstarted, check the
persisted batch outcomes for integrity failures before exiting, without rescanning
recipient rows.

An interrupted preparation without `prepared_at` is discarded on retry, using
bounded deletes of recipient rows followed by batches. Any non-pending batch
blocks cleanup. Cross-email recipient references fail verification before any
cleanup deletes in either ownership direction, including when the email has no
batches of its own. Once prepared, retries reuse the batches without selecting the
audience again. The email job lock and frozen-preparation path prevent new batch
creation after preparation. As an additional check, batches with `created_at`
later than `prepared_at` fail verification. Both timestamps have second precision,
so this check cannot distinguish writes within the same second and does not
independently establish frozen batch membership.
After submission workers settle, re-read all persisted batches, verify recipient
counts again, and require every batch submitted before completing the email.
Frozen preparation also verifies that `email_count` equals the prepared recipient
total so progress and statistics cannot silently retain an incorrect total. Once
every batch has verified submission counts, the stored total may instead equal
the submitted count written at completion, including zero when all recipients
were excluded. Partially sent emails and emails with unavailable submission
counts must retain the prepared total.

These checks account for intended recipients, not delivered copies or global
recipient uniqueness. Compensating omissions and duplicates can balance a count
equation. Provider retries after an uncertain response can cause additional
accepted submissions, and database failover can lose preparation or submission
records. This protocol does not provide exactly-once delivery.

Persisted batch-list order is unspecified and may differ from audience order.
Delivery-time spreading follows that list; individual recipients' time slots may
change without changing warming allocation. A draining process and a new process
resuming the same email can overlap: batch status locks prevent concurrent claims
of the same batch, but do not prevent duplicate batch sets with different IDs.
Verification can detect conflicts; per-process draining is not a cross-process
ownership fence.

Rolling back to code without recipient accounting can start submitting an
accounted email without establishing its preparation boundary. After rolling
forward, that email cannot safely rebuild or complete preparation automatically;
its recorded state requires reconciliation. Resending after a lost preparation
boundary can also duplicate submissions already accepted by the provider.

## Recipient submission

Accounted batches verify their recipient read against `recipient_count` before
constructing the provider payload. Existing invalid-address validation records
explicit exclusions with error logging and Sentry reporting. A final payload
whose address keys collapse multiple recipients fails before the provider call.
Provider retries reuse the same intended recipients and exclusion counts.

Persist `submitted_count` and `submission_excluded_count` as absolute values with
the batch's submitted status and message ID. If every recipient is excluded,
complete the batch with zero submitted and no message ID, without calling the
provider. A corrupt zero expected count fails before reading recipients.

After workers settle, verify every persisted batch, including batches omitted
from the dispatched list. Expected recipients must equal submitted recipients
plus exclusions, and candidates must equal submitted recipients plus both kinds
of exclusions. Complete the email with the verified submitted total as
`email_count`. Integrity errors retain their distinct code through persisted
batch errors and the final verification, so the Admin banner explains that sending stopped without recommending another
identical retry.

Emails spanning the preparation-only deployment may contain submitted batches
whose submission counts are null. Verify their rows and statuses, preserve the
intended `email_count`, and emit an unverified-submission-counts event. Do not
infer or backfill provider counts for those batches.

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

| Reason                      | Count fields                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `batch_recipient_count`     | `expected`, `actual` recipient rows                                                                                                                                                                          |
| `email_recipient_count`     | `expected` prepared or verified submitted total, `actual` persisted `email_count`                                                                                                                            |
| `preparation_totals`        | `expected`, `actual`, `count_check` (`candidate_total` or `recipient_rows`), `candidate_count`, `preparation_excluded_count`, `recipient_count` (stored batch sum), `actual_count` (rows owned by the email) |
| `batch_recovery_conflict`   | `expected`, `actual` rows; only unequal valid counts emit the count-mismatch event                                                                                                                           |
| `batch_recipient_read`      | `expected`, `actual` rows after read retries are exhausted                                                                                                                                                   |
| `message_recipient_counts`  | `expected` loaded members, `actual` message recipients plus exclusions, `recipient_count`, `submission_excluded_count`                                                                                       |
| `provider_payload_count`    | `expected`, `actual` unique provider address keys                                                                                                                                                            |
| `batch_submission_counts`   | `expected` stored intent, `actual` submitted plus excluded, `recipient_count`, `submitted_count`, `submission_excluded_count`                                                                                |
| `batch_verification_failed` | `expected`, `actual`, optional `count_check` from the original failure; `batch_error` contains its full details                                                                                              |

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

The shared verification error factory emits the event immediately, including
payload failures before the provider POST. A failed batch-status write cannot
suppress that observation. If saving the batch failure also fails, the original
terminal verification error still reaches the email job and Sentry, including
during shutdown. Re-reading a persisted verification failure emits
`batch_verification_failed` with the original details in `batch_error`; it is
another observation of the same problem, not additional lost recipients.

Successful accounted batches emit `email.batch.submitted` at info level with
`email_id`, `batch_id`, `recipient_count`, `submitted_count`,
`submission_excluded_count`, and `mailgun_message_id` for provider correlation.
An all-excluded batch has zero submitted and a null message ID. Final verified
emails emit `email.submission.verified` with candidate, submitted, and exclusion
totals. Preparation-era batches with unknown submission counts instead emit
`email.submission.unverified` at info level, naming `unverified_batch_ids`;
unknown historical counts alone are not a detected discrepancy.

A legitimate preflight audience change emits `email.preparation.audience_drift`
at warning level. Members with invalid required data emit
`email.preparation.excluded` or `email.submission.excluded` at error level and
are reported to Sentry. A selected member no longer found instead emits
`email.preparation.excluded` with reason `member_not_found` at info level, without
Sentry reporting. Both paths include `email_id`, `member_id`, `reason`, and the
preparation attempt or submission batch ID. Exclusions do not
trigger the discrepancy event because the recipient is accounted for. These records cover discrepancies Ghost can verify; they do not independently
measure Mailgun acceptance or delivery, including uncertain POST outcomes.

## Benchmarking preparation

From `ghost/core`, run the synthetic MySQL benchmark. Credentials default to
`root` / `root`, matching `testing-mysql`; override them with
`database__connection__user` and `database__connection__password` for a different
local database (an explicitly empty password is preserved):

```sh
NODE_OPTIONS=--conditions=source node --expose-gc scripts/benchmark-recipient-preparation.js 500000 2
```

The arguments are member count and preparation concurrency. The harness creates
and drops its own database on `127.0.0.1:3306`, uses Ghost's schema and preparation
service with a pool of five, and never submits email. Members are split evenly
between free and paid segments to exercise the combined audience selection.
It measures the full audience, discard and rebuild after a complete pending attempt, and a label
audience containing every fifth member. JSON output includes database settings,
query counts, elapsed times, sweep and discard durations, and sampled memory.
Member lookups also report query count, rows transferred,
and summed query duration. These query durations overlap under concurrency and
are not the phase's wall-clock duration. Compare both the full and label-filtered
audiences when measuring preparation.

Repeat at 500,000 and 1,000,000 members with concurrency 1, 2, and 4 to compare
settings. RSS and heap samples every 10 ms may miss peaks during synchronous
driver work; retained heap is measured after preparation and GC, when the sweep
array has been released. A fresh local database does not model a production
recipient table's history or concurrent site traffic. Production capacity and
contention require separate measurements.

## Sending status

The sending status served by the Admin API's `emails/:id/status` endpoint is
derived on read. `sending-status.ts` owns the derivation from an email and its
batches with their recipient counts; `SendingStatusService` reads those rows
and `sending-status-serializers.ts` shapes the response. Submitted is terminal and the batch aggregation only
describes a send that is still in progress or has failed, so submitted emails answer with the email's stored
`email_count` as both completed and total. Fully accounted sends persist the
verified submission total. Emails with null `preflight_email_count`, and emails
with batches submitted before submission counts were recorded, retain the
intended total. That also keeps reads of long-finished
emails cheap, with no query over the batches or recipients. The endpoint is always available; Admin decides
whether to poll it while a send is active.

Active accounted sends read the small batch table: preparation progress sums
`recipient_count`; submission progress sums submitted and excluded counts for
submitted batches. Unknown preparation-era submission counts fall back to the
batch's expected count at read time only. The submission total remains the sum
of expected batch counts, so exclusions cannot leave progress short. Failed-send
UI describes this as processed recipients, because completed work includes
exclusions and cannot establish how many emails were sent. Emails with
null `preflight_email_count` retain their indexed recipient-count queries. Actual recipient verification
runs at lifecycle boundaries, not on the polling path.

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

## Member counter reconciliation

`NewsletterMemberCounters` provides one bounded sweep for member counter
initialization, repair and rollback re-baselining. Its checkpoint lives in the
`email-analytics-member-reconciliation` jobs row. A page locks members in primary-key
order before reading recipient facts, then writes all four member statistics and
the checkpoint in one transaction. An interrupted or uncertain commit resumes
from persisted state. NULL `email_tracked_count` means uninitialized; zero is a
valid initialized denominator. Open rates remain null below five tracked emails.

Historical batches have `member_counters_enabled = false` and are never enrolled
by an absent application marker. The derived baseline includes their recipients,
except discardable incomplete preparation under the recipient-accounting protocol.
An accounted email without frozen preparation but with non-pending or already
counter-applied batches stops the sweep for explicit preparation reconciliation;
its recipient facts must not be silently removed during rollback re-baselining.
Opted-in batches contribute only after `member_counters_applied_at` is persisted.
Preparation increments and that marker must commit together under the same member
locks, after the preparation boundary freezes the recipient membership. This keeps
pending preparation recipients out of the baseline that precedes their increments.

Run the manual sweep from a bootstrapped source checkout configured for the target
blog database. The blog must already have its jobs table initialized. This operator
script uses source-checkout dependencies and is not included in the published release:

```sh
NODE_ENV=production node --import tsx scripts/reconcile-member-email-counters.ts --limit 5000 --pages 1
```

The script uses the configured database and prints the durable checkpoint after
each page. Repeat to resume; `--restart` explicitly begins another completed
sweep. A sweep fixes its upper member-ID boundary when it starts. New members are
handled by preparation or a later sweep. The script neither schedules work nor
enables incremental ingestion.

Drain legacy analytics and preparation writers before manually initializing or
re-baselining. The sweep's live concurrency guarantee requires every counter
writer to acquire member locks before establishing its recipient snapshot.
Legacy recounts and recipient creation do not follow this protocol. The later
incremental-ingestion integration must establish that boundary before allowing
periodic repair alongside live ingestion. MySQL pages explicitly use repeatable
read; multiple metadata and recipient reads share the same snapshot.
