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

Run rows are sorted by `(site_uuid, automation_id, id)`. Ownership is immutable and
the row ID remains in the key, preserving latest-version deduplication. The site
prefix also supports the automation list. Queries use `FINAL` before aggregating.

Changing sorting keys rebuilds the materialized table. Its `FORWARD_QUERY` copies
existing rows so the migration does not depend on retained raw events. Keep it
through deployment of the new layout, then remove it after every target environment
has migrated. Deploy the related datafiles together.

The entry pipe returns the full daily history. Core derives the total from that
same result. Run `tb test run` to check the entry pipe against the committed
fixtures, including duplicates, old versions, and site isolation.
