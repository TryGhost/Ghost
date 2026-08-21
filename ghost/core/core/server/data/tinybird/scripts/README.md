# Ghost Analytics Scripts

Scripts for managing analytics data in the Docker development environment.

## Docker Analytics Manager

Generates and clears analytics events directly in the local Tinybird instance.

**Prerequisites:**
- Docker environment running: `pnpm dev:analytics`
- Ghost database populated: `pnpm reset:data`

**Usage:**
```bash
# Generate analytics events (default: 10,000)
pnpm data:analytics:generate

# Generate custom number of events
pnpm data:analytics:generate 5000

# Clear all analytics data
pnpm data:analytics:clear
```

## Typical Workflow

```bash
# 1. Start the Docker environment with analytics
pnpm dev:analytics

# 2. (Optional) Reset Ghost data if needed
pnpm docker:reset:data

# 3. Generate analytics data
pnpm data:analytics:generate

# 4. View analytics in Ghost admin
# http://localhost:2368/ghost/#/stats

# 5. Clear analytics when needed
pnpm data:analytics:clear
```

**Note:** Use `pnpm docker:reset:data` when the Docker environment is running.
Use `pnpm reset:data` when running Ghost locally without Docker.

## Automation Stats Benchmark

`benchmark-automation-stats.mjs` ingests 1 million runs and 5 million step IDs,
with pending and terminal versions for every step, then measures five warm queries.

```bash
TINYBIRD_ADMIN_TOKEN=... node ghost/core/core/server/data/tinybird/scripts/benchmark-automation-stats.mjs
```

Use `RUN_COUNT`, `STEP_COUNT`, `AUTOMATION_COUNT`, `BATCH_SIZE`, `ITERATIONS`,
`SITE_UUID`, and `TINYBIRD_HOST` to override defaults. Use a unique `SITE_UUID`
for each run because benchmark data is append-only.

## Configuration

### Database Connection

Connects to MySQL at `localhost:3306`. Override via environment variables:

- `MYSQL_HOST` (default: localhost)
- `MYSQL_PORT` (default: 3306)
- `MYSQL_USER` (default: root)
- `MYSQL_PASSWORD` (default: root)
- `MYSQL_DATABASE` (default: ghost_dev)

### Tinybird Connection

Reads tokens from Docker volume automatically. Override via:

- `TINYBIRD_ADMIN_TOKEN`
- `TINYBIRD_TRACKER_TOKEN`
- `TINYBIRD_HOST` (default: http://localhost:7181)

## Troubleshooting

**"Could not retrieve Tinybird token"** - Ensure analytics is running: `pnpm dev:analytics`

**"Database connection failed"** - Check MySQL is running: `docker ps | grep mysql`

**No posts/members found** - Generate Ghost data first: `pnpm reset:data`
