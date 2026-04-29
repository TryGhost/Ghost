# Defining Connections

Connections define external data sources that Tinybird can integrate with.

## Kafka Connection

```typescript
import { defineKafkaConnection, secret } from "@tinybirdco/sdk";

export const eventsKafka = defineKafkaConnection("events_kafka", {
  bootstrapServers: "kafka.example.com:9092",
  securityProtocol: "SASL_SSL",
  saslMechanism: "PLAIN",
  key: secret("KAFKA_KEY"),
  secret: secret("KAFKA_SECRET"),
});
```

## S3 Connection

```typescript
import { defineS3Connection } from "@tinybirdco/sdk";

export const landingS3 = defineS3Connection("landing_s3", {
  region: "us-east-1",
  arn: "arn:aws:iam::123456789012:role/tinybird-s3-access",
});
```

## GCS Connection

```typescript
import { defineGCSConnection, secret } from "@tinybirdco/sdk";

export const landingGCS = defineGCSConnection("landing_gcs", {
  serviceAccountCredentialsJson: secret("GCS_SERVICE_ACCOUNT_CREDENTIALS_JSON"),
});
```

## Using Secrets

The `secret()` function references secrets stored in Tinybird:

```typescript
import { secret } from "@tinybirdco/sdk";

// Reference a secret by name
const apiKey = secret("MY_API_KEY");
```

Secrets must be created in Tinybird before deploying connections that use them.

## Using Connections in Datasources

```typescript
import { defineDatasource, t, engine } from "@tinybirdco/sdk";
import { eventsKafka, landingS3, landingGCS } from "./connections";

// Kafka datasource
export const kafkaEvents = defineDatasource("kafka_events", {
  schema: {
    timestamp: t.dateTime(),
    payload: t.string(),
  },
  engine: engine.mergeTree({ sortingKey: ["timestamp"] }),
  kafka: {
    connection: eventsKafka,
    topic: "events",
    groupId: "events-consumer",
    autoOffsetReset: "earliest",
  },
});

// S3 datasource
export const s3Landing = defineDatasource("s3_landing", {
  schema: {
    timestamp: t.dateTime(),
    session_id: t.string(),
  },
  engine: engine.mergeTree({ sortingKey: ["timestamp"] }),
  s3: {
    connection: landingS3,
    bucketUri: "s3://my-bucket/events/*.csv",
    schedule: "@auto",
  },
});

// GCS datasource
export const gcsLanding = defineDatasource("gcs_landing", {
  schema: {
    timestamp: t.dateTime(),
    session_id: t.string(),
  },
  engine: engine.mergeTree({ sortingKey: ["timestamp"] }),
  gcs: {
    connection: landingGCS,
    bucketUri: "gs://my-gcs-bucket/events/*.csv",
    schedule: "@auto",
  },
});
```
