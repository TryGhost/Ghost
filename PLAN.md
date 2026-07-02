# Automated Email Analytics Plan

## Goal

Add analytics for automated emails without putting more work through the existing newsletter email analytics job path.

Automated email analytics should support the same core event types as newsletter analytics:

- Delivered
- Opened
- Failed
- Unsubscribed
- Complained

The automation pipeline should update `automated_email_recipients`, maintain aggregate stats for automation reporting, and optionally update member-level email analytics where product requirements call for it.

## Context

The current newsletter email analytics jobs fetch Mailgun events, process them into `email_recipients`, and then recalculate aggregates from `email_recipients`.

That approach is safe, but expensive at scale. Large sites can have many millions of `email_recipients` rows, and aggregate queries over that table are one of the main reasons the existing email analytics service can fall hours behind.

Automated email analytics should not be added inline to the existing newsletter jobs. Doing that would increase the backlog in the same path that already has performance problems.

Instead, automated email analytics should run as a separate analytics pipeline with independent jobs, cursors, logging, limits, and Mailgun tag filtering.

## Proposed Shape

Use two independent pipelines that share low-level fetch orchestration where it is useful:

```text
email-analytics/
  runner/
    email-analytics-runner.js
    mailgun-event-provider.js
  newsletter/
    newsletter-analytics-pipeline.js
    newsletter-event-processor.js
    newsletter-aggregator.js
    jobs/
  automation/
    automation-analytics-pipeline.js
    automation-event-processor.js
    automation-aggregator.js
    jobs/
```

The shared runner should own mechanics that are the same for both pipelines:

- Scheduling entry point
- Fetch latest opened events first
- Fetch latest non-opened events next
- Fetch older missing events as a catch-up pass
- Maintain independent job cursors
- Enforce per-run event budgets
- Avoid overlapping runs for the same pipeline
- Log timings, event counts, and throughput

The runner should not know which tables are being updated.

Each pipeline should provide a small interface:

```ts
type EmailAnalyticsPipeline = {
    name: string;
    mailgunTags: string[];
    jobPrefix: string;
    shouldSchedule(): Promise<boolean>;
    processBatch(events: MailgunEvent[]): Promise<ProcessingResult>;
};
```

For newsletter analytics, the adapter can initially wrap the existing event processor and aggregate behavior.

For automation analytics, the adapter should target automation-specific storage and use incremental aggregation.

## Job Separation

Keep newsletter and automation cursors separate. They are different filtered Mailgun streams and should not share last-seen timestamps.

Newsletter jobs:

```text
email-analytics-newsletter-latest-opened
email-analytics-newsletter-latest-others
email-analytics-newsletter-missing
email-analytics-newsletter-scheduled
```

Automation jobs:

```text
email-analytics-automation-latest-opened
email-analytics-automation-latest-others
email-analytics-automation-missing
email-analytics-automation-scheduled
```

The automation job should fetch only automation email events via a dedicated Mailgun tag. The newsletter job should continue fetching newsletter events via the existing bulk email tag.

## Event Identity

Automation analytics needs a reliable way to map a Mailgun event back to a single `automated_email_recipients` row.

The preferred approach is to store provider identity on `automated_email_recipients`, for example:

- `provider_id`
- recipient email
- event/message metadata required by Mailgun lookup

Avoid relying on fuzzy matching by member, action, and timestamp. That will be slower, harder to make idempotent, and more likely to misattribute events.

The automation send path should persist enough provider metadata when an automated email is sent so event processing is a cheap indexed lookup.

## Automation Event Processing

Automation event processing should mirror the newsletter semantics where they apply, but write to automation-specific tables.

For each event:

1. Resolve the recipient row from provider identity.
2. Apply the event idempotently.
3. Record affected aggregate targets.
4. Increment aggregate counters for newly-applied state transitions.

Examples:

- `delivered` sets `automated_email_recipients.delivered_at` if not already set.
- `opened` sets `opened_at` if not already set.
- permanent `failed` sets `failed_at` and failure metadata if not already set.
- `complained` records complaint state and applies suppression behavior consistent with newsletter analytics.
- `unsubscribed` records unsubscribe state and applies the appropriate member/email preference behavior.

Processing should distinguish between duplicate events and first-time state transitions. Aggregates should only change when the recipient row actually transitions.

## Incremental Aggregation

Automated email analytics should use incremental aggregation from the start.

This is intentional:

- The current aggregate-from-recipient-table approach is a known performance problem for large newsletter datasets.
- Automation analytics is a net new beta feature, making it a lower-risk place to validate the incremental model.
- If the approach works well, the same pattern can be ported back to newsletter analytics later.

### Aggregate Targets

Expected aggregate targets:

- Automation action revision stats, for immutable historical reporting.
- Automation action stats, if the UI needs current action-level totals.
- Automation stats, if the UI needs whole-automation totals.
- Member stats, if automation emails should contribute to member email analytics.

Prefer aggregating against immutable IDs first, especially `automation_action_revision_id`, then derive broader reporting from there if needed.

### Counter Model

Use additive counters for event transitions:

```text
sent_count
delivered_count
opened_count
failed_count
unsubscribed_count
complained_count
```

Open rate should be derived from counters:

```text
opened_count / delivered_count
```

or from the product-approved denominator if it differs.

Do not increment counters merely because an event was received. Increment counters because a recipient row moved from "not opened" to "opened", "not delivered" to "delivered", etc.

### Idempotency

Incremental aggregation only works if event application is idempotent.

Each event handler should update recipient state conditionally. For example:

```sql
UPDATE automated_email_recipients
SET opened_at = ?
WHERE id = ?
AND opened_at IS NULL
```

Only if the update affects one row should the aggregate `opened_count` be incremented.

The same pattern applies to delivered, failed, unsubscribed, and complained states.

If the system needs to track every raw event later, add a separate event log with a provider event ID uniqueness constraint. Do not make raw event storage a prerequisite unless Mailgun duplicate behavior requires it.

### Aggregation Writes

Aggregate increments should be batched where possible.

For each processed batch, collect deltas keyed by aggregate target:

```ts
{
    automationActionRevisionId: {
        delivered: 10,
        opened: 4,
        failed: 1
    }
}
```

Then flush those deltas with additive database updates:

```sql
delivered_count = delivered_count + ?
opened_count = opened_count + ?
failed_count = failed_count + ?
```

This keeps aggregation work proportional to the number of changed recipients in the current batch, not the total number of historical recipient rows.

## Data Model Considerations

Likely additions to `automated_email_recipients`:

- `provider_id`
- `delivered_at`
- `opened_at`
- `failed_at`
- `unsubscribed_at`
- `complained_at`
- failure metadata if needed

Likely aggregate columns on automation reporting tables:

- `sent_count`
- `delivered_count`
- `opened_count`
- `failed_count`
- `unsubscribed_count`
- `complained_count`

Exact placement should follow the reporting UI:

- If reporting is per action version, store counters on `automation_action_revisions` or a dedicated stats table keyed by revision.
- If reporting must survive action edits while preserving history, prefer a dedicated stats table keyed by `automation_action_revision_id`.
- If reporting is per current action, either maintain action-level counters directly or derive from revision-level stats.

A dedicated stats table is likely cleaner than adding many mutable analytics columns directly to core automation definition tables.

## Recommended Module Boundaries

### Shared Runner

The shared runner should be a deep module. Callers configure it with a pipeline adapter, then call one method to start a fetch.

It owns:

- Cursor reads/writes
- Fetch windows
- Open-first priority
- Missing pass
- Run budgets
- Restart behavior
- Logging

It does not own:

- Recipient lookup
- Event side effects
- Aggregate updates
- Product-specific suppression or unsubscribe semantics

### Automation Pipeline

The automation pipeline owns:

- Mailgun tag selection for automation emails
- Provider event to recipient lookup
- Idempotent recipient updates
- Incremental aggregate deltas
- Automation-specific member side effects

### Newsletter Pipeline

The newsletter pipeline can initially remain mostly as-is, wrapped behind the same runner interface only where practical.

Do not block automation analytics on fully refactoring newsletter analytics. The newsletter path can be migrated toward incremental aggregation later once the automation implementation has proven the model.

## Rollout Plan

1. Add provider identity and event state columns to `automated_email_recipients`.
2. Ensure the automation send path tags Mailgun messages with a dedicated automation analytics tag.
3. Persist provider identity when automated emails are sent.
4. Add automation analytics aggregate storage.
5. Build the automation event processor with idempotent recipient updates.
6. Build batch delta accumulation and additive aggregate flushing.
7. Add the automation analytics recurring job with independent cursors.
8. Add status/logging/metrics separate from newsletter analytics.
9. Enable behind the automations beta or a dedicated private feature flag.
10. Compare lag, throughput, and DB load against the newsletter analytics pipeline.

## Validation

Unit tests:

- Event maps to the correct `automated_email_recipients` row.
- Duplicate events do not double-increment aggregates.
- Event ordering is safe, for example opened before delivered if Mailgun sends events in an unexpected order.
- Failed, complained, and unsubscribed events apply the correct side effects.
- Batch processing accumulates deltas correctly.

Integration tests:

- A batch of Mailgun events updates recipient rows and aggregate counters.
- Re-running the same batch is idempotent.
- Job cursors advance independently from newsletter cursors.
- Automation job can run while newsletter job is already behind.

Operational checks:

- Track per-pipeline lag.
- Track events processed per second.
- Track aggregate flush time.
- Track duplicate/no-op event counts.
- Alert if automation open-event lag exceeds an acceptable threshold.

## Open Questions

- What exact Mailgun tag should identify automation emails?
- Should automation emails contribute to existing member-level email open rates, or should member automation analytics be separate?
- Should aggregate counters live directly on automation tables or in dedicated stats tables?
- Are scheduled/backfill analytics needed for automation immediately, or can that ship after latest/missing event processing?
- Do we need raw event storage for auditing/debugging, or are idempotent recipient state transitions enough?

## Recommendation

Build automation analytics as a second independent pipeline using shared fetch orchestration and automation-specific processing.

Use incremental aggregation for automation analytics from the start. Treat it as the proving ground for a future newsletter analytics refactor, but keep the initial automation implementation scoped enough that it does not require rewriting the existing newsletter pipeline first.
