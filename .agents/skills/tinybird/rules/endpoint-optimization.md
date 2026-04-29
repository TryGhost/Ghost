# Endpoint Optimization

Use this checklist when optimizing endpoints.

## Gathering Runtime Data

Before optimizing, collect evidence from these sources:

- **Endpoint source code**: SQL, datasources, materialized views, and pipes in the workspace.
- **`pipe_stats_rt`**: Query `SELECT * FROM tinybird.pipe_stats_rt WHERE pipe_name = 'endpoint_name'` to check execution duration percentiles (p50, p90, p95, p99), read_bytes, rows_read, and error counts.
- **Query plan**: Call the endpoint with `?explain=true` (e.g., `https://$TB_HOST/v0/pipes/endpoint_name?explain=true`) to inspect join strategies, aggregation stages, index usage, and partition pruning.

Ignore datasources with fewer than 10,000 rows or less than 50 MB of data.

1) Aggregations at query time?
- Fix: Move to materialized views when possible, to snapshots (copy pipes) or lambda architecture if MVs do not fit.

## Structural Rules

Schema, query-shape, or data-layout issues. Apply whenever detected — no runtime evidence needed.

### Selecting unnecessary columns
- `SELECT *` or unused columns increase I/O, decompression cost, and cache pressure.
- Fix: Explicitly select only required columns.

### Oversized data types
- Larger types than necessary reduce compression and increase CPU/memory usage.
- Fix: Use smallest safe types. Use `LowCardinality` for low-unique strings, defaults instead of `Nullable`.

### Unnecessary Nullable columns
- `Nullable` adds overhead from null bitmaps and extra checks.
- Fix: Replace `Nullable(T)` with `T` when the column never contains nulls.

### Inefficient ORDER BY key ordering
- High-cardinality columns first in `ORDER BY` reduce sparse index effectiveness and data skipping.
- Fix: Start `ORDER BY` with low-cardinality and/or time columns. Avoid timestamp as first key in multi-tenant cases.

### Unnecessary casting
- Casting a column to its existing type wastes CPU and can block partition pruning.
- Fix: Remove redundant casts; fix types at ingestion time if needed.

### Excessive string materialization
- Materializing full `String` values when only metadata is needed wastes memory and CPU.
- Fix: Extract required string properties at ingestion time into typed columns.

### Filter before join/aggregation
- Applying filters after joins or aggregations increases input size and cost.
- Fix: Push filters as early as possible in the query pipeline.

## Runtime-Dependent Rules

Apply only when runtime thresholds are exceeded, based on `pipe_stats_rt` and `EXPLAIN` data.

### Aggregations at query time
- **When**: p95 > 5s, or aggregation dominates `EXPLAIN`, or memory > 60%, or OOM/timeout errors.
- Fix: Precompute via materialized view.

### JOINs at query time
- **When**: p95 > 5s, or join dominates `EXPLAIN`, or memory spikes, or OOM/timeout errors.
- Fix: Move join to ingestion time via materialized view, or denormalize.

### Incorrect or missing sorting keys
- **When**: reads > 10% of granules, and p95 > 3s or rows_read/rows_returned > 100x.
- Fix: Rebuild datasource with `ORDER BY` aligned to selective filters.

### PREWHERE for early filtering
- **When**: rows_read/rows_returned > 50x, or p95 > 3s, or `EXPLAIN` shows late filtering.
- Fix: Push selective filters into `PREWHERE`.

### Data skipping indexes
- **When**: filters on non-primary-key columns, and rows_read/rows_returned > 100x, or p95 > 3s.
- Fix: Add appropriate skip indexes and validate with `EXPLAIN`.

### Large GROUP BY at query time
- **When**: p95 > 5s, or aggregation memory > 50%, or OOM/timeout errors.
- Fix: Pre-aggregate at ingestion time using materialized view.

### Regex at query time
- **When**: p95 > 3s, or CPU > 70%.
- Fix: Move regex logic to ingestion time.

### Unbounded history without TTL
- **When**: p95 increases week-over-week, or rows_read grows for identical queries.
- Fix: Create a TTL-backed datasource via materialized view.

### Misaligned or missing partition pruning
- **When**: >20% of partitions scanned, or p95 > 3s, or `EXPLAIN` shows ineffective pruning.
- Fix: Recreate datasource with an aligned partitioning key. Include partition key column in query filters.

### ORDER BY with LIMIT without pushdown
- **When**: rows sorted >> LIMIT (>100x), or p95 > 3s.
- Fix: Restructure query or pre-materialize top-k at ingestion time.

### DISTINCT instead of GROUP BY
- **When**: p95 > 5s, or memory > 50%.
- Fix: Replace with ingestion-time aggregation or `GROUP BY`.

### Overuse of FINAL
- **When**: p95 > 3s, or rows_read >> rows_returned.
- Fix: Remove `FINAL` by enforcing correctness at ingestion time (lambda architecture).

### Expensive JSON extraction at query time
- **When**: p95 > 3s, or CPU > 70%.
- Fix: Extract JSON fields into typed columns at ingestion time.

### Large IN lists
- **When**: p95 > 3s, or query planning time is high.
- Fix: Replace with lookup datasource or ingestion-time materialization.

### Approximate uniques
- **When**: exact `COUNT(DISTINCT)` with p95 > 5s, or memory > 50%, or OOM errors.
- Fix: Use `uniqHLL12` or similar approximate functions when acceptable.

## Monitoring and Validation

- Track `tinybird.pipe_stats_rt` and `tinybird.pipe_stats`.
- Success metrics: lower latency, lower read_bytes, improved read_bytes/write_bytes ratio.
- If for any reason these two datasources don't contain the needed information, check `system.query_log`

## Query Explain

- For more details, call the endpoint with explain=true parameter to understand the query plan. E.g: https://$TB_HOST/v0/pipes/endpoint_name?explain=true

## Templates

Materialized view:
```
NODE materialized_view_name
SQL >
  SELECT toDate(timestamp) as date, customer_id, countState(*) as event_count
  FROM source_table
  GROUP BY date, customer_id

TYPE materialized
DATASOURCE mv_datasource_name
ENGINE "AggregatingMergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(date)"
ENGINE_SORTING_KEY "customer_id, date"
```

Optimized query:
```
NODE endpoint_query
SQL >
  %
  SELECT date, sum(amount) as daily_total
  FROM events
  WHERE customer_id = {{ String(customer_id) }}
    AND date >= {{ Date(start_date) }}
    AND date <= {{ Date(end_date) }}
  GROUP BY date
  ORDER BY date DESC
```
