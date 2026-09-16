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

The optional `search` parameter scopes counts to every matching current member
run across all statuses. Counts remain pending until their independent
continuation reaches exhaustion; partial totals are never presented as complete.

Counts currently retain the all-time date scope, with each run counted once using
its latest recorded step outcomes:

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

`GET /ghost/api/admin/automations/:id/runs/` returns one page of up to fifty runs,
newest first by default:

```json
{
  "automation_runs": [{
    "id": "…",
    "created_at": "2026-09-14T12:00:00.123Z",
    "status": "completed",
    "failed": false,
    "member": {"id": "…", "name": "Alex", "email": "alex@example.com"}
  }],
  "meta": {"pagination": {"limit": 50, "next_cursor": "eyJ…"}}
}
```

Each row is a run, including repeat entries by the same member. `order` accepts
`created_at desc` (default) or `created_at asc`; anything else returns 422.
Entry-time ties use run ID in the same direction. Core validates the returned
order. Member and Status sorting are not supported.
Timestamps are UTC with millisecond precision. Status is `in_progress`,
`completed`, `exited_early`, or `unclassified`, using the same recorded-step rules
as the status counts.
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
ordering and limiting to fifty matching runs, so ascending order returns the
oldest matches first; pending steps take precedence as they do in the summary counts.
The list stays all-time, independent of entry dates and summary counts. An empty history or no matches returns `automation_runs: []`. It requires
automation read permission, returns 404 for unknown automations, and uses the same
Tinybird availability checks as summaries.

### Cursor pagination

The optional `search` parameter matches literal text within current member names
or emails after trimming outer whitespace. Results use search-scoped cursors;
bounded scanning responses can require continuation before finding more matches.
Blank search preserves the non-search behavior below.

`meta.pagination.next_cursor` is an opaque keyset cursor, or `null` on the final
page. Pass it back with the same `status` and `order`. Page size is fixed at fifty;
Core fetches one extra row to detect continuation. Cursors carry automation,
filter, entry-time direction, entry time, and run ID. Invalid or mismatched
cursors return 422 before Tinybird.
Tokens are unsigned: changing a boundary cannot bypass site/automation authorization.

Pages are live reads, not a snapshot. Entry-time positions are immutable, so a
status change can add or remove a later filtered match but cannot repeat a run.
With newest first, new runs before the cursor require a fresh list; with oldest
first, later entries can appear at the end. Admin keeps the first observed row
for each run ID. Start a fresh list to see current membership; Core validates
each page against its immutable entry-time position.

### Live pagination regression tests

`test/e2e-api/admin/automation-runs-live.test.js` checks entry-time pagination with status filters while runs are inserted or change status between requests. It calls
real Core and Tinybird; the ordinary API suite still covers validation and errors
with controlled responses. The live file is skipped unless explicitly configured.

Build these Tinybird files in an isolated, disposable Tinybird Local container.
Set `AUTOMATION_TINYBIRD_TEST_CONFIG` to a private JSON file containing its
`endpoint` and build-workspace `token`, then run from `ghost/core`:

```sh
AUTOMATION_TINYBIRD_TEST_CONFIG=/path/to/private-local-config.json \
database__connection__database=ghost_automation_runs_disposable \
pnpm test:single test/e2e-api/admin/automation-runs-live.test.js
```

Verify that the database base and Tinybird container are disposable first. The
fixture uses fresh site UUIDs and appends run events; it never truncates Tinybird.
The endpoint must be HTTP on `127.0.0.1`, outside the shared port 7181. Remove the
owned resources and credential file afterward. Tinybird CLI builds on this
feature branch use a Git-named local workspace; obtain that workspace's token,
not the default empty workspace's token.

Admin displays the Member, Entered, and Status columns below the cards. Selecting a
card filters the list; selecting it again clears the filter, and another card switches
it. Cards expose their selection to assistive technology and support keyboard use,
including when counts are zero. Entry dates and status selection are independent;
selecting a status does not change the chart or counts.

The Entered heading toggles ascending/descending and exposes the active order
through `aria-sort`. Member and Status headings are plain labels. Sorting refreshes only the list;
outside member search, status selection, switching, or clearing refreshes
all-status counts and the matching list together. During member search, cards
change only the list; counts retain the full search scope. Both retain their current results across sidebar
close/reopen, entry-date changes, focus, and reconnect. Navigation starts fresh.
Unsupported Entered sorting shows an unavailable state.

The chart, cards, and list share one scroll region. Compact status controls stay
available in the header after the summary scrolls away. The list uses Admin's
shared infinite list. The scrollbar spans loaded rows plus one loading row,
not the full count: jumping to the bottom can load the next page without draining
thousands of pages. Scrolling onward loads further pages without refreshing counts
or the chart. A failed later page preserves loaded rows and offers an explicit
retry. Query changes reset pagination and discard inactive responses. Older Core
versions without cursor metadata show only the first page.

History selection is keyed by run ID independently of the loaded rows. Sorting,
filtering, virtualization, or closing Performance leaves history open; the
canvas's Back to editing control restores the preserved draft. Entry timestamps
use Admin's browser-local formatting with full timestamps on hover. Failed exits
retain the Exited early icon with a red dot and accessible failure label.

Member search and counts continue independently, with explicit retries and
resumable pauses for long scans.

## Availability

This spike deliberately requires `automationsTinybirdSync`. A disabled flag,
missing configuration/token, unavailable pipe, or invalid Tinybird response
produces an error, never a successful zero or a SQL fallback. SQL repository
helpers are retained for later restoration and tested separately.

Admin treats any 404 from these requests as unavailable. Other failures show an
inline retry. The `automationRunAnalytics` flag controls presentation.
See the [Tinybird storage notes](../../data/tinybird/README.md#automation-statistics)
for sorting keys, migration behavior, and query tests.

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
- `status` and `failed`: the same pending/completed/exited/unclassified rules as
  the list, computed from Core's recorded steps. Core and Tinybird may differ
  while replication catches up; the history describes the Core read.
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
  Older servers omit these fields; clients must accept their absence.

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

The canvas estimates future steps from the pending `ready_at` and current saved
wait durations, independently of the editing draft. For overdue pending steps,
estimates start at the current time. These are labeled Expected; a delayed step
can shift later dates. Unknown wait durations suppress dates for the remaining
path. Estimates are display-only and do not affect scheduling.
