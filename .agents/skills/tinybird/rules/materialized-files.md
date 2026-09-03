# Materialized Pipe Files

- Do not create by default unless requested.
- Create under `/materializations`.
- Use TYPE MATERIALIZED and set DATASOURCE to the target datasource.
- Use State modifiers in the pipe; use AggregateFunction in the target datasource.
- Use Merge modifiers when reading AggregateFunction columns.
- Put all dimensions in ENGINE_SORTING_KEY, ordered from least to most cardinality.

Example:

```
NODE daily_sales
SQL >
    SELECT toStartOfDay(starting_date) day, country, sumState(sales) as total_sales
    FROM teams
    GROUP BY day, country

TYPE MATERIALIZED
DATASOURCE sales_by_hour
```

Target datasource example:

```
SCHEMA >
    `total_sales` AggregateFunction(sum, Float64),
    `sales_count` AggregateFunction(count, UInt64),
    `dimension_1` String,
    `dimension_2` String,
    `date` DateTime

ENGINE "AggregatingMergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(date)"
ENGINE_SORTING_KEY "date, dimension_1, dimension_2"
```

## JSON extraction: parse once, not once per field

- **When to apply**: the query calls `JSONExtractString`/`JSONExtractInt`/`JSONExtractBool`/`JSONExtractFloat`/`simpleJSONExtractString`/`visitParam*` multiple times against the same JSON/string column — one call per field. Each call re-parses the raw JSON from scratch, so N fields means N full parses per row. This is most costly in materialized views, since it runs on every inserted block for the pipe's lifetime.
- **How to apply**: parse the JSON once into a typed `Tuple` with `JSONExtract(...)`, then read each field from it with `getSubcolumn`.

Bad (one parse per field):

```
NODE typed_events
SQL >
    SELECT
        at AS timestamp,
        visitParamExtractString(payload, 'field_a') AS field_a,
        visitParamExtractInt(payload, 'field_b') AS field_b,
        visitParamExtractBool(payload, 'field_c') AS field_c,
        simpleJSONExtractString(payload, 'field_d') AS field_d
    FROM raw_events

TYPE MATERIALIZED
DATASOURCE typed_events_ds
```

Good (one parse total):

```
NODE typed_events
SQL >
    WITH
        JSONExtract(payload, 'Tuple(
            field_a String,
            field_b Int64,
            field_c Bool,
            field_d String
        )') AS payload_json
    SELECT
        at AS timestamp,
        getSubcolumn(payload_json, 'field_a') AS field_a,
        getSubcolumn(payload_json, 'field_b') AS field_b,
        getSubcolumn(payload_json, 'field_c') AS field_c,
        getSubcolumn(payload_json, 'field_d') AS field_d
    FROM raw_events

TYPE MATERIALIZED
DATASOURCE typed_events_ds
```

- Missing fields default to their type's default value.
- Reuse a field via a `WITH` alias if multiple derived expressions depend on it.

## Usual gotchas

- Materialized Views work as insert triggers, which means a delete or truncate operation on your original Data Source doesn't affect the related Materialized Views.

- As transformation and ingestion in the Materialized View is done on each block of inserted data in the original Data Source, some operations such as GROUP BY, ORDER BY, DISTINCT and LIMIT might need a specific engine, such as AggregatingMergeTree or SummingMergeTree, which can handle data aggregations.

- The Data Source resulting from a Materialized View generated using JOIN is automatically updated only if and when a new operation is performed over the Data Source in the FROM.
