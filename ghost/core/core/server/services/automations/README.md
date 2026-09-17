# Automations

Automations run a series of actions for a member after signup. Each automation is currently one ordered path of `wait` and `send_email` actions. It can be active or inactive.

## How a run moves forward

The member repository calls `trigger()` after signup.

The database repository creates run(s) and queues their first step. Ghost's boot process starts the service, which checks for ready steps. It checks again when a new run starts or a later step becomes ready. An in-memory timer handles checks while Ghost is running; the scheduler can wake Ghost after a restart.

Each check locks ready steps, then runs up to 100 at once. A `wait` action advances when its time arrives. A `send_email` action checks the member's current status and email preference before sending. Disabled automations and ineligible members stop.

## Where to look

- [`automations-api.ts`](automations-api.ts) handles reads, edits, validation, and signup triggers. Edits require one path with no branches or loops.
- [`database-automations-repository.ts`](database-automations-repository.ts) stores automations, runs, and steps.
- [`service.ts`](service.ts) starts checks and schedules future ones.
- [`poll.ts`](poll.ts) runs ready steps.
- [`welcome-email-automation-poll.ts`](welcome-email-automation-poll.ts) processes older welcome email runs.

## Performance statistics

The entry and status endpoints require permission to read the selected automation.
Unknown automation IDs return 404. Both endpoints check existence without loading
its actions, email contents, or email statistics.

## Entries

`GET /ghost/api/admin/automations/:id/entry-stats/` returns:

```json
{
  "automation_entry_stats": [{
    "automation_id": "…",
    "total_run_count": 12,
    "entries": [{"date": "2026-09-14", "count": 12}],
    "window": {
      "date_from": "2026-09-14",
      "date_to": "2026-09-15",
      "bucket": "day",
      "timezone": "UTC"
    }
  }]
}
```

One entry is one run, including repeat entries and deleted members. Inclusion uses
`automation_runs.created_at`, not the member's signup date or the run's update time.
The endpoint reads daily counts in one Tinybird query and sums them for the total,
so the total and series always cover the same entries.

### Date ranges

`?date_from=2024-03-10&date_to=2024-03-10&timezone=America%2FNew_York` selects one
calendar day in New York. Request dates use `YYYY-MM-DD` and **both are inclusive**,
matching existing analytics requests. Supply both dates or neither. `timezone` is
optional and defaults to UTC; recognized timezone names are normalized before being
sent to Tinybird. Invalid dates, incomplete/reversed ranges, or unknown timezones
return 422 before an analytics request is made.

Tinybird filters from local midnight on the first day up to, but excluding, local
midnight after the last day. These are calendar boundaries, so daylight-saving days
can contain 23 or 25 hours. The response `window.date_from` is inclusive and
`window.date_to` is exclusive, with the timezone and daily bucket size explicit.
In the example above the window is `2024-03-10` through `2024-03-11`, and the UTC
instants are `2024-03-10T05:00:00Z` through `2024-03-11T04:00:00Z`.

Missing days throughout the selected range are filled with zero, including days
before the first or after the last entry. A successful empty range returns a zero
total and a zero bucket for every selected day. Fetch failures remain errors; a
response containing days outside the requested window is rejected.

With neither date supplied, the query reads the complete history. Missing days are
filled from the first entry through today in the requested timezone. An automation
without entries returns a zero total and one zero bucket for today. All-time history
is not capped at the web analytics 1,000-day fetch window.

Daily buckets remain the API contract. Admin's existing chart groups long histories
by summing daily buckets: daily below 91 days, weekly for 91–270 days, and monthly
for longer spans. Admin offers All time (the default), Last 7 days, Last 30 days,
and Last 90 days, including today in the browser timezone, as in web analytics.
The date selector controls only Total entries and its chart. Requests are keyed
by automation, dates, and timezone; response windows are checked before display.

## Status counts

`GET /ghost/api/admin/automations/:id/status-stats/` returns:

```json
{
  "automation_status_stats": [{
    "automation_id": "…",
    "in_progress_run_count": 4,
    "completed_run_count": 6,
    "exited_early_run_count": 1,
    "unclassified_run_count": 1
  }]
}
```

All counts are all-time, with each run counted once using its latest recorded step
outcomes:

- **In progress:** any pending step; takes precedence over every other outcome.
- **Completed:** at least one step, all finished.
- **Exited early:** no pending or unknown steps, and at least one failed,
  automation-disabled, member-status-changed, or member-unsubscribed step.
- **Unclassified:** missing or unknown history without pending steps. Admin
  explains this coverage gap below the three cards.

The chart and status endpoints are independent requests; the cards can remain
available if the chart fails, and vice versa. Both fetch on first sidebar opening.
Each entry date range is fetched once per page visit. Returning to a visited range
reuses its result, including any error until an explicit retry. Changing or clearing
the range does not change or refetch any status counts. The status endpoint has no
date-range parameters. Closing, reopening, focus, and reconnect do not refresh
either request. Navigation clears the entry-range cache and starts a new page visit.

## Run list

`GET /ghost/api/admin/automations/:id/runs/` returns the latest ten runs:

```json
{
  "automation_runs": [{
    "id": "…",
    "created_at": "2026-09-14T12:00:00.123Z",
    "status": "completed",
    "failed": false,
    "member": {"id": "…", "name": "Alex", "email": "alex@example.com"}
  }]
}
```

Each row is a run, including repeat entries by the same member. Ordering is entry
time (`created_at`) descending, then run ID descending for ties. Timestamps are UTC
with millisecond precision. Status is `in_progress`, `completed`, `exited_early`,
or `unclassified`, using the same recorded-step rules as the status counts.
`failed` is true only for an exited-early run with a latest step record marked
`failed`. Pending runs, unclassified history, and superseded failures do not set
this flag. It is a failure detail, not an additional run status.

Tinybird selects the runs and classifies their latest step versions. Core looks up
current member details for those IDs in one query scoped to the automation. A
missing name remains null so Admin can use the email. A deleted member or missing
Core run returns `member: null`; it does not remove the Tinybird run or substitute
the historical email. A failed lookup returns an error rather than null members.

The endpoint accepts an optional `status` parameter: `in_progress`, `completed`, or
`exited_early`.
Omitting it includes every status, including unclassified history. Unsupported or
empty values return 422. Filtering uses the complete recorded step history before
ordering and limiting to ten matching runs; pending steps take precedence as they
do in the summary counts. The list stays all-time, independent of entry dates and
summary counts, with no search or pagination controls. An empty history or no matches
returns `automation_runs: []`. It requires automation read permission, returns 404
for unknown automations, and uses the same Tinybird availability checks as summaries.

Admin displays the Member, Entered, and Status columns below the cards. It fetches
on first sidebar opening and retains the result or error until navigation, with an
explicit retry for errors. Closing the sidebar, changing entry dates, focus, and
reconnect do not refetch the list. Leaving the page also discards pending requests
so a return visit starts fresh. Entry times use Admin's standard browser-local
timestamp formatting, with the full timestamp available on hover. Rows and column
headings are display-only in this slice. Failed exits retain the Exited early icon
with a red corner dot and an accessible failure label.

## Availability

This spike deliberately requires `automationsTinybirdSync`. A disabled flag,
missing configuration/token, unavailable pipe, or invalid Tinybird response
produces an error, never a successful zero or a SQL fallback. SQL repository
helpers are retained for later restoration and tested separately.

Admin treats any 404 from these requests as unavailable. Other failures show an
inline retry. The `automationRunAnalytics` flag controls presentation.
See the [Tinybird storage notes](../../data/tinybird/README.md#automation-statistics)
for sorting keys, migration behavior, and query tests.
