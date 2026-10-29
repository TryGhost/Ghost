# Ghost Core Dev Docker Image

Minimal Docker image for running Ghost Core in development with hot-reload support.

## Purpose

This lightweight image:

- Installs only Ghost Core dependencies
- Mounts source code from the host at runtime
- Enables `nodemon` for automatic restarts on file changes
- Works with the Caddy gateway to proxy frontend assets from host dev servers

## Key Differences from the Production Dockerfile

**[`Dockerfile.production`](../../Dockerfile.production)** (for E2E tests and published images):

- Builds Ghost Core and its workspace dependencies into a production-only app
- Builds no frontend apps; the `full` target copies in a prebuilt Admin and embed renderer
- Bakes everything into the image

**This `Dockerfile`** (for local development):

- Only installs dependencies
- No frontend builds or bundling
- Source code mounted at runtime
- Used for: Local development with `pnpm dev:docker`

## Usage

This image is used automatically when running:

```bash
pnpm dev:docker       # Starts Docker backend + React/shared/Portal watchers
```

`pnpm dev` and its variants run Ghost on the host instead.
