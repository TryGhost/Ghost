# CI/CD Integration

## Recommended Pattern

Use Tinybird Local in CI to build and test with `tb --local build` and `tb --local test run`, then `tb --cloud deploy --check` to validate against Cloud. In CD, use `tb --cloud deploy` to deploy on merge to the main branch.

## CI: Pull Request Validation

The recommended CI flow uses a Tinybird Local service container for building and testing, then validates the deployment against Cloud:

1. `tb --local build` — build the project against Tinybird Local
2. `tb --local test run` — run tests against Tinybird Local
3. `tb --cloud deploy --check` — validate the deployment would succeed on Cloud (dry run)

The `deploy --check` step catches schema compatibility, dependency resolution, and resource naming issues before they reach production.

## CD: Production Deployment

Run when changes are merged to the main branch:

```
tb --cloud deploy
```

This creates a staging deployment, migrates data, and promotes to live.

For projects that prefer explicit confirmation, use a two-step process:

```
tb --cloud deployment create --wait
tb --cloud deployment promote
```

## Example: GitHub Actions

```yaml
# .github/workflows/tinybird-ci.yml
name: Tinybird CI
on:
  pull_request:
    paths:
      - 'tinybird/**'

env:
  TINYBIRD_HOST: https://api.tinybird.co
  TINYBIRD_TOKEN: ${{ secrets.TB_ADMIN_TOKEN }}

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      tinybird:
        image: tinybirdco/tinybird-local:latest
        ports:
          - 7181:7181
    steps:
      - uses: actions/checkout@v4
      - name: Install Tinybird CLI
        run: curl https://tinybird.co | sh
      - name: Build project
        run: tb --local build
        working-directory: tinybird
      - name: Test project
        run: tb --local test run
        working-directory: tinybird
      - name: Deployment check
        run: tb --cloud --host ${{ env.TINYBIRD_HOST }} --token ${{ env.TINYBIRD_TOKEN }} deploy --check
        working-directory: tinybird
```

```yaml
# .github/workflows/tinybird-cd.yml
name: Tinybird CD
on:
  push:
    branches: [main]
    paths:
      - 'tinybird/**'

env:
  TINYBIRD_HOST: https://api.tinybird.co
  TINYBIRD_TOKEN: ${{ secrets.TB_ADMIN_TOKEN }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Tinybird CLI
        run: curl https://tinybird.co | sh
      - name: Deploy
        run: tb --cloud --host ${{ env.TINYBIRD_HOST }} --token ${{ env.TINYBIRD_TOKEN }} deploy
        working-directory: tinybird
```

## Example: GitLab CI

```yaml
tinybird_ci:
  image: ubuntu:latest
  stage: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - tinybird/**
  services:
    - name: tinybirdco/tinybird-local:latest
      alias: tinybird-local
  before_script:
    - apt update && apt install -y curl
    - curl https://tinybird.co | sh
    - export PATH="$HOME/.local/bin:$PATH"
  script:
    - cd tinybird
    - tb --local build
    - tb --local test run
    - tb --cloud --host $TINYBIRD_HOST --token $TINYBIRD_TOKEN deploy --check

tinybird_cd:
  image: ubuntu:latest
  stage: deploy
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      changes:
        - tinybird/**
  before_script:
    - apt update && apt install -y curl
    - curl https://tinybird.co | sh
    - export PATH="$HOME/.local/bin:$PATH"
  script:
    - cd tinybird
    - tb --cloud --host $TINYBIRD_HOST --token $TINYBIRD_TOKEN deploy
```

## Preview Environments

Preview environments create an ephemeral Tinybird branch per pull request, so you can test changes with production data before merging.

### Using the TypeScript or Python SDK

The `tinybird preview` command (available in `@tinybirdco/sdk` and `tinybird-sdk`, not the `tb` CLI) creates a branch named `tmp_ci_<git-branch>`, builds resources, and deploys them:

```yaml
# GitHub Actions example
- run: npx tinybird preview
  env:
    TINYBIRD_TOKEN: ${{ secrets.TINYBIRD_TOKEN }}
```

The SDK auto-detects CI environments (GitHub Actions, GitLab CI, Vercel, CircleCI, Azure Pipelines, Bitbucket Pipelines) and resolves the correct branch token. The host is inferred from the token.

If a branch with the same name already exists, it is deleted and recreated.

### Using the tb CLI

The `tb` CLI doesn't have a `preview` subcommand. Create preview branches manually:

```yaml
- name: Create preview branch
  run: tb --host ${{ env.TINYBIRD_HOST }} --token ${{ env.TINYBIRD_TOKEN }} branch create tmp_ci_${{ github.head_ref }} --last-partition
- name: Build on branch
  run: tb --host ${{ env.TINYBIRD_HOST }} --token ${{ env.TINYBIRD_TOKEN }} --branch=tmp_ci_${{ github.head_ref }} build
```

### Cleanup

Delete preview branches when the PR is closed:

```yaml
# SDK
- run: npx tinybird branch delete tmp_ci_${{ github.head_ref }}

# tb CLI
- run: tb --host ${{ env.TINYBIRD_HOST }} --token ${{ env.TINYBIRD_TOKEN }} branch rm tmp_ci_${{ github.head_ref }}
```

### Preview with connectors

When your project uses Kafka, S3, or GCS connectors, the `tinybird preview` command doesn't ingest data from connectors in preview branches. To test with connector data, create the branch manually with `--with-connections`:

```
tb branch create tmp_ci_my_feature --last-partition --with-connections
```

For S3/GCS connectors, import sample data:

```
tb --branch=tmp_ci_my_feature datasource sample my_datasource --wait
```

Kafka connections are stopped by default in preview branches. Start them explicitly:

```
tb --branch=tmp_ci_my_feature datasource start my_kafka_datasource
```

## Key Principles

- Production deploys should happen through CI/CD, not manually.
- Use Tinybird Local in CI for building and testing (`tb --local build`, `tb --local test run`), then `tb --cloud deploy --check` to validate against Cloud.
- Use `--wait` in CD pipelines so the job reflects the actual deployment result.
- Store the admin token as a CI/CD secret, never in code.
- Scope CI triggers to Tinybird project file paths to avoid unnecessary runs.
- Use preview environments when you need a full working branch per PR with production data.
