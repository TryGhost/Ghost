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

## Usual gotchas
- Materialized Views work as insert triggers, which means a delete or truncate operation on your original Data Source doesn't affect the related Materialized Views.

- As transformation and ingestion in the Materialized View is done on each block of inserted data in the original Data Source, some operations such as GROUP BY, ORDER BY, DISTINCT and LIMIT might need a specific engine, such as AggregatingMergeTree or SummingMergeTree, which can handle data aggregations.

- The Data Source resulting from a Materialized View generated using JOIN is automatically updated only if and when a new operation is performed over the Data Source in the FROM.