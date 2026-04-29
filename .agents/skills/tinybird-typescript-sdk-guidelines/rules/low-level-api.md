# Public Tinybird API (Low-Level)

For cases requiring a decoupled API wrapper without the typed client:

## Creating the API Client

```typescript
import { createTinybirdApi } from "@tinybirdco/sdk";

const api = createTinybirdApi({
  baseUrl: "https://api.tinybird.co",
  token: process.env.TINYBIRD_TOKEN!,
});
```

## Querying Endpoints

```typescript
interface TopPagesRow { pathname: string; visits: number }
interface TopPagesParams { start_date: string; end_date: string; limit?: number }

const topPages = await api.query<TopPagesRow, TopPagesParams>("top_pages", {
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  limit: 5,
});

// topPages.data is typed as TopPagesRow[]
```

## Ingesting Data

```typescript
interface EventRow { timestamp: Date; event_name: string; pathname: string }

await api.ingest<EventRow>("events", {
  timestamp: new Date(),
  event_name: "page_view",
  pathname: "/home",
});

// Batch ingestion
await api.ingest<EventRow>("events", [
  { timestamp: new Date(), event_name: "page_view", pathname: "/home" },
  { timestamp: new Date(), event_name: "click", pathname: "/home" },
]);
```

## Executing Raw SQL

```typescript
interface CountResult { total: number }

const sqlResult = await api.sql<CountResult>(
  "SELECT count() AS total FROM events"
);

// sqlResult.data[0].total
```

## Per-Request Token Override

```typescript
await api.request("/v1/workspace", {
  token: process.env.TINYBIRD_BRANCH_TOKEN,
});
```

## When to Use Low-Level API

- Existing projects not using TypeScript definitions
- Dynamic endpoint names or parameters
- Direct SQL execution needs
- Gradual migration from other HTTP clients
