# Docker Development

## Hybrid Docker + Host Setup

The `yarn dev:forward` command uses a hybrid setup:

**What runs in Docker:**
- Ghost Core backend (with hot-reload via mounted source)
- MySQL, Redis, Mailpit
- Caddy gateway/reverse proxy

**What runs on host:**
- Frontend dev servers (Admin, Portal, Comments UI, etc.) in watch mode with HMR
- Foundation libraries (shade, admin-x-framework, etc.)

## Commands

```bash
yarn docker:build              # Build Docker images and delete ephemeral volumes
yarn docker:dev                # Start Ghost in Docker with hot reload
yarn docker:shell              # Open shell in Ghost container
yarn docker:mysql              # Open MySQL CLI
yarn docker:test:unit          # Run unit tests in Docker
yarn docker:reset              # Reset all Docker volumes (including database) and restart
```

## Starting Development

```bash
# Start everything (Docker + frontend dev servers)
yarn dev:forward

# With optional services (uses Docker Compose file composition)
yarn dev:analytics             # Include Tinybird analytics
yarn dev:storage               # Include MinIO S3-compatible object storage
yarn dev:all                   # Include all optional services
```

## Accessing Services

| Service | URL | Notes |
|---------|-----|-------|
| Ghost | http://localhost:2368 | Database: `ghost_dev` |
| Mailpit UI | http://localhost:8025 | Email testing |
| MySQL | localhost:3306 | |
| Redis | localhost:6379 | |
| Tinybird | http://localhost:7181 | When analytics enabled |
| MinIO Console | http://localhost:9001 | When storage enabled |
| MinIO S3 API | http://localhost:9000 | When storage enabled |

## Troubleshooting

```bash
yarn docker:clean && yarn docker:build   # Reset Docker state
```
