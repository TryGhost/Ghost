# gx

The private, workspace-local Ghost contributor CLI. After `pnpm bootstrap`, run:

```sh
pnpm gx --help
pnpm gx generate package email-utils --description "Email utilities for Ghost."
pnpm gx generate package parser --dir packages/email/parser
```

Package generation uses `packages/_template` and the shared helpers in
`tools/scripts/lib/`. `pnpm create-package` remains a forwarding alias.
Run `pnpm install` after generating a package; custom destinations must be covered
by the workspace globs.

## Development stacks

Run `pnpm gx dev up`, `pnpm gx dev down`, `pnpm gx dev status` and
`pnpm gx dev gc` to manage development stacks. Existing arguments still apply,
including `up dev:analytics`, `down --all`, `down --orphans`, `status --json`
and `gc --yes`. See [development setup](../../docs/contributing/development-setup.md#worktrees)
for behavior and options.

`pnpm dev:up`, `pnpm dev:down`, `pnpm dev:status` and `pnpm dev:gc` remain direct
shortcuts to the same command files. The private session-end hook and shutdown
path use Node built-ins only. Run `node tools/gx/dev-down.ts` directly when
workspace dependencies are missing or stale; shutdown from the status view also
uses direct Node execution and supports checkouts with the older script paths.
Shared environment and infrastructure setup remain in `tools/scripts`.

## Golden email preview

Run `pnpm gx generate golden-email <segment> <output-path>` against a running Ghost dev
instance. Set `GHOST_GOLDEN_POST_AUTH` to an Admin API key in `id:secret` format;
`GHOST_URL` defaults to `http://localhost:2368`. The command writes preview HTML
and removes its temporary draft post. Output paths resolve from your current
directory.

The command lives in `tools/gx`; its golden-post fixture remains under Ghost tests.

## Database migration generator

Run `pnpm gx generate migration <slug>` from the repository root. The slug must
be kebab-case. The existing generator creates a timestamped migration in the
next minor-version folder and promotes package versions to RC when needed.
See [database migrations](../../docs/practices/database-migrations.md) for the
workflow.

## Rebuild development tables

Run `pnpm gx db rebuild-development-tables` after editing development-only table
schemas. This drops and recreates the listed tables, discarding their data.
Start the development database first. gx uses the existing development-environment
runner and the checkout's Ghost working directory; it does not start services.

All gx commands use TypeScript ES modules and the shared strict configuration.
Core-dependent commands import Core's existing CommonJS modules through the
source loader. The table-rebuilding logic remains in Core.

## Development data

Run `pnpm gx data generate [options]` to populate a development database, or
`pnpm gx data multi-sub-scenarios` to seed named subscription-resolution
scenarios. See [working with test data](../../docs/contributing/test-data.md) for
options and prerequisites. Existing `pnpm reset:data` variants and
`pnpm seed:multi-sub-scenarios` forward to these commands.

Both reuse the checkout's development-environment runner and Ghost working
directory. They use the source loader, with the data-generation engine remaining
in Core. The generator preserves its existing environment permissions and
options. `node index.js generate-data` now reports its gx replacement. Installed
trees ship a dependency-light entrypoint at
[`ghost/bin/generate-data.js`](../../ghost/bin/README.md#data-generation). Both
entrypoints share Core's option validation and normalization; their environment
setup and logging stay separate. See the [shared-tool pattern](../README.md#tools-needed-in-a-checkout-and-an-installed-release).

## REPL and date shifting

Run `pnpm gx repl` for an interactive shell with `models`/`m` and `knex`/`k`.
Clearing the REPL restores those bindings; exiting closes the connection.

Run `pnpm gx data shift-dates` to shift database dates up to the present day, or
pass `--offset=<days>` to choose an offset. This modifies all dateTime columns.
The default offset is the number of whole UTC days since the last member login.
It asks for confirmation unless `--force` is supplied. Both commands retain
their development/local environment restriction and use the same Core runner.

The former `node index.js repl` and `node index.js timetravel` entrypoints report
their gx replacements. The old `ghost/core/cli` framework has been removed.

## Recipient preparation benchmark

Run `pnpm gx benchmark recipient-preparation [members] [concurrency]` to measure
email recipient preparation. Defaults are 500,000 members and concurrency 2;
start smaller with `pnpm gx benchmark recipient-preparation 10000 2`.

gx supplies the source loader and `--expose-gc`. The benchmark uses the configured
MySQL server, creates its own uniquely named database and drops it afterwards.
Its database user needs permission to create and drop databases. It prints JSON
metrics for preparing all members, rebuilding interrupted preparation and
preparing a label segment. See [performance testing](../../docs/contributing/performance-testing.md).

## Service migration reports

These temporary commands combine the service inventory with the current
Dependency Cruiser audit. Run them from the repository root:

| Command                                 | Output                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| `pnpm gx services report`               | Ownership totals, migration progress and remaining work        |
| `pnpm gx services list`                 | Entries, ownership, migration status and dependency counts     |
| `pnpm gx services report email-address` | One entry's notes, assessments, blockers and offending imports |
| `pnpm gx services dependencies`         | Disallowed dependencies ranked by distinct importing files     |
| `pnpm gx services audit`                | Dependency Cruiser's full native report                        |

List a group with `list --group <group>`. Report tables show group IDs;
`list --help` lists all groups. For example:

```sh
pnpm gx services list --group straightforward-clear
pnpm gx services list --group needs-preparation
pnpm gx services list --group to-migrate
pnpm gx services list --group undecided
pnpm gx services list --group migrated --json
```

`report`, `list` and `dependencies` accept `--json` for structured output.
`services audit` accepts the formatter's options, including
`--output-type markdown` and `--output-type json --output-to /tmp/service-dependencies.json`.
It replaces `pnpm audit:services`; `services dependencies` replaces
`pnpm audit:services:summary` without requiring `jq`.

### Interpreting the reports

Counts are calculated from the checkout, not stored in the inventory. The report
shows one table with `MIGRATION`, `COUNT` and `GROUP` columns. Disposition
(**Migrate**, **Relocate**, **Split** or **Undecided**) and migration progress
are counted independently. See the [services README](../../ghost/core/server/services/README.md)
for what each disposition means.

**Migrate** comprises three groups:

- **Migrated:** marked `migrated: true`.
- **Needs preparation:** not migrated, and either assessment is
  complex or identifies a possible model change.
- **Straightforward:** not migrated, both assessments are
  straightforward, and the existing model fits. This can still include
  dependency violations and test gaps.

The `to-migrate` filter shows what's left to migrate:
**needs preparation + straightforward**. Relocations, splits and undecided
entries are listed by the `relocate`, `split` and `undecided` filters; their
notes and migration assessments explain the work needed.

Per-service reports show an entry's optional `futureHome`, a suggested home
after this migration. It does not change the entry's group.

Lists and per-service JSON expose independent `ownership` and `migrationStatus`
fields instead of a combined category. Summary JSON retains labelled counts;
ownership counts sum to **Catalogued entries**, and **Migrated + Unmigrated
entries** gives the same total. Diagnostic counts are overlapping subsets,
not additional services.

Per-service reports show inventory notes before the migration assessments, so
planned ownership changes are visible alongside earlier assessments. Notes are
also included in JSON output as `entry.notes`.

Entries found by the audit but absent from the inventory are **Not inventoried**;
entries absent from the dependency graph have unknown counts. Malformed or
incomplete assessments fail the report.
The `not-analyzed` and `not-inventoried` diagnostic counts are available in
summary JSON and list filters, but omitted from the text summary.

`list` counts distinct disallowed dependency targets per entry, with unresolved
and own-root imports in separate columns. `dependencies` counts distinct
importing implementation files per target, largest first; it excludes unresolved
and own-root findings. The native `audit` counts rule violations, so one import
can appear under more than one rule.

The audit checks all entries and returns success when it finds violations.
`pnpm lint:boundaries` enforces the same rules for migrated services in CI.
Legacy root `index.js` files are treated as wiring candidates. Computed paths
such as `require(name)` cannot be resolved by the static audit. No violations
does not mean ready to migrate: recorded blockers, runtime behavior and test
gaps still need review. See the
[services guide](../../ghost/core/server/services/README.md#dependency-boundaries)
for the dependency policy.

## Validation

The `@internal/gx` workspace gives pnpm and Nx a unit for lint and tests. It runs directly
from TypeScript source and has no build or package exports. Its `test` command
checks types as well as running the command tests. Run `pnpm --filter @internal/gx lint` and
`pnpm --filter @internal/gx test` to validate it. Keep contributor command
implementations here and reusable Core logic in its owning subsystem.

See [tooling ownership](../README.md) before adding a command or relocating its
implementation, shared helpers or installed-release functionality.
