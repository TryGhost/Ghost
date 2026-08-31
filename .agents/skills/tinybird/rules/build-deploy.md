# Build & Deploy Targeting

Start new projects with `tb init`.

Use `tinybird.config.json` as the source of truth for `tb build` targeting.

Example:

```json
{
  "dev_mode": "branch",
  "include": [
    "tinybird"
  ]
}
```

## Build/Deploy Flow

1. Read `dev_mode` from `tinybird.config.json`.
2. Run `tb build` against the configured development target.
3. Run `tb deploy` only when deployment to cloud production is explicitly requested.

## `tb build` Targeting

- `dev_mode: "local"` -> `tb build` runs against Tinybird Local.
- `dev_mode: "branch"` -> `tb build` runs against a Tinybird Cloud branch.

## `tb deploy` Targeting

- `tb --cloud deploy` deploys to Tinybird Cloud production. It creates a staging deployment, migrates data, and promotes to live.
- `tb deploy` is equivalent to `tb --cloud deploy`.
- Do not treat `tb build` as a production deployment.
- Use `tb --cloud deploy --check` to validate a deployment without applying it. Recommended for CI.
- For explicit confirmation, use `tb --cloud deployment create --wait` followed by `tb --cloud deployment promote`.

## Non-Build Command Targeting

Commands like `tb sql` and `tb logs` run against local by default.

Use explicit overrides to target other environments:

- `--cloud` for cloud
- `--branch=<branch-name>` for a specific branch

Examples:

```bash
tb sql "SELECT 1"
tb sql --cloud "SELECT 1"
tb sql --branch=feature_metrics "SELECT 1"

tb logs
tb logs --cloud
tb logs --branch=feature_metrics
```
