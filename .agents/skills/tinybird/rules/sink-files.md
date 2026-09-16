# Sink Pipe Files

- Do not create by default unless requested.
- Create under `/sinks`.
- Valid external systems: Kafka, S3, GCS.
- Sink pipes depend on a connection; reuse existing connections when possible.
- Do not include EXPORT_SCHEDULE unless explicitly requested.
- Use TYPE SINK and set EXPORT_CONNECTION_NAME.

Example:

```
DESCRIPTION Sink Pipe to export sales hour every hour using my_connection

NODE daily_sales
SQL >
    %
    SELECT toStartOfDay(starting_date) day, country, sum(sales) as total_sales
    FROM teams
    WHERE day BETWEEN toStartOfDay(now()) - interval 1 day AND toStartOfDay(now())
    and country = {{ String(country, 'US')}}
    GROUP BY day, country

TYPE sink
EXPORT_CONNECTION_NAME "my_connection"
EXPORT_BUCKET_URI "s3://tinybird-sinks"
EXPORT_FILE_TEMPLATE "daily_prices"
EXPORT_SCHEDULE "*/5 * * * *"
EXPORT_FORMAT "csv"
EXPORT_COMPRESSION "gz"
EXPORT_STRATEGY "truncate"
```
