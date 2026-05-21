# Email Analytics Incremental Aggregation Spike

This directory contains a spike for replacing the expensive email analytics aggregate queries with incremental counter updates.

## Goal

The existing analytics job processes Mailgun events, updates timestamp columns on `email_recipients`, then recalculates aggregate stats by querying `email_recipients` for every affected email and member.

The bottleneck is the aggregate phase:

- `emails.delivered_count`
- `emails.opened_count`
- `emails.failed_count`
- `members.email_count`
- `members.email_opened_count`
- `members.email_open_rate`

The spike experiments with updating those counters at the point where an event timestamp is first written, instead of counting rows after event processing.

## Feature Flag

The spike is guarded by:

```json
{
    "emailAnalytics": {
        "incrementalAggregation": true
    }
}
```

The default is `false`, so existing behavior is preserved unless this flag is enabled.

When enabled, `EmailAnalyticsService.aggregateStats()` skips the old full aggregate queries after each processed batch.

## Event Flow

Mailgun events still follow the existing processing path:

1. The email analytics job fetches Mailgun events.
2. `EmailEventProcessor` finds the matching `email_recipients` row.
3. The recipient lookup now also selects the current timestamp state:
   - `delivered_at`
   - `opened_at`
   - `failed_at`
4. `EmailEventStorage` writes the event timestamp with a null guard.
5. If the timestamp update changed a row, the spike increments the relevant aggregate counters.

The timestamp update remains the source of truth for duplicate protection. For example:

```sql
UPDATE email_recipients
SET opened_at = ?
WHERE id = ?
AND opened_at IS NULL
```

If the update changes zero rows, the event was already processed and no aggregate counters are incremented.

## Per Event Behavior

### Delivered

When `delivered_at` transitions from `NULL`:

- increment `emails.delivered_count`
- increment `members.email_count` only if this recipient had no previous analytics timestamp

### Opened

When `opened_at` transitions from `NULL`:

- increment `emails.opened_count`
- increment `members.email_opened_count`
- recalculate `members.email_open_rate`
- increment `members.email_count` only if this recipient had no previous analytics timestamp

### Permanent Failed

When `failed_at` transitions from `NULL`:

- increment `emails.failed_count`
- increment `members.email_count` only if this recipient had no previous analytics timestamp
- continue saving/updating `email_recipient_failures`

Temporary failures still only update failure history and do not set `email_recipients.failed_at`.

## Query Shape

The spike avoids adding a separate read in `EmailEventStorage`.

Instead, the existing recipient lookup in `EmailEventProcessor` was widened to include the current timestamp columns. Batch mode uses the same cached recipient data.

This means the processing path has the same recipient lookup count as before, with a slightly wider selected row.

## Known Gaps

This is not production-ready.

The email-level counters are the most reliable part of the spike because they map directly to a timestamp transition on one `email_recipients` row.

The member-level counters need more work:

- Existing `members.email_count` semantics are based on all `email_recipients` rows for a member. The spike increments it when the first analytics timestamp is seen for a recipient, which can undercount if recipient rows exist without analytics events.
- Existing `members.email_open_rate` uses a denominator of emails where `emails.track_opens = true`. The spike currently recalculates using `members.email_count`, so the result can differ from the existing aggregate query.

Before this approach is considered production-ready, the member aggregate model should be tightened. A likely next step is to carry `emails.track_opens` through the recipient lookup and explicitly maintain the tracked-open denominator.

## Files Involved

- `email-analytics-service.js` skips full aggregation when `emailAnalytics.incrementalAggregation` is enabled.
- `../email-service/email-event-processor.js` carries recipient timestamp state from the lookup.
- `../email-service/email-event-storage.js` performs the incremental counter updates after timestamp writes.
- `../../../shared/config/defaults.json` defines the default flag value.
