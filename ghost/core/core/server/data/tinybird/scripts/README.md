# Ghost Analytics Scripts

Scripts for managing analytics data in the Docker development environment.

## Docker Analytics Manager

Generates and clears analytics events directly in the local Tinybird instance.

**Prerequisites:**
- Docker environment running: `yarn dev:analytics`
- Ghost database populated: `yarn reset:data`

**Usage:**
```bash
# Generate analytics events (default: 10,000)
yarn data:analytics:generate

# Generate custom number of events
yarn data:analytics:generate 5000

# Clear all analytics data
yarn data:analytics:clear
```

## Typical Workflow

```bash
# 1. Start the Docker environment with analytics
yarn dev:analytics

# 2. (Optional) Reset Ghost data if needed
yarn docker:reset:data

# 3. Generate analytics data
yarn data:analytics:generate

# 4. View analytics in Ghost admin
# http://localhost:2368/ghost/#/stats

# 5. Clear analytics when needed
yarn data:analytics:clear
```

**Note:** Use `yarn docker:reset:data` when the Docker environment is running.
Use `yarn reset:data` when running Ghost locally without Docker.

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

**"Could not retrieve Tinybird token"** - Ensure analytics is running: `yarn dev:analytics`

**"Database connection failed"** - Check MySQL is running: `docker ps | grep mysql`

**No posts/members found** - Generate Ghost data first: `yarn reset:data`
