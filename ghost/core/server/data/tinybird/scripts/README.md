# Ghost Analytics Scripts

Scripts for managing analytics data in the local development environment.

## Docker Analytics Manager

Generates and clears analytics events directly in the local Tinybird instance.

**Prerequisites:**

- Analytics running: `pnpm dev:analytics`
- Ghost database populated: `pnpm reset:data`

**Usage:**

```bash
# Generate analytics events (default: 10,000)
pnpm data:analytics:generate

# Generate custom number of events
pnpm data:analytics:generate 5000

# Clear this site's analytics data
pnpm data:analytics:clear
```

## Typical Workflow

```bash
# 1. Start Ghost with analytics
pnpm dev:analytics

# 2. (Optional) Reset Ghost data if needed
pnpm reset:data

# 3. Generate analytics data
pnpm data:analytics:generate

# 4. View analytics in Ghost admin (a worktree uses the port in .ghost-dev.env)
# http://localhost:2368/ghost/#/analytics

# 5. Clear analytics when needed
pnpm data:analytics:clear
```

**Note:** `pnpm reset:data` runs inside the `ghost-dev` container, so the Docker environment must be running.

## Configuration

### Database Connection

The `pnpm` scripts run through `scripts/with-ghost-dev-env.ts`, so they use the
same database as the checkout's `pnpm dev`: `ghost_dev` in the main checkout and
`dev_<worktree>` in a linked worktree. Override via environment variables:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### Tinybird Connection

Reads tokens from Docker volume automatically. Override via:

- `TINYBIRD_ADMIN_TOKEN`
- `TINYBIRD_TRACKER_TOKEN`
- `TINYBIRD_HOST` (default: http://localhost:7181)

Every checkout shares one Tinybird Local instance. Generated events carry the
checkout's `site_uuid`, and `pnpm data:analytics:clear` deletes only that
site's rows.

## Troubleshooting

**"Could not retrieve Tinybird token"** - Ensure analytics is running: `pnpm dev:analytics`

**"Database connection failed"** - Check MySQL is running: `docker ps | grep mysql`

**No posts/members found** - Generate Ghost data first: `pnpm reset:data`
