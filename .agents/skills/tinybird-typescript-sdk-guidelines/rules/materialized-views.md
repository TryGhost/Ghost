# Materialized Views

Materialized views automatically aggregate data as it arrives, enabling real-time analytics.

## Basic Materialized View

A materialized view consists of:
1. A target datasource with aggregate columns
2. A materialized view definition that populates it

```typescript
import { defineDatasource, defineMaterializedView, t, engine, node } from "@tinybirdco/sdk";

// Target datasource with aggregate columns
export const dailyStats = defineDatasource("daily_stats", {
  description: "Daily aggregated statistics",
  schema: {
    date: t.date(),
    pathname: t.string(),
    views: t.simpleAggregateFunction("sum", t.uint64()),
    unique_sessions: t.aggregateFunction("uniq", t.string()),
  },
  engine: engine.aggregatingMergeTree({
    sortingKey: ["date", "pathname"],
  }),
});

// Materialized view that populates it
export const dailyStatsMv = defineMaterializedView("daily_stats_mv", {
  description: "Materialize daily page view aggregations",
  datasource: dailyStats,
  nodes: [
    node({
      name: "aggregate",
      sql: `
        SELECT
          toDate(timestamp) AS date,
          pathname,
          count() AS views,
          uniqState(session_id) AS unique_sessions
        FROM page_views
        GROUP BY date, pathname
      `,
    }),
  ],
});
```

## Aggregate Types

### SimpleAggregateFunction

For simple aggregations (sum, min, max, any):

```typescript
views: t.simpleAggregateFunction("sum", t.uint64()),
minValue: t.simpleAggregateFunction("min", t.float64()),
maxValue: t.simpleAggregateFunction("max", t.float64()),
```

### AggregateFunction

For complex aggregations (uniq, quantile, etc.):

```typescript
uniqueUsers: t.aggregateFunction("uniq", t.string()),
p95Latency: t.aggregateFunction("quantile(0.95)", t.float64()),
```

## SQL State Functions

In materialized view SQL, use state functions to prepare aggregates:

| Final Function | State Function |
|----------------|----------------|
| `count()` | `count()` (no state needed for SimpleAggregateFunction) |
| `sum(col)` | `sum(col)` (no state needed) |
| `uniq(col)` | `uniqState(col)` |
| `quantile(0.95)(col)` | `quantileState(0.95)(col)` |
| `avg(col)` | `avgState(col)` |

## Querying Materialized Views

When querying, use merge functions for AggregateFunction columns:

```typescript
const endpoint = defineEndpoint("daily_stats_query", {
  nodes: [
    node({
      name: "query",
      sql: `
        SELECT
          date,
          pathname,
          sum(views) AS total_views,
          uniqMerge(unique_sessions) AS unique_sessions
        FROM daily_stats
        GROUP BY date, pathname
      `,
    }),
  ],
  output: {
    date: t.date(),
    pathname: t.string(),
    total_views: t.uint64(),
    unique_sessions: t.uint64(),
  },
});
```

## Engine Selection

Always use `aggregatingMergeTree` for materialized view targets:

```typescript
engine.aggregatingMergeTree({
  sortingKey: ["date", "dimension1", "dimension2"],
});
```
