# Ghost Agent Guide

## Package Manager
Use `yarn` (v1).

## Architecture
- Hono for HTTP routing and middleware.
- Drizzle ORM with libSQL/Turso for the database.
- Zod for request/response contracts.
- Keep dependencies minimal and avoid bespoke frameworks.

## Naming
- Use Ghost naming in code, APIs, and identifiers (avoid "Phantom").

## Code Organization
- Colocate Zod contracts, handlers, services, repos, events, and tests within
  each module.
- Colocate Drizzle schemas inside each module and re-export from
  `src/db/schema/index.ts`.

## Testing
- Use Vitest.
- Unit tests are colocated as `*.test.ts` files next to source.
- Integration and e2e tests can live in top-level `integration/` or other dedicated folders.
