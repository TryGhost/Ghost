# Status

## Summary
- Module architecture on Hono + `@hono/zod-openapi`; Drizzle + libSQL.
- Real Ghost v5 export import works end-to-end: `createGhostImporter`
  (`src/modules/operations/importer.ts`) converts posts (mobiledoc/html-only →
  lexical html card), tags, authors+staff/roles, newsletters/issues/
  memberships, products→plans/prices, settings and custom theme settings,
  atomically and idempotently. Wired into `POST /ghost/api/operations/import`
  and the `yarn migrate:core --input <export.json>` CLI.
- `src/db/ddl.ts` generates CREATE TABLE + additive column reconciliation from
  the drizzle schema index; bootstrap runs it at startup. Nullability changes
  still need the real migrations system (open checklist item).

## Current focus (active goal)
1. ✅ Slice 1: fixture-backed Ghost export importer.
2. ⏳ Slice 2: Handlebars theme rendering parity (real theme through the
   frontend router).
3. ⏳ Slice 3: Admin/Content API compat facades so existing Ghost apps run
   unmodified.
4. ⏳ Verify admin + portal in a browser against phantom.

## Tests
- `yarn test` — 51 tests green, including `src/modules/operations/importer.test.ts`
  (real `test/fixtures/ghost-v5-export.json` fixture) and `src/db/ddl.test.ts`.

## Known gaps / next
- v1/v2 export formats untested; amp/comment_id field mapping absent.
- Newsletter `senderEmail` is now nullable (null = use default address);
  send-path resolution relies on contract validation upstream.
- posts_meta/offers/snippets tables not yet imported.
