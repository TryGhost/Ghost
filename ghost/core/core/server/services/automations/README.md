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
    "entries": [{"date": "2026-09-14", "count": 12}],
    "entry_window": {
      "date_from": "2026-09-14",
      "date_to": "2026-09-15",
      "bucket": "day",
      "timezone": "UTC"
    }
  }]
}
```

One Tinybird query classifies each run using its latest recorded steps and groups
the counts by entry date. Core derives both the chart and the three status totals
from those same daily rows. The cards sum to the total entries count.

- **In progress:** any pending step, provided every step has a known status.
- **Completed:** all recorded steps finished.
- **Exited early:** no pending steps, and at least one failed, automation-disabled,
  member-status-changed, or member-unsubscribed step.

Runs with no recorded steps are excluded from both chart and cards. An unexpected
step status fails the request, including when another step is pending. There is no
partial-success message or fourth user-facing status category.

One entry is one run, including repeat entries and deleted members. Missing days
are filled with zero from the first included entry through today. Empty histories
return a zero total and one zero bucket for today. `date_from` is inclusive and
`date_to` is exclusive. This endpoint has no date-filter parameters yet.

Admin uses the shared analytics grouping rules: daily under 91 days, weekly for
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
