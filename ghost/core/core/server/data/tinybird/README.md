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

Changing sorting keys rebuilds the materialized tables from the raw event
datasources, which have no TTL. Deploy the related datafiles together.

The performance pipe classifies each run once, then fills a calendar with zero counts
for missing dates through today in the requested timezone. Core derives the chart and status totals from that same
result. The latest step categories use a bit mask: pending=1, finished=2, known
exit=4, unknown=8. Any unknown bit fails the API request. Otherwise pending wins;
finished-only is 2; known exits with or without finished steps are 6 or 4. Runs
without steps are excluded by the inner join. The automation list continues using
its existing pending-run view.

`api_automation_runs` returns runs for one automation, ordered by entry time then
run ID in the requested direction. The pipe defaults to fifty rows and accepts
limits from one through fifty-one. Core requests fifty-one, returns up to fifty
through the Admin API, and uses the extra row to detect the next page. Keyset
cursors continue after the last returned entry time/ID. Entry-date filters use local midnight boundaries,
just like performance stats. It classifies eligible runs before filtering by status
and limiting, excluding runs without recorded steps. Invalid statuses are returned
first, regardless of status filtering, so Core rejects the request instead of hiding
invalid history beyond the page limit.
It reuses the existing materialized tables without a rebuild.
Member details are joined in Core, not stored in these Tinybird tables.
The run-list tests reuse the status and DST fixtures. A fixture with 52 eligible runs
checks the fifty-row limit with and without a status filter, and the fifty-one-row
fetch used for pagination. Its newest pending run must not take a slot in a
completed-only page.

Do not turn these into incrementing materialized counters without a retraction
or deduplication strategy: inserted versions include retries and status changes.
Run `tb test run` to check the performance pipe against the committed fixtures,
including duplicates, old versions, missing history, unknown statuses, daily
buckets, and site isolation.

The performance pipe automatically groups single-day results by hour. Hourly
keys are UTC timestamps, so repeated local hours remain distinct. The calendar
uses local midnight boundaries and fills through the current hour for today.
Longer ranges use daily dates. Missing-parameter behavior is
provided by Tinybird's required parameters; do not snapshot its error prose,
which differs between CLI/runtime environments.

### Automation member search

`api_automation_run_search` accepts optional comma-separated `run_ids` for a
complete match set of at most 2,000 IDs, or returns up to 5,000 candidates for
bounded scanning across all time. It preserves the normal run list's ordering and
cursor behavior across all statuses. Classification precedes the limit; runs without
steps are excluded, and unknown statuses are returned as invalid alongside the
other candidates. Invalid candidates follow normal cursor ordering; Core rejects
them only if their current member matches the search.

These are per-call work limits, not total-result caps. Core returns continuation
cursors until the traversal finishes, including for empty scanning pages.

The pipe uses the existing site-scoped token, `FINAL` for latest versions, and
a two-second execution limit. Core sends run IDs as POST form fields, with a
three-second request deadline. Member names, emails, and search text never enter
Tinybird. The fixture tests reuse the existing automation datasets; no new
production datasource or migration is required.
