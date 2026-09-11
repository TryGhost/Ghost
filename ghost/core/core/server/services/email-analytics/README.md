# Email analytics

Newsletter events update recipient facts before refreshing email and member
statistics. Automation and gift events use their own outcome APIs.

## Newsletter email counters

`emailAnalytics.emailCounterMode` defaults to `off`. Both opt-in modes require
`emailAnalytics.batchProcessing: true` and maintain delivered, opened and failed
email counters atomically with recipient transitions:

| Mode          | Mid-fetch email aggregation             | Final email aggregation                 |
| ------------- | --------------------------------------- | --------------------------------------- |
| `compare`     | Recount and report drift without repair | Recount and report drift without repair |
| `incremental` | Defer recounts                          | Recount all outcomes and repair drift   |

Enable `incremental` only after a comparison soak has established correctness.
This removes email recounts from intermediate aggregation. With member counter
mode off, member statistics still use recomputation, including replayed members
needed to recover an interrupted recount.

The mode is selected at analytics boot. Stop and drain existing analytics
workers before changing modes, then restart them with the same configuration.
Legacy recipient writers and recomputations do not acquire the counter lock;
running them alongside counter writers is not supported. Returning to `off`
restores legacy recomputation. A later counter startup establishes a fresh
baseline before applying increments.

There is no historical email backfill. Each worker corrects existing counters
once for each email it touches after startup. Usually those are active sends
and emails still inside the fetch trust window; scheduled recovery can also
touch an older email. That recount always includes opens, then hands off to
increments within the same transaction. Restart repeats this bounded-by-touched-
emails work, rather than remembering readiness durably or scanning history.
The correction a baseline applies is logged with `phase: "baseline"` and summed
into `email_analytics_email_counter_baseline_corrections`, so a counter left
wrong by an earlier process remains observable even though the comparison that
follows starts from corrected values. A missing email row takes no baseline and
is not remembered as initialized.

The recount issues one covering-index count per outcome, matching the legacy
recount. It runs while the email row is locked, so keep it short: recipient
inserts for the same email take a shared lock on that row through their foreign
key and wait for the counter transaction to finish. Comparison transactions
retry lock waits and deadlocks the same way event flushes do.

Counter transactions lock the email row first, then eligible recipients in
primary-key order. Both the startup recount and shadow comparison acquire the
email lock before their first consistent read. All three event types remain
independent; delivery is not a prerequisite for an open. Recipient timestamps
and exact counter increments commit together. Readiness is remembered only
after the commit is acknowledged, so retrying an uncertain commit is safe.

Comparisons always recount opens regardless of the fetch lane. Once the startup
baseline exists, comparison never overwrites counters. Drift logs include the
email ID and signed differences. The Prometheus counters
`email_analytics_email_counter_comparisons` and
`email_analytics_email_counter_drift` record comparisons and the sum of absolute
differences by event type. Repeated observations of the same drift contribute
again; a worker restart rebaselines, so monitor drift before restarting.

In incremental mode, the counter service retains pending email IDs across fetch
processors. A failed repair is logged, left queued and retried by the next final
aggregation, even one that fetched no new events; it never fails the fetch,
because the fetch's recipient facts and increments are already committed and a
failure would discard its cursor and member statistics. Every queued email is
attempted in each drain, so one contended email cannot block the others. Drains
are serialized and process a snapshot of queued emails; an email requeued during
its repair remains pending. Each repair uses the same email lock as event
increments. Repair logs and the comparison metrics carry `phase: "repair"` with
the differences observed before correction, separate from `phase: "comparison"`,
so a drift alert calibrated during the comparison soak is not fired by drift that
was corrected. Each failed repair increments
`email_analytics_email_counter_repair_failures`, so an email stuck behind
persistent contention is visible without reading logs. Comparison mode never
repairs; `reconcile` refuses to run in it.

The pending queue is in memory. A process that stops between the last flush and
the final aggregation loses it, and an email that is never touched again keeps
the counters its atomic increments produced. Those increments are exact by
construction; final repair is a safety net for drift introduced outside the
counter lock, not the source of correctness.

This email-only mode does not remove member history queries. Removing those
requires initialized member counters and scheduled member reconciliation.
Comparison retains email recount load until the incremental mode is enabled.

## Newsletter member counters

`emailAnalytics.memberCounterMode` defaults to `off`. Its `compare` and
`incremental` modes require
`batchProcessing: true`, an enabled email counter mode, and
`memberCounterPreparation: true`; an unknown value or a missing prerequisite is
logged at boot and leaves member counters off. The mode is selected at boot.
Automation and gift processing keep their existing outcome APIs.

Preparation maintains member recipient totals and the tracked-email denominator.
Event ingestion locks the email, eligible recipient rows, and then members before
either baseline establishes a snapshot. NULL member baselines use the shared
derived truth before recipient writes. Exact first-open transitions then update
member open counts and rates in the recipient transaction. Multiple recipient rows
for the same member each contribute once. Opens from untracked emails still count
in the numerator, matching existing semantics; rates remain null below five
tracked emails. An event that arrives before its batch's denominator was applied,
which only an abandoned preparation or a rollback to older send code can produce,
is stored without member increments and logged: comparison then reports the
member drift and the shared sweep repairs it, rather than one email stalling
every newsletter's ingestion.

Comparison replaces legacy member recount writes with observe-only derived truth
under the same member locks. It always includes opens, regardless of the fetch
lane. NULL baselines are skipped rather than reported as drift. Only members with
committed recipient transitions are queued for comparison; duplicate replay no
longer needs to recover a separate member write. With member mode off, replay
candidates and legacy recount recovery remain intact.

Drift logs contain member IDs and actual/expected values for differing statistics.
`email_analytics_member_counter_comparisons` counts initialized observations by
`statistic` and `phase`; `email_analytics_member_counter_drift` adds absolute
differences with the same labels. A null-versus-numeric rate mismatch adds one. Comparison does not repair counters;
the shared sweep owns repair. Comparison retains historical read cost during the
soak. After a successful soak, `incremental` keeps the atomic writes and removes
member comparison from every fetch aggregation, including final aggregation.
Email final reconciliation continues according to its own mode.

For cutover, stop and drain analytics and sending workers. Complete a fresh full
member baseline while legacy writers remain stopped; if an older partial sweep
exists, finish it and then use `--restart` for a fresh pass under this boundary.
Enable member preparation and comparison together when restarting workers. Move
to incremental mode only after the comparison and reconciliation rollout gates
are met. Email
baseline correction remains limited to touched emails and always includes opens.
After cutover, member event updates, preparation and the manual sweep share the
locking protocol and can run together.

For the configuration fallback, drain both kinds of worker and resolve any
enrolled batches still awaiting application before disabling member preparation
and member counter mode together. Legacy member recomputation then resumes.
Stop counter sweeps while legacy writers run; re-enable only after another
drained baseline. The current sending code honors persisted enrollment, but an
older send binary may not, so unresolved enrolled preparation must be reconciled
before a binary rollback. Keep this fallback until the fleet rollout and retained
aggregation paths have been decided.

## Member sweep cadence and repair observations

The shared sweep accepts a restart delay measured from its persisted completion
at `jobs.finished_at`. This delay survives process recreation. It applies only
to completed sweeps; an interrupted pass resumes immediately from its checkpoint.
The manual CLI retains immediate explicit `--restart` behavior.

Sweep observations use the same opens-inclusive truth as comparison. Initialized
members contribute comparison and drift metrics only after the counter page and
checkpoint commit. Drift logs identify repairs and include a bounded sample of
affected members. First-use initialization is excluded from drift measurements.
A failed page reports no successful repair and leaves the checkpoint unchanged.

The jobs service always registers a dedicated member repair queue with
concurrency one; only member incremental mode schedules work on it. The
recurring job runs independently of event fetching every five minutes, with
randomized seconds and minute offsets. Analytics and its background-jobs flag
must both be enabled for scheduling. The queue serializes deliveries, so ticks
that arrive while a page is running would drain the moment it ends; the handler
skips a tick while a page is running, any tick sooner than four and a half
minutes after the previous page started, and any tick within a minute of its
end, so pages never run back to back. The jobs shutdown lifecycle waits for an
in-flight page up to the server shutdown timeout; a page that outlives it is
rolled back by the connection teardown and resumes from the persisted
checkpoint. Failed pages
surface through job failure reporting and resume on a later tick. The registered
handler is inert in other modes, including older queued deliveries. Scheduling is
per process: every Ghost process with background jobs enabled ticks on its own
schedule, and the checkpoint row lock serializes their pages, so the cadence
below describes a single process.

`emailAnalytics.memberReconciliationBatchSize` defaults to 5,000 and accepts
integers from 1 to 5,000. Each invocation runs one page. Completed sweeps pause
for `emailAnalytics.memberReconciliationPauseHours` (default six) before restarting.
A zero pause requests continuous passes; unfinished passes do not wait for this
completion pause. An unusable value is logged at boot and leaves scheduled repair
off rather than stopping the site. Change these settings at boot and tune pages
from observed transaction time and lock contention. When background jobs are
disabled, periodic repair does not run; operators must arrange the shared manual
sweep.

For 800,000 members with the defaults, scheduler arithmetic suggests roughly
20 hours between full passes, including the completion pause. A measured maximum
24-hour reconciliation age is the proposed rollout target, not a production
guarantee: failures, downtime, page duration and contention can extend it. Reduce
page size if locks interfere with ingestion, then reassess pause and cadence
against that target before enabling incremental mode.

The structured `email-analytics.member-reconciliation` log reports the persisted
checkpoint's cumulative member count, last ID and completion state after each
page; during the completion pause the handler reports nothing, although the
jobs service still logs each delivery. Use the checkpoint row's
`finished_at` to measure successful full-pass age
and its `updated_at` to track progress. The jobs service records invocation timing
and failures; member drift observations identify corrections after commit.

Legacy sequential/batched recomputation and compare mode remain supported and
covered. Their eventual retirement, fleet/Core defaults and rollback window remain
explicit pre-merge decisions for this reconciliation PR. No scheduling-lane priority
or production flag changes are included here.
