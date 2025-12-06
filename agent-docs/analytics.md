# Analytics (Tinybird)

## Local Development

```bash
yarn dev:analytics             # Start Ghost with Tinybird + MySQL in Docker
```

Access Tinybird UI at http://localhost:7181 when enabled.

## Configuration

Add Tinybird config to `ghost/core/config.development.json`.

## File Locations

| Path | Purpose |
|------|---------|
| `ghost/core/core/server/data/tinybird/scripts/` | Tinybird scripts |
| `ghost/core/core/server/data/tinybird/` | Datafiles |
