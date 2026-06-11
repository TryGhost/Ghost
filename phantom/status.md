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
- `yarn test` — 112 unit tests green; `yarn test:e2e` — 130 vendored Ghost
  e2e tests green across four playwright projects (main + billing +
  force-upgrade host-settings servers). Suites: signin/deep links, sidebar
  navigation + theme errors, posts list/editor/publish/preview/custom
  views, full tags incl. pagination, members directory (list/filter/
  export/bulk/saved views/virtual window), settings search, private mode,
  announcement bar, what's new, onboarding, hosted billing, member
  magic-link signup, staff password reset, public homepage.
- Mail: in-memory MailProvider + Mailpit-compatible /__mail__ sink (e2e
  mode); magic-link and password-reset emails flow through it.

## Known gaps / next (e2e goal: all upstream suites green)
- 2FA suite: run in its own playwright project/server (like billing) with
  a GHOST_STAFF_DEVICE_VERIFICATION env. Design: staff_sessions gains
  verifiedAt; login with verification on creates an UNVERIFIED session
  cookie + emails a 6-digit code (code in the subject) + 403
  {code: '2FA_TOKEN_REQUIRED', type: 'Needs2FAError'}; getStaffBySession
  rejects unverified sessions; PUT /session/verify {token} marks the
  cookie session verified (201); POST /session/verify resends ('OK' text).
  Sessions created with verification off get verifiedAt=createdAt.
- welcome emails + posts publishing/newsletter-send: newsletter delivery
  pipeline (publish+send → batches → mail sink); staff invites are done.
- members/import (CSV upload), tier-filter-search (tier creation),
  design (external Unsplash), publication-language (email i18n),
  integrations(-host-settings), danger-zone/transistor (labs flags).
- Analytics suites (8): need native traffic stats (Tinybird pipes facade
  over the local analytics event store) — task #18.
- Stripe suites (16): vendor /e2e fake-stripe-server; billing module per
  PRD section 4.
- Comments suites: comments module + comments-ui serving + member
  impersonation.
- v1/v2 export formats untested; posts_meta/offers/snippets not imported.
