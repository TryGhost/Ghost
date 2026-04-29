# Deduplication and Lambda Architecture

Strategies for handling duplicates and combining batch with real-time processing.

## Deduplication Strategy Selection

| Strategy | When to use |
|----------|-------------|
| Query-time (`argMax`, `LIMIT BY`, subquery) | Prototyping or small datasets |
| ReplacingMergeTree | Large datasets, need latest row per key |
| Periodic snapshots (Copy Pipes) | Freshness not critical, need rollups or different sorting keys |
| Lambda architecture | Need freshness + complex transformations that MVs can't handle |

For dimensional/small tables, periodic full replace is usually best.

## Query-time Deduplication

```sql
-- argMax: get latest value per key
SELECT post_id, argMax(views, updated_at) as views
FROM posts GROUP BY post_id

-- LIMIT BY
SELECT * FROM posts ORDER BY updated_at DESC LIMIT 1 BY post_id

-- Subquery
SELECT * FROM posts WHERE (post_id, updated_at) IN (
    SELECT post_id, max(updated_at) FROM posts GROUP BY post_id
)
```

## ReplacingMergeTree

```
ENGINE "ReplacingMergeTree"
ENGINE_SORTING_KEY "unique_id"
ENGINE_VER "updated_at"
ENGINE_IS_DELETED "is_deleted"  -- optional, UInt8: 1=deleted, 0=active
```

- Always query with `FINAL` or use alternative deduplication method
- Deduplication happens during merges (asynchronous, uncontrollable)
- **Do not** build AggregatingMergeTree MVs on top of ReplacingMergeTree—MVs only see incoming blocks, not merged state, so duplicates persist

```sql
SELECT * FROM posts FINAL WHERE post_id = {{Int64(post_id)}}
```

## Snapshot-based Deduplication (Copy Pipes)

Use Copy Pipes when:
- ReplacingMergeTree + FINAL is too slow
- You need different sorting keys that change with updates
- You need downstream Materialized Views for rollups
- The default `copy_mode` is `append`.
- Use `COPY_MODE replace` for full refreshes when the table is not massive and you don't control when duplicates can occur.
- Keep `COPY_MODE append` (default) when you do control duplicate generation and can process incrementally.

```
NODE generate_snapshot
SQL >
    SELECT post_id, argMax(views, updated_at) as views, max(updated_at) as updated_at
    FROM posts_raw
    GROUP BY post_id

TYPE COPY
TARGET_DATASOURCE posts_snapshot
COPY_SCHEDULE 0 * * * *
COPY_MODE replace
```

## Lambda Architecture

Combine batch snapshots with real-time queries when:
- Aggregating over ReplacingMergeTree (MVs fail—they only see blocks, not merged state)
- Window functions requiring full table scans
- CDC workloads
- `uniqState` performance is problematic
- endpoints that require JOINs at query time

### Pattern

1. **Batch layer**: Copy Pipe creates periodic deduplicated snapshots or intermediate tables.
2. **Real-time layer**: Query fresh data since last snapshot  
3. **Serving layer**: UNION ALL combines both

```sql
SELECT * FROM posts_snapshot
UNION ALL
SELECT post_id, argMax(views, updated_at) as views, max(updated_at) as updated_at
FROM posts_raw
WHERE updated_at > (SELECT max(updated_at) FROM posts_snapshot)
GROUP BY post_id
```

### Freshness vs Cost Trade-off

- More frequent Copy Pipe runs = fresher snapshots but higher cost
- Less frequent = stale batch layer but real-time layer covers the gap
- Balance based on query patterns and data volume

## argMax with Null Values

**Warning**: `argMaxMerge` prefers non-null values over null, even with lower timestamps.

Workaround—convert nulls to epoch before aggregation:
```sql
SELECT post_id,
    argMaxState(CASE WHEN flagged_at IS NULL THEN toDateTime('1970-01-01 00:00:00') ELSE flagged_at END, updated_at) as flagged_at
FROM posts
GROUP BY post_id
```

Handle the sentinel value in downstream queries.
