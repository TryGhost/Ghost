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
This removes email recounts from intermediate aggregation. Member statistics still use recomputation, including
replayed members needed to recover an interrupted recount.

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
processors. A failed final repair is retried by the next final aggregation,
even when it fetched no new events. Drains are serialized and process a snapshot
of queued emails. Only successful repairs clear entries; an email requeued
during repair remains pending. Each repair uses the same email lock as event
increments. Repair logs carry `phase: "repair"` with the differences observed
before correction; comparison mode continues to report drift without repair.

This email-only mode does not remove member history queries. Removing those
requires initialized member counters and scheduled member reconciliation.
Comparison retains email recount load until the incremental mode is enabled.
