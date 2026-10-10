# Branch Development

## Overview

Tinybird Cloud branches provide isolated environments for development and testing. Each branch gets its own copy of resources and can optionally include production data. Branches are the recommended workflow for teams collaborating on the same workspace.

## When to Use Branches

- Developing features that need real production data shapes for testing
- Collaborating with a team where multiple people work on the same workspace
- Testing schema changes or new endpoints before deploying to production
- CI/CD workflows that validate changes on pull requests

For solo development or quick iteration, Tinybird Local (`dev_mode=local`) may be faster. See `rules/local-development.md`.

## Branch Workflow

1. Create a git branch for your feature
2. Run `tb dev` — Tinybird automatically creates a Cloud branch matching your git branch name
3. Develop and test against the branch (file changes are watched and auto-rebuilt)
4. Push changes and create a PR
5. Merge to deploy to production

## Creating Branches

Automatic (recommended):

Check out a git branch and run `tb dev` or `tb build`. Tinybird automatically creates or uses a Cloud branch with the same name as your git branch.

Manual:

```
tb branch create my_feature
```

Branch names must use underscores, not hyphens (e.g., `my_feature`, not `my-feature`).

### The `--last-partition` Flag

Use `--last-partition` to copy the latest partition of production data into the branch:

```
tb branch create my_feature --last-partition
```

This is useful when you need real data to test queries, validate endpoint behavior, or debug issues that depend on production data shapes. Without it, the branch starts empty.

### The `--with-connections` Flag

Use `--with-connections` to enable connectors (Kafka, S3, GCS) in the branch:

```
tb branch create my_feature --last-partition --with-connections
```

For S3/GCS, import sample data with `tb --branch=my_feature datasource sample <datasource> --wait`. Kafka connections are stopped by default and need to be started explicitly with `tb --branch=my_feature datasource start <datasource>`.

## Working with Branch Tokens

After creating a branch, you may need its token to connect client applications (dashboards, APIs, scripts) to the branch environment instead of production.

List tokens for a branch:

```
tb --branch my_feature token ls
```

### Using Branch Tokens in Client Apps

A common pattern is to set an environment variable that your application checks, falling back to the production token when no branch token is set:

```env
# .env.local
TINYBIRD_API_URL=https://api.tinybird.co
TINYBIRD_API_TOKEN=<production-read-token>
TINYBIRD_BRANCH_TOKEN=<branch-token>
```

In your application, prioritize the branch token when present:

```
token = TINYBIRD_BRANCH_TOKEN || TINYBIRD_API_TOKEN
```

This way, setting or unsetting the branch token switches between branch and production data without code changes.

## Branch Commands Reference

- `tb branch ls`: List all branches
- `tb branch create <name>`: Create a new branch (empty)
- `tb branch create <name> --last-partition`: Create a branch with latest production data
- `tb branch create <name> --last-partition --with-connections`: Create a branch with data and connectors
- `tb branch rm <name>`: Remove a branch
- `tb branch clear`: Clear branch state
- `tb dev`: Start development session (auto-creates branch from git branch name, watches files)
- `tb --branch <name> open`: Open the branch in the Tinybird UI

## Targeting a Branch Explicitly

Most commands can target a specific branch with the `--branch` flag:

```
tb --branch my_feature endpoint data my_endpoint
tb --branch my_feature sql "SELECT count() FROM my_datasource"
tb --branch my_feature token ls
```

When `dev_mode=branch`, `tb build` targets the branch automatically without needing `--branch`.
