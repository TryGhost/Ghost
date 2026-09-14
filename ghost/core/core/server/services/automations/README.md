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

One entry is one run, including repeat entries and deleted members. The endpoint
reads the complete history in one Tinybird query and sums those daily counts for
the total. There is no separately fetched total that can disagree with the series.
Missing days are filled with zero from the first entry through today. An automation
without entries returns a zero total and one zero bucket for today. `date_from` is
inclusive and `date_to` is exclusive.

Admin displays all-time data using the shared analytics grouping rules: daily for
spans under 91 days, weekly for 91–270 days, and monthly for longer spans. Buckets
sum entries; grouping does not limit the history to the web analytics 1,000-day
fetch window. The API has no date-filter controls or parameters.

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
available if the chart fails, and vice versa. Their responses are cached from the
first sidebar opening until navigation. Closing, reopening, focus, and reconnect
do not refresh them. Failed requests require an explicit retry.

## Availability

This spike deliberately requires `automationsTinybirdSync`. A disabled flag,
missing configuration/token, unavailable pipe, or invalid Tinybird response
produces an error, never a successful zero or a SQL fallback. SQL repository
helpers are retained for later restoration and tested separately.

Admin treats any 404 from these requests as unavailable. Other failures show an
inline retry. The `automationRunAnalytics` flag controls presentation.
See the [Tinybird storage notes](../../data/tinybird/README.md#automation-statistics)
for sorting keys, migration behavior, and query tests.
