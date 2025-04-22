# Tinybird

This folder contains configuration for Tinybird, so that the Traffic Analytics feature can be used in Ghost.

We sync this configuration with Tinybird via the Tinybird CLI.

## Tinybird CLI

The Tinybird CLI is installed in Ghost's Docker development image. You can easily open a shell to use the Tinybird CLI by running:

### Usage

1. Run `yarn tb` from the monorepo root. This opens an interactive shell in Ghost's development container, which has the Tinybird CLI pre-installed.
2. Run any Tinybird CLI commands using `tb`, such as `tb auth -i`

Documentation for the Tinybird CLI: https://docs.tinybird.co/v/0.22.0/cli/overview
Note: you can use python if you prefer, but we use Docker for consistency.

How to work with version control: https://docs.tinybird.co/v/0.22.0/guides/version-control

## Workspace Setup

This project uses the `dedicated_staging_stats` workspace. To set up your local environment:

1. Run `yarn tb` to spin up a Ghost container with the Tinybird CLI installed
2. Run `tb auth` and provide your token for the `dedicated_staging_stats` workspace. This generates a `.tinyb` file specific to your user - this should not be committed.

## Development CLI (`wa`)

To simplify common development tasks a wrapper CLI called `wa` is available within the `yarn tb` shell.

### Usage

1.  Run `yarn tb` from the monorepo root.
2.  The `wa` command is automatically available in the shell.

### Commands

*   `wa test [-n <test_name>] [-u|--update]`
    *   Runs the test suite against the current branch.
    *   `-n <test_name>`: Run only a specific test file (name without `.test.sql`).
    *   `-u` or `--update`: Regenerate test result snapshots instead of running tests. Cannot be used with `-n`.
*   `wa branch [-a|--append] [-d|--deploy]`
    *   Creates a new development branch in Tinybird.
    *   `-a` or `--append`: Appends fixture data after creating the branch.
    *   `-d` or `--deploy`: Deploys local changes to the branch after creation. Note: your git workspace must be clean with no uncommitted changes for this to work.
*   `wa branch rm`
    *   Deletes the *current* Tinybird branch. Prompts for confirmation.
*   `wa lint`
    *   Runs the linting script (`./scripts/lint.sh`) on Tinybird `.datasource` and `.pipe` files.
*   `wa help`
    *   Displays the help message with all commands and options.


## CI/CD

All changes to the `main` branch of the staging and production workspaces should be made exclusively via the CI/CD jobs.

### Testing

When you raise a PR that contains changes to the files in `ghost/web-analytics`, the Tinybird fixture tests will run and gate merging your PR until they pass.

### Deployment

Upon merging your PR to `main`, your changes will be deployed to both the `dedicated_staging_stats` workspace and the `dedicated_production_stats` workspace simultaneously.

Note: this is likely to change soon — in the future changes will be automatically deployed to the staging workspace, but the deployment to the production workspace will likely be handled differently.
