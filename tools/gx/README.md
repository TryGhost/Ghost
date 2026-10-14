# gx

The private, workspace-local Ghost contributor CLI. After `pnpm bootstrap`, run:

```sh
pnpm gx --help
pnpm gx generate package email-utils --description "Email utilities for Ghost."
pnpm gx generate package parser --dir packages/email/parser
```

Package generation moves the existing package generator from `tools/scripts/`
without changing its behavior. It still uses `packages/_template` and the shared
helpers in `tools/scripts/lib/`. `pnpm create-package` remains a forwarding alias.
Run `pnpm install` after generating a package; custom destinations must be covered
by the workspace globs.

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

Core-dependent commands use `.cts` to preserve their CommonJS boundary and are
checked with Core's TypeScript configuration; other gx commands use the shared
ESM configuration. The table-rebuilding logic remains in Core.

## Development data

Run `pnpm gx data generate [options]` to populate a development database, or
`pnpm gx data multi-sub-scenarios` to seed named subscription-resolution
scenarios. See [working with test data](../../docs/contributing/test-data.md) for
options and prerequisites. Existing `pnpm reset:data` variants and
`pnpm seed:multi-sub-scenarios` forward to these commands.

Both reuse the checkout's development-environment runner and Ghost working
directory. They run through Core's source loader and `.cts` boundary, with the
data-generation engine remaining in Core. The generator preserves its existing
environment permissions and options. `node index.js generate-data` now reports
its gx replacement; REPL and timetravel remain in Core pending their migrations.

## Validation

The `@internal/gx` workspace gives pnpm and Nx a unit for lint and tests. It runs directly
from TypeScript source and has no build or package exports. Its `test` command
checks types as well as running the command tests. Run `pnpm --filter @internal/gx lint` and
`pnpm --filter @internal/gx test` to validate it. Add further commands as focused migrations
of existing tools.
