# Ghost Dev Tools

`gx` is the workspace-local CLI for developing Ghost. Start from the repository
root after `pnpm bootstrap`:

```sh
pnpm gx --help
pnpm gx generate --help
pnpm gx generate package email-utils --description "Email utilities for Ghost."
pnpm gx generate package parser --dir packages/email/parser
```

Package generation uses `packages/_template`, creates a private TypeScript ESM
package, and adds its name to the private `versioning.ignore` block. Run
`pnpm install` afterwards to link it. Custom destinations must be inside the
repository; ensure the workspace globs include them. Existing destinations are
never overwritten. Failed generation removes its staged files and any newly
created package; the workspace manifest is replaced only after rendering succeeds.

`pnpm create-package` remains a forwarding alias with the same arguments.

## Adding commands

Register a command's path, description, help and handler in `src/cli.ts`. Keep
implementation functions in a named module and load them when the command runs.
Help and invalid commands must not boot Ghost, connect to a database or change
files. Successful commands return zero; failures print an explanation and return
one. Keep Core-specific implementations owned by Ghost when exposing them here.

## Package contract and verification

This is a private contributor tool, not a production library. Its executable and
shared generator helpers intentionally expose TypeScript source: supported Node
versions strip types directly, so commands and repository checks need no prior
build. The shared package-template and versioning helpers also serve repository
validation. `tools/scripts` depends on this package; gx must not depend on scripts.
It is not a production dependency of Ghost and is not published independently.

It uses the shared ESLint, TypeScript and Vitest configuration. Run:

```sh
pnpm --filter @tryghost/dev-tools build
pnpm --filter @tryghost/dev-tools test
pnpm --filter @tryghost/dev-tools lint
```

Tests use temporary repositories with the real template, and exercise command
errors, generated metadata, workspace updates and failure cleanup. Keep generators
independently testable; add registration or plugin machinery only when needed.
