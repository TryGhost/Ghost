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
2. ✅ Slice 2: real `source` theme renders imported content
   (home/post/page/tag/author) — `test/frontend/theme-rendering.test.ts`.
3. ✅ Slice 3: Admin/Content API compat facades at the legacy paths; native
   v10 API moved to /ghost/api/v10 — `src/modules/compat/compat.test.ts`.
4. ✅ Verified in a browser: the imported site renders with the real source
   theme, and the unified admin shell (Ember + React, `yarn admin:sync` →
   `content/admin/`, gitignored) signs in and renders posts AND the
   analytics Overview/Growth screens with designed empty states. The
   Members API facade answers portal (anonymous 204, magic-link 201).
   The editor saves posts/pages end-to-end (verified in browser: edit →
   Update → change visible on the public site). Known gaps: member
   sessions, tag/author assignment from the editor, Tinybird-backed web
   analytics (config.stats absent by design).

## Tests
- `yarn test` — 100 unit tests green; `yarn test:e2e` — 14 vendored Ghost
  e2e tests green (signin deep-links, posts list, full tags suites,
  public homepage) against a seeded phantom server, including `src/modules/operations/importer.test.ts`
  (real `test/fixtures/ghost-v5-export.json` fixture) and `src/db/ddl.test.ts`.

## Known gaps / next
- v1/v2 export formats untested; amp/comment_id field mapping absent.
- Newsletter `senderEmail` is now nullable (null = use default address);
  send-path resolution relies on contract validation upstream.
- posts_meta/offers/snippets tables not yet imported.
