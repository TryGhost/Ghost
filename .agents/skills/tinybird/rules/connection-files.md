# Connection Files

- Content cannot be empty.
- Connection names must be unique.
- No indentation for property names.
- Supported types: kafka, gcs, s3.
- If user requests an unsupported type, report it and do not create it.

Kafka example:
```
TYPE kafka
KAFKA_BOOTSTRAP_SERVERS {{ tb_secret("PRODUCTION_KAFKA_SERVERS", "localhost:9092") }}
KAFKA_SECURITY_PROTOCOL SASL_SSL
KAFKA_SASL_MECHANISM PLAIN
KAFKA_KEY {{ tb_secret("PRODUCTION_KAFKA_USERNAME", "") }}
KAFKA_SECRET {{ tb_secret("PRODUCTION_KAFKA_PASSWORD", "") }}
```

S3 example:
```
TYPE s3
S3_REGION {{ tb_secret("PRODUCTION_S3_REGION", "") }}
S3_ARN {{ tb_secret("PRODUCTION_S3_ARN", "") }}
```

GCS service account example:
```
TYPE gcs
GCS_SERVICE_ACCOUNT_CREDENTIALS_JSON {{ tb_secret("PRODUCTION_GCS_SERVICE_ACCOUNT_CREDENTIALS_JSON", "") }}
```

GCS HMAC example:
```
TYPE gcs
GCS_HMAC_ACCESS_ID {{ tb_secret("gcs_hmac_access_id") }}
GCS_HMAC_SECRET {{ tb_secret("gcs_hmac_secret") }}
```
