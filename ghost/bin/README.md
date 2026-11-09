# Installed Ghost tools

Tools shipped with Ghost for use against an installed release, including image
construction and custom-adapter checks. They work without the repository's
private gx workspace. See [tooling ownership](../../tools/README.md) before adding
an executable here.

| Source                                                       | Format                                 | Purpose                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [validate-adapters.ts](validate-adapters.ts)                 | TypeScript, compiled to CommonJS `.js` | Load explicitly named adapters and validate their base-class contract; optionally check duplicated dependencies |
| [lib/duplicate-deps.ts](lib/duplicate-deps.ts)               | TypeScript, compiled to CommonJS `.js` | Private installed-tree dependency inspection used by adapter validation                                         |
| [warm-compile-cache.sh](warm-compile-cache.sh)               | Bash                                   | Boot Ghost once to populate Node's on-disk compile cache during an image build                                  |
| [generate-data.ts](generate-data.ts)                         | TypeScript, compiled to CommonJS `.js` | Populate the configured database with generated data                                                            |
| [benchmark-settings-reload.ts](benchmark-settings-reload.ts) | TypeScript, compiled to CommonJS `.js` | Measure settings database reads and cache rebuilding in an isolated process                                     |

The [Ghost manifest](../package.json) ships `bin/`; [Core's compiler configuration](../tsconfig.json)
includes its TypeScript sources. Invoke compiled files in the installed tree,
not raw `.ts` files that depend on the source-checkout loader.

## Adapter validation

From the installed Ghost directory:

```sh
node bin/validate-adapters.js --check-duplicate-deps storage:S3Storage
```

Substitute the adapter type/class installed in that tree; the example requires
that adapter to exist. Adapter specifications are explicit because runtime
configuration may not be present during an image build. The checker uses Core's
adapter loader and base-class definitions. The optional duplicate check compares
packages actually loaded from the adapter and Ghost dependency trees; a workspace
checkout with linked packages is not an equivalent installed-tree test.

## Data generation

From the installed Ghost directory, configured for a disposable database:

```sh
node bin/generate-data.js --quantities=members:10000 --seed=123
```

This runs Core's data generator with the same options as `pnpm gx data generate`
(see [working with test data](../../docs/contributing/test-data.md)). It has no
environment gate and writes into whatever database the tree is configured for,
so never point it at a site with data you need to keep. Outside `development`, MySQL needs
`ALLOW_INFILE_STREAM=1` to permit the infile streaming the generator uses.
Contributors in a checkout use the gx command instead.
Both commands share [Core's option validation and normalization](../core/server/data/seeders/schema.ts),
including zero quantities and rejection of invalid quantities/seeds before database
setup. See the [shared-tool pattern](../../tools/README.md#tools-needed-in-a-checkout-and-an-installed-release).

Hosting and image tooling outside this repository runs it to seed installed
images, where there is no gx and Core internals should not be required directly.

## Compile-cache warming

From the installed image build tree:

```sh
bash bin/warm-compile-cache.sh
```

The script boots Ghost with shutdown-after-boot enabled. By default it uses a
throwaway SQLite database and snapshots/restores `content/` around a successful
run. `NODE_COMPILE_CACHE` overrides the default `.compile-cache` directory, which
must be writable. The warmed cache must match the runtime's absolute application
path, Node version and architecture. Run it after adding adapters or patches if
those modules should be warmed too.

This is an available image-build hook; its presence does not mean the repository's
production Dockerfile invokes it. Downstream image callers must be checked before
changing its path or contract.

## Adding or changing a tool

Use this folder when an installed Ghost tree is the required execution context.
Contributor-only generators and database experimentation belong in
[gx](../../tools/gx/README.md). Build/archive helpers belong in
[ghost/scripts](../scripts/README.md), including the shipped prune helper.

Keep private helpers in `lib/`. Top-level entrypoints are a downstream contract:
hosting and image tooling outside this repository runs them from installed trees.
[entrypoints.test.ts](../test/unit/bin/entrypoints.test.ts) pins the list, and
changes to this folder need code-owner review. Confirm those consumers before
removing, renaming or moving an entrypoint. Verify the emitted entrypoint and package contents
in a disposable installed tree, including resolution of Core and adapter imports;
a source-checkout test alone does not establish the installation contract.

## Settings reload benchmark

Run from the installed Ghost application directory, with its usual configuration:

```sh
NODE_ENV=production node bin/benchmark-settings-reload.js --output /tmp/settings-reload.json
```

In a source checkout, after `pnpm bootstrap` and the Ghost build prerequisites:

```sh
cd ghost
NODE_ENV=development node --conditions=source --import=tsx bin/benchmark-settings-reload.ts --output /tmp/settings-reload.json
```

Use a separate process against a disposable staging copy. Use a read-only database
account and match the site's settings, host overrides, cache adapter, database
configuration and network path. Never import this command into a serving process:
it replaces that process's settings cache. A configured external cache adapter
can also affect shared cache storage; isolate its namespace or backend first.

The command calls the real `Settings.findAll`, settings cache initializer and
calculated-field factory. It mirrors the overrides in `settingsService.init`.
It excludes default population, access-limit enforcement, UUID validation and
other boot work. It performs no application database writes and does not boot
the Ghost server. Host limits load before measurement so calculated fields match
boot. These measurements cover reload work, not full boot.

Options:

- `--runs`: measured serial runs, default 1000, range 1–100000.
- `--warmup`: discarded serial runs, default 20, range 0–10000.
- `--timeout-ms`: observation limit per run, default 120000, range 1–3600000.
- `--output`: required new JSON file. Existing files are never overwritten.

The JSON contains every sample, including warmup, with elapsed milliseconds,
database-read time, rebuild time and row count for successful runs. The summary
uses nearest-rank p50 and p99 of successful measured runs only. No successful
measured runs means null percentiles. The first error or observation limit stops
the run; the command adds no retries. Database-driver or pool retries remain
unchanged. Error samples contain phase, error name and code, without SQL, setting
values or error messages. Setup failures produce `status: "setup-error"`.

Exit codes: 0 for success, 1 for an error, 2 for an observation limit. A deadline
means the promise remained pending until the observation limit; it does not prove
that the driver timed out or would never finish. It does not cancel the query.
Cleanup waits at most one extra second before the isolated process exits.
The timer needs a responsive event loop. Use an external process deadline as well
when investigating synchronous hangs or setup failures.

For failure observations, disable warmup and use one run:

```sh
NODE_ENV=production node bin/benchmark-settings-reload.js --warmup 0 --runs 1 --timeout-ms 120000 --output /tmp/settings-reload-failure.json
```

Run normal, delayed-database and unavailable-database cases separately. Apply
network faults only to the disposable copy's database connection. For a delayed
query on an existing connection, first establish the pool during warmup, then
introduce the fault before measured runs; use a proxy or database-side controls
outside this command. A fresh process with no warmup instead measures connection
establishment under the fault. Keep application timeout and retry settings
unchanged and record them with the result. Repeat a failed case with a longer
observation limit if the native driver outcome remains unknown.

Record the Ghost revision, Node version, database version, settings row count and
value-size profile, adapter, host overrides, network conditions and warmup/sample
counts. For MySQL, obtain the value-size profile without exporting settings:

```sql
SELECT COUNT(*) AS settings_count,
       SUM(OCTET_LENGTH(value)) AS total_value_bytes,
       MAX(OCTET_LENGTH(value)) AS largest_value_bytes
FROM settings;
```

Do not attach raw settings or credentials. Run enough repeated batches to
assess p99 stability; a single tiny local sample cannot establish staging latency.

Compare the normal p99 and its variability with the five-second purge delay.
Notification latency and a safety margin also need to fit. Failed reloads retain
old settings after a failed read, so low normal latency alone cannot establish
that background reload plus swap is correct. Record a recommendation only after
the staging timings and failure observations are available.
