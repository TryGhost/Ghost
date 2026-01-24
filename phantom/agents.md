# Ghost Agent Guide

## Package Manager
Use `yarn` (v1).

## Architecture
- Hono for HTTP routing and middleware.
- Drizzle ORM with libSQL/Turso for the database.
- Zod for request/response contracts and `@hono/zod-openapi` for typed RPC.
- Keep dependencies minimal and avoid bespoke frameworks.

## Naming
- Use Ghost naming in code, APIs, and identifiers (avoid "Phantom").

## Code Organization
- Module files are grouped by domain with concise filenames:
  `db.ts`, `model.ts`, `repo.ts`, `service.ts`, `contracts.ts`, `routes.ts`.
- Routes stay thin and map domain types to API DTOs defined in contracts.
- Colocate Drizzle schemas inside each module and re-export from
  `src/db/schema/index.ts`.

## Current Progress
- Site module scaffold (CRUD-lite) with typed RPC routes.
- Identity module scaffold (staff auth + sessions) with rate limiting.
- PRD checklist tracked in `docs/prd-checklist.md`.

## Testing
- Use Vitest.
- Unit tests are colocated as `*.test.ts` files next to source.
- Integration and e2e tests can live in top-level `integration/` or other dedicated folders.
