# Automated Email Analytics Plan

## Goal

Add analytics for automated emails without putting more work through the existing newsletter email analytics job path.

Automated email analytics should support the same core event types as newsletter analytics:

- Delivered
- Opened

Failed, complaint, and unsubscribe events are out of scope for the initial version.

The automation pipeline should update `automated_email_recipients`, maintain aggregate stats for automation reporting, and maintain member-level automation email analytics separately from newsletter email analytics.

## Context

The current newsletter email analytics jobs fetch Mailgun events, process them into `email_recipients`, and then recalculate aggregates from `email_recipients`.

That approach is safe, but expensive at scale. Large sites can have many millions of `email_recipients` rows, and aggregate queries over that table are one of the main reasons the existing email analytics service can fall hours behind.

Automated email analytics should not be added inline to the existing newsletter jobs. Doing that would increase the backlog in the same path that already has performance problems.

Instead, automated email analytics should run as a separate analytics pipeline with independent jobs, cursors, logging, limits, and Mailgun tag filtering.

See [ADR 0001: Use a separate pipeline for automated email analytics](docs/adr/0001-automated-email-analytics-pipeline.md).

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
email-analytics-latest-opened
email-analytics-latest-others
email-analytics-missing
```

Automation jobs:

```text
email-analytics-automation-latest-opened
email-analytics-automation-latest-others
email-analytics-automation-missing
```

The automation job should fetch only automation email events via the `automation-email` Mailgun tag. The newsletter job should continue fetching newsletter events via the existing bulk email tag.

For automation v1, `email-analytics-automation-latest-others` should fetch delivered events only. Keep the opened/non-opened job split so open events remain prioritized and the pipeline can later add more non-opened event types without changing the runner shape.

The existing newsletter job names do not need to be renamed. Renaming them to `email-analytics-newsletter-*` would make the naming more symmetrical, but it also requires migration/compatibility handling for existing job rows and cursors. Keep the existing names unless a concrete operational reason to rename them appears later.

Do not build scheduled/backfill automation analytics in the initial slice. The first version should cover latest event fetching and the older missing-event catch-up pass only.

Keep `email-analytics-automation-missing` in v1. It is the safety pass for Mailgun event visibility delay, restarts, and short outages. It should reuse the same idempotent automation event processor and incremental aggregation path as the latest jobs.

## Event Identity

Automation analytics needs a reliable way to map a Mailgun event back to a single `automated_email_recipients` row.

The preferred approach is to store Mailgun identity on `automated_email_recipients`, for example:

- `mailgun_message_id`
- recipient email
- event/message metadata required by Mailgun lookup

Avoid relying on fuzzy matching by member, action, and timestamp. That will be slower, harder to make idempotent, and more likely to misattribute events.

The automation send path should persist enough Mailgun metadata when an automated email is sent so event processing is a cheap indexed lookup. Use `mailgun_message_id`, not `provider_id`, to avoid confusion with generic provider identifiers already used elsewhere in email sending.

Resolve Mailgun events to `automated_email_recipients` with `mailgun_message_id` plus recipient email. Do not rely on `mailgun_message_id` alone.

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

Opened events should be processed independently of delivered events. Do not require `delivered_at` before setting `opened_at` or incrementing `opened_count`; an opened event is strong enough evidence that the email reached the recipient. The missing pass can fill in a delayed delivered event later.

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
- Member automation email stats, separate from newsletter email stats.

Store automation reporting counters on `automation_action_revisions`. This gives action-version-level reporting and avoids mixing stats from different versions of the same action after edits.

If the UI later needs current action-level or whole-automation totals, derive those from revision-level stats or add a follow-up projection deliberately.

Member aggregate counters should be separate for newsletters and automations. Do not fold automation email events into the existing newsletter member open-rate fields unless product explicitly chooses a combined metric later.

Member-level automation open rate should use the same denominator semantics as newsletter member analytics, but with automation-specific counters:

```text
automation_email_opened_count / automation_email_count
```

Follow the existing member email analytics threshold: only calculate `automation_email_open_rate` when the member has at least 5 tracked automation emails. Otherwise leave the rate null.

### Counter Model

Use additive counters for event transitions:

```text
sent_count
delivered_count
opened_count
```

`sent_count` should be incremented by the automation send path when Ghost successfully records/sends an automated email recipient and stores its `mailgun_message_id`. It should not be driven by the Mailgun analytics job.

Do not increment `sent_count` until the sent recipient row has a `mailgun_message_id`. The invariant is: a counted send is traceable to a Mailgun message. If the send path creates a pending recipient row before calling Mailgun, it should mark the row as sent and increment counters only after Mailgun returns successfully.

The automation analytics job should increment only provider-event-driven counters:

- `delivered_count`
- `opened_count`

Open rate should be derived from counters:

```text
opened_count / sent_count
```

This matches existing newsletter analytics semantics, where open rate is based on sent/email count rather than delivered count. `delivered_count` should remain a separate delivery metric.

Do not increment counters merely because an event was received. Increment counters because a recipient row moved from "not opened" to "opened", "not delivered" to "delivered", etc.

Do not add `unsubscribed_count` or `complained_count` for automated email reporting in the initial version.

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

The same pattern applies to delivered state.

Do not add raw Mailgun event storage for the initial version, and do not treat it as a likely follow-up. Recipient state plus idempotent transitions should be the source of truth for analytics processing.

### Aggregation Writes

Aggregate increments should be batched where possible.

For each processed batch, collect deltas keyed by aggregate target:

```ts
{
    automationActionRevisionId: {
        delivered: 10,
        opened: 4
    }
}
```

Then flush those deltas with additive database updates:

```sql
delivered_count = delivered_count + ?
opened_count = opened_count + ?
```

This keeps aggregation work proportional to the number of changed recipients in the current batch, not the total number of historical recipient rows.

Apply recipient state changes and aggregate increments in the same database transaction for each fetched page or small processing batch. Do not wrap the entire job run in one transaction.

The transaction should include:

- Conditional recipient updates, for example setting `opened_at` only when it is currently null.
- Delta collection based on the rows that actually transitioned.
- Additive updates to `automation_action_revisions`.
- Additive updates to member automation aggregate counters, if member counters are part of the slice.

This gives a per-batch consistency guarantee: if recipient state is committed, the matching aggregate increment is also committed. If the transaction fails, neither is committed and the next job pass can retry idempotently.

Keep transaction batches bounded to limit row lock duration, deadlock risk, rollback cost, and undo/redo log pressure. Rows modified by the transaction remain locked until commit, so avoid holding locks across a full catch-up run.

## Data Model Considerations

Likely additions to `automated_email_recipients`:

- `mailgun_message_id`
- `delivered_at`
- `opened_at`

Add an index shaped for event lookup by `mailgun_message_id` and `member_email`.

Do not add `failed_at`, failure metadata, `unsubscribed_at`, or `complained_at` to `automated_email_recipients` in the first slice.

Likely aggregate columns on `automation_action_revisions`:

- `sent_count`
- `delivered_count`
- `opened_count`

Member automation aggregate columns should be separate from existing newsletter member aggregate columns. Use:

- `automation_email_count`
- `automation_email_opened_count`
- `automation_email_open_rate`

Do not reuse `email_count`, `email_opened_count`, or `email_open_rate` for automation emails.

Only set `automation_email_open_rate` once the member has at least 5 tracked automation emails, mirroring the existing member newsletter open-rate threshold.

If analytics columns make `automation_action_revisions` too wide or too write-heavy, a dedicated stats table keyed by `automation_action_revision_id` remains a reasonable follow-up. The initial plan is to place the counters directly on `automation_action_revisions`.

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
- Mailgun event to recipient lookup
- Idempotent recipient updates
- Incremental aggregate deltas
- Automation-specific member side effects

Automation analytics should use its own event processor. Do not route automation events through the existing newsletter `EmailEventProcessor`; that processor is shaped around `email_recipients` and newsletter-specific side effects. Share fetch orchestration and normalized Mailgun event parsing where useful, but keep automation recipient mutation and aggregate delta generation separate.

### Newsletter Pipeline

The newsletter pipeline can initially remain mostly as-is, wrapped behind the same runner interface only where practical.

Do not block automation analytics on fully refactoring newsletter analytics. The newsletter path can be migrated toward incremental aggregation later once the automation implementation has proven the model.

## Rollout Plan

1. Add Mailgun identity and event state columns to `automated_email_recipients`.
2. Ensure the automation send path tags Mailgun messages with `automation-email`.
3. Persist `mailgun_message_id` when automated emails are sent.
4. Increment `sent_count` from the automation send path.
5. Add automation analytics aggregate columns to `automation_action_revisions`.
6. Build the automation event processor with idempotent recipient updates.
7. Build batch delta accumulation and additive aggregate flushing.
8. Add the automation analytics recurring job with independent cursors.
9. Add status/logging/metrics separate from newsletter analytics.
10. Enable behind the automations beta or a dedicated private feature flag.
11. Compare lag, throughput, and DB load against the newsletter analytics pipeline.

## Validation

Unit tests:

- Event maps to the correct `automated_email_recipients` row.
- Duplicate events do not double-increment aggregates.
- Event ordering is safe, for example opened before delivered if Mailgun sends events in an unexpected order.
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

## Recommendation

Build automation analytics as a second independent pipeline using shared fetch orchestration and automation-specific processing.

Use incremental aggregation for automation analytics from the start. Treat it as the proving ground for a future newsletter analytics refactor, but keep the initial automation implementation scoped enough that it does not require rewriting the existing newsletter pipeline first.
