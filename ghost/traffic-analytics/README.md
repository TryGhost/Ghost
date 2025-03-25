# Tinybird

This folder contains configuration for Tinybird, so that the stats feature can be used.

We sync this configuration with Tinybird via the Tinybird CLI.

## Tinybird CLI

The Tinybird CLI is used via Docker.

```bash
yarn tb
```

Documentation for the Tinybird CLI: https://docs.tinybird.co/v/0.22.0/cli/overview
Note: you can use python if you prefer, but we use Docker for consistency.

How to work with version control: https://docs.tinybird.co/v/0.22.0/guides/version-control

## Workspace Setup

This project uses the `dedicated_staging_stats` workspace. To set up your local environment:

1. Run `yarn tb` to spin up a Tinybird CLI container.
2. Run `tb auth` and provide your token for the `dedicated_staging_stats` workspace. This generates a `.tinyb` file specific to your user - this should not be committed.