# Build & Deploy

Use this rule to keep local files, development environments, and production deployments aligned under the CLI 4.0 workflow.

## Default Workflow (CLI 4.0)

1. Configure `dev_mode` in `tinybird.config.json` (`branch`, `local`, or `manual`).
2. Run `tb build` to validate and sync to the configured development target.
3. Run `tb deploy` to deploy to Tinybird Cloud main (production).

In CLI 4.0, build/deploy should usually be run without `--cloud`, `--local`, or `--branch`.

## `tb build` Behavior

- `dev_mode=local`: builds against Tinybird Local.
- `dev_mode=branch`: builds against a Cloud branch derived from the current git branch (created automatically if needed).
- `dev_mode=manual`: requires explicit flags (`--local`, `--cloud`, `--branch`) for environment selection.
- In branch mode, building from `main`/`master` is blocked to avoid accidental production changes.

## `tb deploy` Behavior

- `tb deploy` deploys current project files to Tinybird Cloud main.
- Use only when the user explicitly requests a production deployment.
- Ask for confirmation before deploying.

## Deploy Check

- Run `tb deploy --check` before real deploys to catch schema/dependency issues early.
- Use check mode whenever deployment intent is uncertain.

## Destructive operations and flags

- Deleting datasources, pipes, or connections locally requires an explicit destructive deploy.
- Use `tb deploy --allow-destructive-operations` only when the user confirms deletion or data loss is acceptable.
- If you see warnings about deletions, stop and ask for confirmation before re-running with the flag.

Example:
```
tb deploy --allow-destructive-operations
```

## Manual Overrides

- Explicit flags still work and override `dev_mode`.
- Use overrides only when the user explicitly asks for a specific environment target.

## Validation intent (why)

- Building keeps development environments aligned with local files for fast iteration.
- Deploy checks reduce failed deployments by validating changes before publishing.

## What not to do

- Do not deploy destructive changes without `--allow-destructive-operations` and explicit user confirmation.
- Do not assume production is updated after `tb build`; `build` and `deploy` are separate operations.
