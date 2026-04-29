# Append Data

Tinybird CLI supports three ways to append data to an existing datasource: local file, remote URL, or events payload.

## CLI: tb datasource append

```
tb datasource append [datasource_name] --file /path/to/local/file
```

```
tb datasource append [datasource_name] --url https://example.com/data.csv
```

```
tb datasource append [datasource_name] --events '{"a":"b", "c":"d"}'
```

Notes:
- The command appends to an existing datasource.
- Use `tb --cloud datasource append` to target Cloud; Local is the default.
- For ingesting data from Kafka, S3 or GCS, see: https://www.tinybird.co/docs/forward/get-data-in/connectors

You can also send POST request to v0/events (streaming) and v0/datasources (batch) endpoints.
