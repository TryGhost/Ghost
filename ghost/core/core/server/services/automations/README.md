# Automations

Automations run a series of actions for a member after signup. Each automation is currently one ordered path of `wait` and `send_email` actions. It can be active or inactive.

## How a run moves forward

The member repository calls `trigger()` after signup.

The database repository creates run(s) and queues their first step(s). Ghost's boot process starts the service, which checks for ready steps. It checks again when a new run starts or a later step becomes ready. An in-memory timer handles checks while Ghost is running; the scheduler can wake Ghost after a restart.

Each check locks ready steps, then runs up to 100 at once. A `wait` action advances when its time arrives. A `send_email` action checks the member's current status and email preference before sending. Disabled automations and ineligible members stop.

## Where to look

- [`automations-api.ts`](automations-api.ts) handles reads, edits, validation, and signup triggers. Edits require one path with no branches or loops.
- [`database-automations-repository.ts`](database-automations-repository.ts) stores automations, runs, and steps.
- [`service.ts`](service.ts) starts checks and schedules future ones.
- [`poll.ts`](poll.ts) runs ready steps.
- [`welcome-email-automation-poll.ts`](welcome-email-automation-poll.ts) processes older welcome email runs.

## Performance statistics

`GET /ghost/api/admin/automations/:id/performance-stats/` requires permission to
read the selected automation. Unknown IDs return 404. The existence check does
not load actions, email contents, or email statistics.

```json
{
  "automation_performance_stats": [{
    "automation_id": "…",
    "total_run_count": 12,
    "in_progress_run_count": 4,
    "completed_run_count": 6,
    "exited_early_run_count": 2,
    "entries": [{"date": "2026-09-14", "count": 12}, {"date": "2026-09-15", "count": 0}],
    "entry_window": {
      "date_from": "2026-09-14",
      "date_to": "2026-09-16",
      "bucket": "day",
      "timezone": "UTC"
    }
  }]
}
```

One Tinybird query classifies each run using its latest recorded steps and groups
the counts by entry date. Core derives both the chart and the three status totals
from those same rows. The cards sum to the total entries count.

- **In progress:** any pending step, provided every step has a known status.
- **Completed:** all recorded steps finished.
- **Exited early:** no pending steps, and at least one failed, automation-disabled,
  member-status-changed, or member-unsubscribed step.

Runs with no recorded steps are excluded from both chart and cards. An unexpected
step status fails the request, including when another step is pending. There is no
partial-success message or fourth user-facing status category.

One entry is one run, including repeat entries and deleted members. Tinybird fills missing hours or days
with zero from the first included entry through today. Empty histories
return a zero total and zero-filled hourly buckets for today. `date_from` is inclusive and
`date_to` is exclusive. The optional `timezone` parameter accepts an IANA timezone and defaults to UTC.
It controls calendar grouping and today’s date. Admin should pass the browser
timezone, consistent with web analytics. Optional date filters are described below.

Admin uses the shared analytics grouping rules: hourly for a single day, daily under 91 days, weekly for
91–270 days, and monthly for longer spans. Grouping does not limit the history to
the web analytics 1,000-day fetch window.

The chart and cards share the request and cache, populated on first sidebar open
and kept until navigation. Closing, reopening, focus, and reconnect do not refresh
it. Failed requests, including a missing endpoint, show an inline error and retry
without guessing whether the backend is older.

## Availability

The performance endpoint requires `automationsTinybirdSync`. A disabled flag,
missing configuration/token, unavailable pipe, or invalid response produces an
error. The automation list retains its MySQL fallback for those cases; a successful
empty Tinybird response still returns zero counts rather than falling back.

The `automationRunAnalytics` flag controls presentation. See the
[Tinybird storage notes](../../data/tinybird/README.md#automation-statistics)
for sorting keys, migration behavior, and query tests.

### Performance date ranges

The performance endpoint accepts `date_from` and `date_to` as inclusive
`YYYY-MM-DD` calendar dates, plus an optional `timezone` (UTC by default).
Supply both dates or neither. Invalid dates, reversed or incomplete ranges,
and unknown timezones return 422 before querying Tinybird.

The range selects runs by entry time. Entries, totals, and current status
counts all describe those same runs; step status is not restricted to the entry
dates. Tinybird uses local midnight boundaries, including 23- and 25-hour DST
days. The response `entry_window.date_to` is exclusive. Tinybird fills every requested
day, including empty ranges and zero counts at the boundaries. Core rejects
out-of-range response buckets.

Without dates, all recorded history is included through today in the requested
timezone. The all-time query has no fixed lookback limit.

### Hourly entry history

Entries are grouped hourly when the selected calendar range is one day, or when
all-time history fits within today. Longer ranges remain daily, matching web
analytics. Hourly entry dates are UTC ISO timestamps; `entry_window.bucket`
is `hour`. Window boundaries remain local calendar dates in the requested
timezone, with an exclusive end. Today includes buckets through the current
hour; historical days include every hour, including 23/25-hour DST days.
