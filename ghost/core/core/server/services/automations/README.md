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
it. Failed requests replace the performance content with one error and retry button.

## Run list

`GET /ghost/api/admin/automations/:id/runs/` returns up to fifty runs per page:

```json
{
  "automation_runs": [{
    "id": "…",
    "created_at": "2026-09-14T12:00:00.123Z",
    "status": "completed",
    "failed": false,
    "member": {"id": "…", "name": "Alex", "email": "alex@example.com"}
  }],
  "meta": {
    "pagination": {"limit": 50, "next_cursor": "opaque-cursor"}
  }
}
```

`next_cursor` is null when no further page is available, including empty results
and a final page containing exactly fifty runs. Pass a non-null value as `cursor`
with the same filters and ordering to request the next page.

Each row is a run, including repeat entries by the same member. Default ordering is entry
time (`created_at`) descending, then run ID descending for ties. Timestamps are UTC
with millisecond precision. Status is `in_progress`, `completed`, or `exited_early`,
using the same recorded-step rules as the status counts. Runs without steps are
excluded. Unknown step statuses fail the request, even alongside pending steps
or outside the selected status/page.
`failed` is true only for an exited-early run with a latest step record marked
`failed`. Pending runs and superseded failures do not set
this flag. It is a failure detail, not an additional run status.

Tinybird selects the runs and classifies their latest step versions. Core looks up
current member details for those IDs in one query scoped to the automation. A
missing name remains null so Admin can use the email. A deleted member or missing
Core run returns `member: null`; it does not remove the Tinybird run or substitute
the historical email. A failed lookup returns an error rather than null members.

The endpoint accepts an optional `status` parameter: `in_progress`, `completed`, or
`exited_early`.
Omitting it includes all three statuses. Unsupported or
empty values return 422. Filtering uses the complete recorded step history before
ordering and limiting to fifty matching runs; pending steps take precedence as they
do in the summary counts. The optional `date_from`, `date_to`, and `timezone`
parameters use the same inclusive calendar-date contract as performance stats:
`date_from` is required when `date_to` is supplied; omitting `date_to` uses today
in the requested timezone on the first page, and omitting both dates selects all
history. When continuing with a cursor and no `date_to`, the first page's end date
is retained even across local midnight. An explicit `date_to` must still match
the cursor's end date.
Entry-date filters select runs before classification, keeping the list and summary
counts on the same cohort. There is no member search in this slice. An empty history or no matches
returns `automation_runs: []`. It requires automation read permission, returns 404
for unknown automations, and uses the same Tinybird availability checks as summaries.

The optional `order` is `created_at desc` (default) or `created_at asc`; both use
run ID in the same direction to break ties. `cursor` continues after the last
returned timestamp and ID. It is bound to the automation, status, direction, entry dates, and timezone;
malformed or mismatched cursors return 422. Core requests one extra row to decide
whether to return a next cursor and hydrates only the visible page. These are live
reads, not a snapshot: status changes can affect later pages.

In Admin, the list loads on first sidebar open and stays cached through closing
and reopening. Selecting a status card filters only the list; selecting it again
clears the status filter. Each selection fetches fresh rows while the chart and
counts stay unchanged. The Entered heading switches between newest and oldest
first. Scrolling loads additional fifty-run pages; changing status, direction,
or dates starts from the first page. A failed next page retains the loaded rows
and retries only that page. Previous rows remain visible during status and sort requests, with
a delayed loading indicator. Date changes clear previous rows and load both the
summary and list for the selected period. Loading without existing rows shows ten
skeleton rows, with a loading announcement for screen readers. The list scrolls
within the panel; on short windows the panel can also scroll so the chart and
cards never squeeze the list out of view.

Empty-state messages appear only in the list: "No entries yet" for all time,
"No entries in this period" for a date filter, and "No matching entries" for a
status filter. Empty histories and periods keep the zero chart visible; status
filters do not change it. A failed list request shows its own retry action without
replacing a successful chart or status counts.

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
Omit both dates for all time, or supply `date_from` with an optional `date_to`.
When `date_to` is omitted, the range ends today in the requested timezone.
An end date without a start date, invalid dates, reversed ranges, dates after
today in the requested timezone, and unknown timezones return 422 before querying Tinybird.

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

## Run history

`GET /ghost/api/admin/automations/:id/runs/:run_id/` returns one record in
`automation_run_history`. It reads Core's stored run and steps directly, regardless
of list pages, filters, sorting, member existence, or Tinybird availability. It
requires the same automation read permission as the list. Unknown automation IDs,
missing Core runs (including analytics-only rows), and runs belonging to another
automation return 404. Database/read failures remain errors. Clients on older
servers should treat a missing endpoint as unavailable, not as an empty history.

The response contains:

- `id`, `automation_id`, and `created_at`: the selected run's identity and entry
  time. Repeated entries by the same member remain separate runs.
- `member`: current `{id, name, email}`, or null when unavailable. No stored
  historical member name/email is exposed or used as a fallback.
- `status`: `in_progress` if any step is pending; otherwise `unclassified` for
  empty or unknown outcomes, `exited_early` if any step records an exit, and
  `completed` when every step is finished. Unlike aggregate/list queries, history
  retains unknown outcomes so clients can display incomplete records.
  `failed` is true only for an exited-early run containing a failed step. Core
  and Tinybird may differ while replication catches up; history describes the
  Core read.
- `history_status`: `empty` for no steps, `partial` for an unknown state/action,
  unavailable revision/content field, or missing terminal timestamp; `available`
  otherwise. This describes the available records, not proof of a complete graph.
- `steps`: all recorded steps ordered by `created_at` ascending, then step `id`
  ascending for ties. Each has `id`, `automation_action_revision_id`, raw `status`,
  `created_at`, `updated_at`, `ready_at`, nullable `started_at` and `finished_at`,
  and `action`. Dates are UTC ISO strings. Preserve unknown statuses in clients.
  Nullable `email_sent_at` and `email_delivered_at` expose the first recorded
  successful submission and delivery for the same step and revision. Recipient
  identity is not exposed, and multiple recipient records never duplicate steps.

Each `action` is `{id, type, data}` from the step's referenced revision. Wait data
contains nullable `wait_hours`; email data contains nullable `email_subject` and
`email_lexical`. Null means unavailable; an empty string remains empty. Content is
stored Lexical, not rendered HTML or proof of the exact personalized email sent.
An unsupported action or missing revision is `action: null`; the recorded step
remains visible. Revision lookups are scoped to the selected automation, including
when malformed historical data refers to another automation. Soft-deleted actions
retain their historical revision content.

### Limits for history cards

Run creation records entry into the automation (currently member signup). Trigger
and end nodes are not separate stored steps. The status classification above may
support an outcome label, but there is no durable run-end event or end timestamp.
Do not present `updated_at` as a completion time. A finished email action is not
proof of delivery, opening, or clicking. `email_delivered_at` establishes delivery;
opening and clicking remain outside this contract. `email_sent_at` uses the
recipient record's creation time, captured after a successful send. A finished
email step is a fallback indication of a successful send when this record is
unavailable; it does not establish delivery.

Only the next action is enqueued when a step finishes. The scheduler uses the
current graph and latest next-action revision at that moment, so a run can contain
revisions from different edits. This endpoint never substitutes the currently
edited graph, adds unrecorded future steps, or reconstructs a workflow snapshot.
`ready_at` is the stored eligibility time for an enqueued step; it may change on
retry and is not a guaranteed send time or a prediction for later steps. Stored
terminal statuses are preserved verbatim; no new exit reason is inferred.
