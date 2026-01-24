# Ghost Rewrite Architecture

## Module paradigm (A + B)
- Each module encapsulates its domain model and application logic.
- Routes are thin: validate input, call service, map to response DTOs.
- Domain and API contracts are decoupled so API shape can evolve separately.

## Module layout
- `db.ts`: Drizzle schema and record types.
- `model.ts`: Domain types and invariants.
- `repo.ts`: Data access and persistence.
- `service.ts`: Application use-cases and orchestration.
- `contracts.ts`: Zod request/response schemas and DTOs.
- `routes.ts`: Hono routes with typed RPC (`@hono/zod-openapi`).
- `*.test.ts`: Unit tests colocated with module code.

## API contracts
- Requests and responses have distinct schemas, even when identical.
- `routes.ts` uses Zod schemas for validation and for typed RPC responses.
- Mapping functions keep API DTOs stable across domain changes.

## Simplicity rules
- Avoid extra layers unless a module grows significantly.
- No shared base classes; prefer simple helpers.
- Add `jobs.ts` and `events.ts` only when used.
