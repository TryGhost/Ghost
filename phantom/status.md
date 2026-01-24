# Status

## Summary
- Established module architecture using Hono + `@hono/zod-openapi` typed RPC.
- Implemented Site and Identity scaffolds with domain-first modules and thin routes.
- Added PRD checklist and architecture conventions.

## Implemented
- Site module: `db.ts`, `repo.ts`, `service.ts`, `contracts.ts`, `routes.ts`.
- Identity module: staff login, session issuance, rate limiting.
- Shared: error handling, password hashing, rate limiter, DB client.

## PRD Progress
- Staff login with rate limiting checked off in `docs/prd-checklist.md`.

## Tests
- Unit tests in `src/modules/site/site.service.test.ts` and `src/modules/identity/service.test.ts`.
- App smoke tests in `test/app.test.ts`.
- Latest run failed because `vitest` is not installed yet.
  - Run `yarn --cwd phantom install` then `yarn --cwd phantom test`.

## Next Focus
- Continue Identity & Access (sessions enforcement, reset tokens, invitations).
- Add explicit domain → API DTO mappers.
