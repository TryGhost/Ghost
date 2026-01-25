# Enable auto-instrumentation (this is the Node.js equivalent of opentelemetry-instrument)
export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"

# Service identification
export OTEL_SERVICE_NAME="ghost-cms"

# Exporters — enable all three signals
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"           # enables log collection where supported

# Protocol (http/protobuf is reliable and matches your Python example)
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_METRICS_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_LOGS_PROTOCOL="http/protobuf"

# Unified endpoint (most collectors accept this; signals go to /v1/traces, /v1/metrics, /v1/logs automatically)
export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
# export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"

# export OTEL_EXPORTER_OTLP_ENDPOINT="https://ingress.europe-west4.gcp.dash0.com"
# export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer auth_fwNcAwMoQAPd0OtewFfFmiWk8PpwhE7Y"


# Alternative: signal-specific endpoints if your collector requires separate paths
# export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://0.0.0.0:4318/v1/traces"
# export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="http://0.0.0.0:4318/v1/metrics"
# export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="http://0.0.0.0:4318/v1/logs"

# Optional tuning
# export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=development,service.version=local-dev"
# export OTEL_PROPAGATORS="tracecontext,baggage"
# export OTEL_LOG_LEVEL="info"                # or "debug" for troubleshooting exporter issues

# Optional: reduce noise or select instrumentations
# export OTEL_NODE_ENABLED_INSTRUMENTATIONS="http,express,knex,mysql2,undici"  # Ghost-relevant ones
# export OTEL_NODE_DISABLED_INSTRUMENTATIONS="fs,child_process,dns,pino"      # if noisy

yarn dev