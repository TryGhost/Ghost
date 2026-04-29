# Project Files

## Project Root

- By default, create a `tinybird/` folder at the project root and nest Tinybird folders under it.
- Ensure the `.tinyb` credentials file is at the same level where the CLI commands are run.

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
