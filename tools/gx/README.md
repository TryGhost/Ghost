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

Run `pnpm gx email golden <segment> <output-path>` against a running Ghost dev
instance. Set `GHOST_GOLDEN_POST_AUTH` to an Admin API key in `id:secret` format;
`GHOST_URL` defaults to `http://localhost:2368`. The command writes preview HTML
and removes its temporary draft post. Output paths resolve from your current
directory.

The command lives in `tools/gx`; its golden-post fixture remains under Ghost tests.
The existing
`pnpm --filter ghost generate-golden-email <segment> <output-path>` alias still
works with its existing working-directory behavior.

## Validation

The `@internal/gx` workspace gives pnpm and Nx a unit for lint and tests. It runs directly
from source and has no build or package exports. Run `pnpm --filter @internal/gx lint` and
`pnpm --filter @internal/gx test` to validate it. Add further commands as focused migrations
of existing tools.
