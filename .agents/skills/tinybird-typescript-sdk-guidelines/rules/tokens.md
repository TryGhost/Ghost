# Tokens

## Static Tokens

Define named tokens and attach them to datasources and endpoints:

```typescript
import { defineToken, defineDatasource, defineEndpoint, t, node } from "@tinybirdco/sdk";

// Define tokens
const appToken = defineToken("app_read");
const ingestToken = defineToken("ingest_token");

// Attach to datasource
export const events = defineDatasource("events", {
  schema: {
    timestamp: t.dateTime(),
    event_name: t.string(),
  },
  tokens: [
    { token: appToken, scope: "READ" },
    { token: ingestToken, scope: "APPEND" },
  ],
});

// Attach to endpoint
export const topEvents = defineEndpoint("top_events", {
  nodes: [node({ name: "endpoint", sql: "SELECT * FROM events LIMIT 10" })],
  output: { timestamp: t.dateTime(), event_name: t.string() },
  tokens: [{ token: appToken, scope: "READ" }],
});
```

### Token Scopes

| Resource | Available Scopes |
|----------|-----------------|
| Datasources | `READ`, `APPEND` |
| Pipes/Endpoints | `READ` |

## JWT Token Creation

Create short-lived JWT tokens for secure scoped access. Useful for:
- Frontend applications calling Tinybird APIs directly
- Multi-tenant applications with row-level security
- Time-limited access with automatic expiration

```typescript
import { createClient } from "@tinybirdco/sdk";

const client = createClient({
  baseUrl: "https://api.tinybird.co",
  token: process.env.TINYBIRD_ADMIN_TOKEN!, // Requires ADMIN scope
});

const { token } = await client.tokens.createJWT({
  name: "user_123_session",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  scopes: [
    {
      type: "PIPES:READ",
      resource: "user_dashboard",
      fixed_params: { user_id: 123 },
    },
  ],
  limits: { rps: 10 },
});

// Use the JWT for client-side queries
const userClient = createClient({
  baseUrl: "https://api.tinybird.co",
  token, // The JWT
});
```

### JWT Scope Types

| Scope | Description |
|-------|-------------|
| `PIPES:READ` | Read access to a specific pipe endpoint |
| `DATASOURCES:READ` | Read access to a datasource |
| `DATASOURCES:APPEND` | Append access to a datasource |

### JWT Scope Options

| Option | Description |
|--------|-------------|
| `resource` | Name of the pipe or datasource |
| `fixed_params` | Parameters embedded in token (cannot be overridden) |
| `filter` | SQL WHERE clause for datasource filtering |

### Example: Multi-Tenant Access

```typescript
const orgToken = await client.tokens.createJWT({
  name: "org_acme_access",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
  scopes: [
    {
      type: "DATASOURCES:READ",
      resource: "events",
      filter: "org_id = 'acme'",
    },
    {
      type: "PIPES:READ",
      resource: "analytics_dashboard",
      fixed_params: { org_id: "acme" },
    },
  ],
  limits: { rps: 100 },
});
```

### JWT Limits

| Option | Description |
|--------|-------------|
| `rps` | Requests per second limit |
