# Defining Datasources

## Basic Datasource Definition

```typescript
import { defineDatasource, t, engine, type InferRow } from "@tinybirdco/sdk";

export const pageViews = defineDatasource("page_views", {
  description: "Page view tracking data",
  schema: {
    timestamp: t.dateTime(),
    pathname: t.string(),
    session_id: t.string(),
    country: t.string().lowCardinality().nullable(),
  },
  engine: engine.mergeTree({
    sortingKey: ["pathname", "timestamp"],
  }),
});

export type PageViewsRow = InferRow<typeof pageViews>;
```

## Schema Types

The `t` object provides type definitions:

- `t.string()` - String type
- `t.int32()`, `t.int64()`, `t.uint32()`, `t.uint64()` - Integer types
- `t.float32()`, `t.float64()` - Float types
- `t.dateTime()` - DateTime type
- `t.date()` - Date type
- `t.boolean()` - Boolean type (stored as UInt8)

## Type Modifiers

Chain modifiers on types:

- `.nullable()` - Make column nullable
- `.lowCardinality()` - Use LowCardinality encoding for low-unique strings
- `.array()` - Array of the type

Example:
```typescript
schema: {
  tags: t.string().array(),
  country: t.string().lowCardinality().nullable(),
  score: t.float64().nullable(),
}
```

## Engine Configuration

```typescript
engine: engine.mergeTree({
  sortingKey: ["column1", "column2"],
  partitionKey: "toYYYYMM(timestamp)",  // optional
})
```

For aggregating materialized views:
```typescript
engine: engine.aggregatingMergeTree({
  sortingKey: ["date", "dimension"],
})
```

## Type Inference

Use `InferRow` to extract the TypeScript type from a datasource:

```typescript
export type PageViewsRow = InferRow<typeof pageViews>;
// Results in: { timestamp: Date; pathname: string; session_id: string; country: string | null }
```
