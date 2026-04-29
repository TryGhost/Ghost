# Defining Endpoints (Pipes)

## Basic Endpoint Definition

```typescript
import {
  defineEndpoint, node, t, p,
  type InferParams,
  type InferOutputRow
} from "@tinybirdco/sdk";

export const topPages = defineEndpoint("top_pages", {
  description: "Get the most visited pages",
  params: {
    start_date: p.dateTime(),
    end_date: p.dateTime(),
    limit: p.int32().optional(10),
  },
  nodes: [
    node({
      name: "aggregated",
      sql: `
        SELECT pathname, count() AS views
        FROM page_views
        WHERE timestamp >= {{DateTime(start_date)}}
        AND timestamp <= {{DateTime(end_date)}}
        GROUP BY pathname
        ORDER BY views DESC
        LIMIT {{Int32(limit, 10)}}
      `,
    }),
  ],
  output: {
    pathname: t.string(),
    views: t.uint64(),
  },
});

export type TopPagesParams = InferParams<typeof topPages>;
export type TopPagesOutput = InferOutputRow<typeof topPages>;
```

## Parameter Types

The `p` object provides parameter definitions:

- `p.string()` - String parameter
- `p.int32()`, `p.int64()` - Integer parameters
- `p.float32()`, `p.float64()` - Float parameters
- `p.dateTime()` - DateTime parameter
- `p.date()` - Date parameter

## Parameter Modifiers

- `.optional(defaultValue)` - Make parameter optional with a default value

Example:
```typescript
params: {
  limit: p.int32().optional(10),
  filter: p.string().optional(""),
}
```

## Multi-Node Pipes

Define multiple nodes for complex transformations:

```typescript
nodes: [
  node({
    name: "filtered",
    sql: `
      SELECT * FROM events
      WHERE timestamp >= {{DateTime(start_date)}}
    `,
  }),
  node({
    name: "aggregated",
    sql: `
      SELECT date, count() as total
      FROM filtered
      GROUP BY date
    `,
  }),
],
```

## SQL Templating

Use Tinybird templating in SQL:

- `{{Type(param_name)}}` - Parameter with type
- `{{Type(param_name, default)}}` - Parameter with default value

```sql
WHERE user_id = {{String(user_id)}}
AND date >= {{Date(start_date, '2024-01-01')}}
LIMIT {{Int32(limit, 100)}}
```

## Type Inference

```typescript
export type TopPagesParams = InferParams<typeof topPages>;
// Results in: { start_date: Date; end_date: Date; limit?: number }

export type TopPagesOutput = InferOutputRow<typeof topPages>;
// Results in: { pathname: string; views: bigint }
```
