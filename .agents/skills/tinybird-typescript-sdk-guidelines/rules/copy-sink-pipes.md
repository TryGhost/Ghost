# Copy Pipes and Sink Pipes

## Copy Pipes

Copy pipes execute SQL and write results to a datasource on a schedule or on-demand.

### Scheduled Copy Pipe

```typescript
import { defineCopyPipe, node } from "@tinybirdco/sdk";

export const dailySnapshot = defineCopyPipe("daily_snapshot", {
  description: "Daily snapshot of statistics",
  datasource: snapshotDatasource, // Target datasource
  schedule: "0 0 * * *", // Cron: daily at midnight
  mode: "append",
  nodes: [
    node({
      name: "snapshot",
      sql: `
        SELECT today() AS snapshot_date, pathname, count() AS views
        FROM page_views
        WHERE toDate(timestamp) = today() - 1
        GROUP BY pathname
      `,
    }),
  ],
});
```

### On-Demand Copy Pipe

```typescript
export const manualReport = defineCopyPipe("manual_report", {
  description: "On-demand report generation",
  datasource: reportDatasource,
  schedule: "@on-demand",
  mode: "replace",
  nodes: [
    node({
      name: "report",
      sql: `SELECT * FROM events WHERE timestamp >= now() - interval 7 day`,
    }),
  ],
});
```

### Copy Modes

| Mode | Description |
|------|-------------|
| `append` | Add rows to existing data (default) |
| `replace` | Replace all data in target datasource |

### Schedule Options

| Schedule | Description |
|----------|-------------|
| `"0 0 * * *"` | Cron expression (daily at midnight) |
| `"*/5 * * * *"` | Every 5 minutes |
| `"@on-demand"` | Manual trigger only |
| `"@once"` | Run once on deployment |

## Sink Pipes

Sink pipes publish query results to external systems (Kafka, S3).

### Kafka Sink

```typescript
import { defineSinkPipe, node } from "@tinybirdco/sdk";
import { eventsKafka } from "./connections";

export const kafkaEventsSink = defineSinkPipe("kafka_events_sink", {
  sink: {
    connection: eventsKafka,
    topic: "events_export",
    schedule: "@on-demand",
  },
  nodes: [
    node({
      name: "publish",
      sql: `SELECT timestamp, payload FROM kafka_events`,
    }),
  ],
});
```

### S3 Sink

```typescript
import { defineSinkPipe, node } from "@tinybirdco/sdk";
import { landingS3 } from "./connections";

export const s3EventsSink = defineSinkPipe("s3_events_sink", {
  sink: {
    connection: landingS3,
    bucketUri: "s3://my-bucket/exports/",
    fileTemplate: "events_{date}",
    format: "csv",
    schedule: "@once",
    strategy: "create_new",
    compression: "gzip",
  },
  nodes: [
    node({
      name: "export",
      sql: `SELECT timestamp, session_id FROM s3_landing`,
    }),
  ],
});
```

### S3 Sink Options

| Option | Description |
|--------|-------------|
| `bucketUri` | S3 bucket and path prefix |
| `fileTemplate` | Filename template (supports `{date}`, `{time}`) |
| `format` | Output format: `csv`, `json`, `parquet` |
| `schedule` | Cron expression or `@on-demand`, `@once` |
| `strategy` | `create_new` or `overwrite` |
| `compression` | `none`, `gzip`, `lz4` |
