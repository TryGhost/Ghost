---
name: launch-app
description: Launch Ghost locally for runtime validation and testing.
---

# Launch App

Use the standard local development environment for Ghost.

1. Ensure dependencies and submodules are available:
   `corepack enable pnpm && pnpm run setup`
2. Start the app stack from the repo root:
   `pnpm dev`
3. Wait for Ghost to respond at:
   - `http://localhost:2368`
   - Admin: `http://localhost:2368/ghost/`
4. Optional local services commonly used during validation:
   - Mailpit UI: `http://localhost:8025`
   - MySQL: `localhost:3306`
   - Redis: `localhost:6379`
5. Use the default `pnpm dev` flow unless the ticket explicitly requires a variant such as `pnpm dev:analytics`, `pnpm dev:storage`, or `pnpm dev:all`.

For runtime validation, prefer checking the changed flow in the running app rather than only relying on unit tests.
