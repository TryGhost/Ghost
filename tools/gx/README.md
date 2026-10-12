# gx

The private, workspace-local Ghost contributor CLI. After `pnpm bootstrap`, run:

```sh
pnpm gx --help
pnpm gx generate package email-utils --description "Email utilities for Ghost."
pnpm gx generate package parser --dir packages/email/parser
```

This first command moves the existing package generator from `tools/scripts/`
without changing its behavior. It still uses `packages/_template` and the shared
helpers in `tools/scripts/lib/`. `pnpm create-package` remains a forwarding alias.
Run `pnpm install` after generating a package; custom destinations must be covered
by the workspace globs.

The `gx` workspace gives pnpm and Nx a unit for lint and tests. It runs directly
from source and has no build or package exports. Run `pnpm --filter gx lint` and
`pnpm --filter gx test` to validate it. Add further commands as focused migrations
of existing tools.
