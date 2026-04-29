# Creating the Typed Client

## Client Setup

```typescript
// src/tinybird/client.ts
import { createTinybirdClient } from "@tinybirdco/sdk";
import { pageViews, type PageViewsRow } from "./datasources";
import { topPages, type TopPagesParams, type TopPagesOutput } from "./pipes";

export const tinybird = createTinybirdClient({
  datasources: { pageViews },
  pipes: { topPages },
});

export type { PageViewsRow, TopPagesParams, TopPagesOutput };
export { pageViews, topPages };
```

## Using the Typed Client

### Type-Safe Ingestion

```typescript
import { tinybird, type PageViewsRow } from "@tinybird/client";

// Autocomplete and type checking for all fields
await tinybird.ingest.pageViews({
  timestamp: new Date(),
  pathname: "/home",
  session_id: "abc123",
  country: "US",
});

// Batch ingestion
await tinybird.ingest.pageViews([
  { timestamp: new Date(), pathname: "/home", session_id: "abc", country: "US" },
  { timestamp: new Date(), pathname: "/about", session_id: "abc", country: "US" },
]);
```

### Type-Safe Queries

```typescript
import { tinybird } from "@tinybird/client";

// Autocomplete for parameters, typed results
const result = await tinybird.query.topPages({
  start_date: new Date("2024-01-01"),
  end_date: new Date(),
  limit: 5,
});

// result.data is fully typed: { pathname: string, views: bigint }[]
for (const row of result.data) {
  console.log(`${row.pathname}: ${row.views} views`);
}
```

## Client Benefits

- **Autocomplete**: Full IDE support for datasource fields and endpoint parameters
- **Type Safety**: Catch schema mismatches at compile time
- **Refactoring**: Rename fields and parameters with confidence
- **Documentation**: Types serve as inline documentation
