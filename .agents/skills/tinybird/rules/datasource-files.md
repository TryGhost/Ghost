# Datasource Files

- Content cannot be empty.
- Datasource names must be unique.
- No indentation for property names (DESCRIPTION, SCHEMA, ENGINE, etc.).
- Use MergeTree by default.
- Use AggregatingMergeTree for materialized targets.
- Always use JSON paths for schema (example: `user_id` String `json:$.user_id`).
- Array syntax: `items` Array(String) `json:$.items[:]`.
- DateTime64 requires precision (use DateTime64(3)).
- Only include ENGINE_PARTITION_KEY and ENGINE_PRIMARY_KEY when explicitly requested.
- Import configuration:
  - S3/GCS: set IMPORT_CONNECTION_NAME, IMPORT_BUCKET_URI, IMPORT_SCHEDULE (GCS supports @on-demand only, S3 supports @auto).
  - Kafka: set KAFKA_CONNECTION_NAME, KAFKA_TOPIC, KAFKA_GROUP_ID.
- For landing datasources created from a .ndjson file with no schema specified, use:
  - `SCHEMA >`
  - `` `data` String `json:$` ``

Example:

```
DESCRIPTION >
    Some meaningful description of the datasource

SCHEMA >
    `column_name_1` Type `json:$.column_name_1`,
    `column_name_2` Type `json:$.column_name_2`

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "partition_key"
ENGINE_SORTING_KEY "sorting_key_1, sorting_key_2"
```

## Updating Datasource Schemas (Cloud)

If a schema change is incompatible with the deployed Cloud datasource, add a FORWARD_QUERY to transform data to the new schema. The query is a SELECT list only (no FROM/WHERE). Use accurateCastOrDefault for lossy conversions.

Example:

```
FORWARD_QUERY >
    SELECT timestamp, CAST(session_id, 'UUID') as session_id, action, version, payload
```

## Sharing Datasources

```
SHARED_WITH >
    destination_workspace,
    other_destination_workspace
```

Limitations:
- Shared datasources are read-only.
- You cannot share a shared datasource.
- You cannot create a materialized view from a shared datasource.
