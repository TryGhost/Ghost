## Tinybird Analytics

This is the web analytics implementation using [Tinybird Forward](https://www.tinybird.co/docs/forward).

### Local development with Docker

The supported local development workflow uses `pnpm dev:analytics` with Docker
and Docker Compose. Install both before starting; the Tinybird CLI runs in a
container and Ghost is configured automatically.

All of these commands should be run from the root of the Ghost repository:

```bash
pnpm dev:analytics
```

This starts Ghost, Tinybird Local, and the Analytics service. The `tb-cli`
service builds the datafiles in this directory and writes the connection
configuration before Ghost and Analytics start. After that initial build, the
`tb-watch` service runs `tb --local dev` to watch the mounted files and
automatically rebuild the local Tinybird workspace when they change.

Watch output and build errors appear in the development logs. Fix an invalid
datafile and save it to trigger another build. Press `Ctrl+C` to stop the
development environment, including the watcher.

Watching is also enabled for the other development commands that include
analytics, such as `pnpm dev:analytics:local` and `pnpm dev:full`.

Ghost will be accessible at `http://localhost:2368`, and analytics should work out of the box.

#### Using the Tinybird CLI from Docker

The development environment already watches Tinybird files. To run additional
CLI commands without installing Tinybird on your machine, use `pnpm tb` while
`pnpm dev:analytics` is running. This runs the CLI in the `tb-cli` Docker Compose
service and forwards any arguments you provide.

To run a one-off command, use the following command:

```bash
pnpm tb <command>
```

For example, to list all tokens, you can run:

```bash
pnpm tb token ls
```

These commands use the running Tinybird Local instance and bypass the setup
entrypoint. To follow just the watcher logs, run:

```bash
docker compose -f compose.dev.yaml -f compose.dev.analytics.yaml logs -f tb-watch
```

### Testing

With `pnpm dev:analytics` running, run the Tinybird tests against Tinybird Local
from the repository root:

```bash
pnpm tb:test
```

To run a specific test file, pass its path relative to the Tinybird project:

```bash
pnpm tb:test tests/api_post_visitor_counts.yaml
```

### Testing data

In fixtures folder, you can find local test data. When tinybird local is running, you can append data, or remove data
from fixture files here. As you modify the files, the datasources will be auto updated.

Keep in mind that as you update fixtures, it will rebuild data, but materialized views will have appended data. Old
data will not be cleared from them. One way to approach this to make sure data is consistent is to truncate all data
sources before adding test data to it.

### Architecture

[See full documentation regarding analytics architecture in following document](ARCHITECTURE.md)

### Automation statistics

Run rows are sorted by `(site_uuid, automation_id, id)` and step rows by
`(site_uuid, automation_run_id, id)`. Ownership is immutable and the individual
row ID remains in each key, preserving latest-version deduplication. The site
prefix also supports the automation list. Queries use `FINAL` before aggregating.

Changing sorting keys rebuilds the materialized tables. Their `FORWARD_QUERY`
copies existing rows so the migration does not depend on retained raw events.
Keep it through deployment of the new layout, then remove it after every target
environment has migrated. Deploy the related datafiles together.

The entry pipe returns daily counts in the requested timezone (UTC by default).
Optional `date_from` and `date_to` pipe parameters are inclusive/exclusive calendar
bounds; Core converts the inclusive API end date to the next calendar day before
calling the pipe. Omit both for the full history. Core derives the total from that
same result. Status counts and run lists accept the same entry-date bounds,
including member-search queries. They select runs by `created_at` before reading
steps, then classify the full latest step history regardless of when the steps
ran. The three cards describe current outcomes for that entry cohort, not
outcomes that occurred during the selected period. Missing/unknown history stays
an internal diagnostic rather than adding a new filter category. The status pipe combines each run's latest step categories with a
bit mask: pending=1, finished=2, known exit=4, unknown=8. Any pending bit wins;
finished-only is 2; known exits with or without finished steps are 6 or 4. Missing
and unknown history is the selected run count minus the three classified counts.
The automation list continues using its existing pending-run view.

`api_automation_runs` returns a page ordered by entry time, then run ID.
`sort_direction` is `desc` (default) or `asc`, applying to both keys.
`limit` is 1–51 (default 50). Cursors use `after_created_at` and `after_id`.
Invalid parameters and unsupported `sort_by` values return a template error.

Unfiltered entry sorting limits run IDs before reading steps. Filtered entry
sorting classifies runs after the immutable cursor before limiting. Both paths
reuse the latest-step bit-mask classification, retaining missing history as
Unclassified. Status changes can alter filter membership but cannot move a run
across its entry-time position. Core hydrates member details after ordering.
Existing materialized tables are reused without a rebuild.

Do not turn these into incrementing materialized counters without a retraction
or deduplication strategy: inserted versions include retries and status changes.
Run `tb test run` to check the entry and status pipes against the committed
fixtures, including duplicates, old versions, missing history, and site isolation.

### Automation member-search candidates

`api_automation_run_search` is an internal companion to `api_automation_runs`.
It preserves the same latest-step classification, status filter and Entered
keysets, while allowing up to 5,000 candidates for Core's member intersection.
Optional `run_ids` restricts a proven complete set of at most 2,000 IDs before
ordering/classification. Core posts these IDs in the request body. The public
Admin endpoint still returns at most 50 matches.

The search pipe applies a two-second execution deadline. Failed/absent search
capability is an error even when Core found zero member matches. Deploy this pipe
before enabling the new Core consumer; the original pipe and non-search queries
are unchanged. The [automation service README](../../services/automations/README.md#run-list)
describes the run-list API and continuation behavior.

### Member-search count batches

`api_automation_search_counts` accepts at most 30,000 matching run IDs per POST
(up to 749,999 characters for comma-separated 24-character IDs). Keep these
limits aligned with `COUNT_LIMITS.batch` in the Core count service. Core scans
candidate windows and aggregates matching IDs sequentially, up to four windows
per continuation response, stopping between windows after its time budget.
Deploy the wider pipe limit before the Core consumer; existing smaller batches
remain supported. Timeouts and rate limits remain errors, never partial totals.
