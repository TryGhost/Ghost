# Email analytics

Newsletter events update recipient facts before refreshing email and member
statistics. Automation and gift events use their own outcome APIs.

## Newsletter email counter comparison

`emailAnalytics.emailCounterMode` defaults to `off`. Setting it to `compare`
also requires `emailAnalytics.batchProcessing: true`. This enables atomic
delivered, opened and failed email counters and changes email aggregation to
comparison without repair. Member statistics still use recomputation, including
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

Comparison retains the recount query load. Removing mid-cycle email recounts
is a separate rollout step after comparison has established correctness.
