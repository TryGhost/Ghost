# Ghost Core Dev Docker Image

Minimal Docker image for running Ghost Core in development with hot-reload support.

## Purpose

This lightweight image:
- Installs only Ghost Core dependencies
- Mounts source code from the host at runtime
- Enables `nodemon` for automatic restarts on file changes
- Works with the Caddy gateway to proxy frontend assets from host dev servers

## Key Differences from Main Dockerfile

**Main `Dockerfile`** (for E2E tests, full builds):
- Builds all frontend apps (Admin, Portal, AdminX apps, etc.)
- Bundles everything into the image
- ~15 build stages, 5-10 minute build time

**This `Dockerfile`** (for local development):
- Only installs dependencies
- No frontend builds or bundling
- Source code mounted at runtime 
- Used for: Local development with `yarn dev`

## Usage

This image is used automatically when running:

```bash
yarn dev              # Starts Docker backend + frontend dev servers on host
yarn dev:analytics    # Include Tinybird analytics
yarn dev:storage      # Include MinIO S3-compatible object storage
yarn dev:all          # Include all optional services
```
