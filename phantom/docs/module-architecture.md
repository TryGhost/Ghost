# Ghost v10 Module Architecture

System-level architecture (runtime, database, queues, central services,
compat facades, themes) lives in `architecture.md` in this directory;
binding design rulings in `decisions.md`.

## Module paradigm (A + B)
- Each module encapsulates its domain model and application logic.
- Routes are thin: validate input, call service, map to response DTOs.
- Domain and API contracts are decoupled so API shape can evolve separately.

## Module layout
- `db.ts`: Drizzle schema and record types.
- `model.ts`: Domain types and invariants. Mandatory in every module
  (decisions.md ruling 5); current source only has it in `site` and
  `identity` — the remaining modules are standing debt.
- `repo.ts`: Data access and persistence.
- `service.ts`: Application use-cases and orchestration.
- `contracts.ts`: Zod request/response schemas and DTOs.
- `routes.ts`: Hono routes with typed RPC (`@hono/zod-openapi`).
- `*.test.ts`: Unit tests colocated with module code.

## API contracts
- Requests and responses have distinct schemas, even when identical.
- `routes.ts` uses Zod schemas for validation and for typed RPC responses.
- Mapping functions or local serializers keep API DTOs stable across domain
  changes.

## Simplicity rules
- Avoid extra layers unless a module grows significantly.
- `model.ts` is not an extra layer: it is mandatory in every module, and
  domain invariants live there — not in `service.ts`.
- No shared base classes; prefer simple helpers.
- Add `jobs.ts` and `events.ts` only when used.
