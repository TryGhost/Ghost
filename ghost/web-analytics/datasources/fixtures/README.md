# Datasource fixtures

## NDJSON files
These files are fixtures used for running tests

## Schema JSON files
The file mockingbird-schema.json is a schema for generating fake data using the Mockingbird CLI.

The CLI is installed via npm:

```
npm install -g @tinybirdco/mockingbird-cli
```

The command I'm currently using to generate the data is:

```
mockingbird-cli tinybird --schema ghost/web-analytics/datasources/fixtures/mockingbird-schema.json --endpoint gcp_europe_west3 --token xxxx --datasource analytics_events --eps 50 --limit 5000
```
