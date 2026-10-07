# Project Files

## Project Root

- By default, create a `tinybird/` folder at the project root and nest Tinybird folders under it.
- Ensure the `.tinyb` credentials file is at the same level where the CLI commands are run.
- The `tinybird.config.json` file in the project root controls build/deploy behavior.

## tb info

Use `tb info` to confirm CLI context, especially for credentials issues.

It reports information about Local and Cloud environments:

- Where the CLI is loading the `.tinyb` file from
- Current logged workspace
- API URL
- UI URL
- ClickHouse HTTP interface URL

It can show values for both Cloud and Local environments.

## File Locations

Default locations (use these unless the project uses a different structure):

- Endpoints: `/endpoints`
- Materialized pipes: `/materializations`
- Sink pipes: `/sinks`
- Copy pipes: `/copies`
- Connections: `/connections`
- Datasources: `/datasources`
- Fixtures: `/fixtures`
- Tests: `/tests`

## Organizing Larger Projects

As projects grow, consider organizing endpoints and datasources by domain or consumer. The `include` field in `tinybird.config.json` controls which directories are included in builds.

For example, a project with multiple consumers might use:

```
tinybird/
├── datasources/
├── endpoints/              # General-purpose API endpoints
├── endpoints_dashboard/    # Dashboard-specific endpoints
├── endpoints_public/       # Public-facing endpoints
├── materializations/
├── copies/
├── connections/
└── fixtures/
```

This pattern helps when different teams or applications consume different sets of endpoints, and keeps the endpoint count manageable per directory.

## Data Layer Architecture

For complex projects, organizing datasources and pipes into logical data layers improves clarity:

| Layer       | Purpose                                         | Example                              |
| ----------- | ----------------------------------------------- | ------------------------------------ |
| Landing     | Raw ingested data from external sources         | `raw_events`, `s3_import_logs`       |
| Cleaned     | Deduplicated or transformed data                | `events_dedup`, `normalized_logs`    |
| Dimensions  | Lookup and reference tables                     | `dim_organizations`, `dim_users`     |
| Aggregation | Materialized views for pre-computed metrics     | `mv_events_daily`, `mv_usage_hourly` |
| API         | Endpoint pipes that serve the final queries     | `kpis`, `top_pages`, `user_activity` |
| Export      | Sink pipes for sending data to external systems | `sink_to_s3`, `sink_to_kafka`        |

Not every project needs all layers. Start simple and add layers as complexity grows.

## Tinybird Terminology

When writing descriptions, comments, or documentation for Tinybird resources, use consistent capitalization:

- **Data Source** (not datasource or data source in prose)
- **Pipe**
- **Endpoint** or **API Endpoint**
- **Materialized View**
- **Token**
- **Workspace**
- **Sink**
- **Copy Pipe**
- **Connection**

Datafile instructions should be referenced in uppercase: `FORWARD_QUERY`, `ENGINE_SORTING_KEY`, `ENGINE_PARTITION_KEY`, `COPY_SCHEDULE`, `COPY_MODE`, `TYPE`, `SCHEMA`, `DESCRIPTION`.

## File-Specific Rules

See these rule files for detailed requirements:

- `rules/datasource-files.md`
- `rules/pipe-files.md`
- `rules/endpoint-files.md`
- `rules/materialized-files.md`
- `rules/sink-files.md`
- `rules/copy-files.md`
- `rules/connection-files.md`

After making changes in the project files, check `rules/build-deploy.md` for next steps.
