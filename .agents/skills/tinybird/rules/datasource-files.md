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

## Updating Data Source Schemas (Cloud)

If a schema change is incompatible with the deployed Cloud Data Source, add a `FORWARD_QUERY` to transform existing data to the new schema. The query is a SELECT list only (no FROM/WHERE). It runs over existing data at read time until the next deploy compacts it.

### When to use `FORWARD_QUERY`

- Adding a new column that requires a default value for existing rows
- Changing a column type (e.g., String to UUID, Int32 to Int64)
- Renaming a column
- Removing a column (just omit it from the SELECT)

### Examples

Adding a new column with a default:

```
FORWARD_QUERY >
    SELECT *, 'unknown' as source
```

Changing a column type:

```
FORWARD_QUERY >
    SELECT timestamp, accurateCastOrDefault(session_id, 'UUID') as session_id, action, version, payload
```

Renaming a column:

```
FORWARD_QUERY >
    SELECT old_name as new_name, other_column
```

### After migration

Once the deploy applies the `FORWARD_QUERY` and the schema change is live, the `FORWARD_QUERY` has done its job. You can remove it from the datafile in a subsequent deploy if no further schema changes are pending. Keeping stale `FORWARD_QUERY` blocks around adds unnecessary complexity.

## TTL and Partition Key Alignment

Apply when a datasource sets both `ENGINE_TTL` and `ENGINE_PARTITION_KEY`: use a partition granularity equal to or finer than the TTL window (e.g. daily partitions for a TTL in days), so partitions expire and drop as whole units instead of ClickHouse rewriting them. A partition coarser than the TTL window (e.g. yearly partitions with a 65-day TTL) never fully expires, forcing constant rewrites instead of cheap drops.

```
# Bad: yearly partition, 65-day TTL — partition never fully expires
ENGINE_PARTITION_KEY "toYYYY(timestamp)"
ENGINE_TTL "toDateTime(timestamp) + toIntervalDay(65)"

# Good: daily partition matches the TTL window — old partitions drop whole
ENGINE_PARTITION_KEY "toDate(timestamp)"
ENGINE_TTL "toDate(timestamp) + toIntervalDay(65)"
ENGINE_SETTINGS "ttl_only_drop_parts=1"
```

When possible, set `ttl_only_drop_parts=1` in `ENGINE_SETTINGS` — it makes ClickHouse only drop whole expired parts instead of rewriting partially-expired ones, which is much cheaper.

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
