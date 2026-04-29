# Tinybird CLI Commands

**⚠️ Never invent commands or flags.** If you are unsure whether a command or flag exists, run `tb <command> --help` to verify before using it. Only use commands and flags documented here or confirmed via `--help`.

## Build/Deploy Context (CLI 4.0)

- Preferred flow: configure `dev_mode` once, then run plain `tb build` and `tb deploy`.
- Use `--cloud`, `--local`, and `--branch` only as explicit manual overrides.

## Global Overrides

- `tb --cloud <command>`: Run command against Cloud
- `tb --local <command>`: Run command against Local
- `tb --branch <branch_name> <command>`: Run command against a specific branch
- `tb --debug <command>`: Print debug information

## Project & Development

- `tb init`: Initialize a new project
- `tb create`: Deprecated alias for `tb init`
- `tb info`: Show project information and CLI context
- `tb build`: Validate and build the project
- `tb build --watch`: Build and watch for changes
- `tb dev`: Build and watch for changes
- `tb dev --ui`: Connect local project to Tinybird UI
- `tb preview`: Create/update preview environment for the current branch
- `tb open`: Open workspace in the browser
- `tb fmt <file>`: Format a .datasource, .pipe, or .connection file
- `tb fmt <file> --diff`: Show diff without modifying file

## Deploy & Deployments

- `tb deploy`: Deploy the project
- `tb deploy --check`: Validate deployment without actually creating
- `tb deploy --wait`: Wait for deployment to finish
- `tb deploy --allow-destructive-operations`: Allow destructive changes (requires explicit confirmation)
- `tb deployment ls`: List all deployments
- `tb deployment create`: Create a staging deployment and validate before promoting
- `tb deployment promote`: Promote a staging deployment to production
- `tb deployment discard`: Discard a pending deployment

## Logs

- `tb logs`: Show recent logs from common service datasources
- `tb logs --start -30m --source '*'`: Query all sources for a custom time range
- `tb logs --output json`: Emit logs as JSON for scripting

## Data Sources

- `tb datasource ls`: List all data sources
- `tb datasource append <name> --file <path>`: Append data from local file
- `tb datasource append <name> --url <url>`: Append data from URL
- `tb datasource append <name> --events '<json>'`: Append JSON events
- `tb datasource replace <name> <file_or_url>`: Full replace of data source
- `tb datasource replace <name> <file_or_url> --sql-condition "<condition>"`: Selective replace
- `tb datasource delete <name> --sql-condition "<condition>"`: Delete matching rows
- `tb datasource delete <name> --sql-condition "<condition>" --wait`: Delete and wait for completion
- `tb datasource truncate <name> --yes`: Delete all rows
- `tb datasource truncate <name> --cascade --yes`: Truncate including dependent MVs
- `tb datasource sync <name> --yes`: Sync from S3/GCS connection
- `tb datasource export <name> --format csv`: Export data to file

## Pipes & Endpoints

- `tb pipe ls`: List all pipes
- `tb endpoint ls`: List all endpoints
- `tb endpoint data <pipe_name>`: Get data from endpoint
- `tb endpoint data <pipe_name> --param_name value`: Get data with parameters
- `tb endpoint stats <pipe_name>`: Show endpoint stats for last 7 days
- `tb endpoint url <pipe_name>`: Print endpoint URL
- `tb endpoint token <pipe_name>`: Get token to read endpoint

## SQL Queries

- `tb sql "<query>"`: Run SQL query
- `tb sql "<query>" --stats`: Run query and show stats
- `tb sql --pipe <path> --node <node_name>`: Run SQL from a specific pipe node

## Materializations & Copy Pipes

- `tb materialization ls`: List all materializations
- `tb copy ls`: List all copy pipes
- `tb copy run <pipe_name>`: Run a copy pipe manually
- `tb copy run <pipe_name> --param key=value`: Run with parameters

## Testing

- `tb test run`: Run the full test suite
- `tb test run <file_or_test>`: Run specific test file or test
- `tb test update <file_or_test>`: Update test expectations

## Mock Data

- `tb mock` was removed in CLI 4.0
- Use the `fixtures/` folder and agent skills to generate sample data, then append with `tb datasource append`

## Tokens & Secrets

- `tb token ls`: List all tokens
- `tb secret ls`: List all secrets
- `tb secret set <name> <value>`: Create or update a secret
- `tb secret rm <name>`: Delete a secret

## Connections & Sinks

- `tb connection ls`: List all connections
- `tb sink ls`: List all sinks

## Jobs

- `tb job ls`: List all jobs
- `tb job cancel <job_id>`: Cancel a running job

## Branches

- `tb branch ls`: List all branches
- `tb branch create <name>`: Create a new branch
- `tb branch rm <name>`: Remove a branch
- `tb branch clear`: Clear branch state

## Tinybird Local

- `tb local start`: Start Tinybird Local container
- `tb local stop`: Stop Tinybird Local
- `tb local restart --yes`: Restart Tinybird Local
- `tb local status`: Check Tinybird Local status
- `tb local remove`: Remove Tinybird Local completely
- `tb local version`: Show Tinybird Local version
- `tb local clear`: Clear local workspace state

## Workspace

- `tb workspace ls`: List all workspaces
- `tb workspace current`: Show current workspace
- `tb workspace clear --yes`: Clear workspace state

## Authentication

- `tb login`: Authenticate via browser
- `tb logout`: Remove authentication
- `tb update`: Update CLI to latest version
