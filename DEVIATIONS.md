# Ember → React Migration: Deviations & Issues Log

Running log of intentional deviations from the stated plan, discovered constraints,
and issues worth reviewing at the end. Newest entries at the bottom of each section.

## Plan & sequencing

- **Slice order chosen:** tag detail/new → posts/pages list → member detail/new +
  members-activity → auth flows → editor → long-tail (restore/explore/migrate/pro/site/home).
  Rationale: smallest contained slice first to establish the flag + shared-E2E pipeline;
  the editor (1,632-line Ember controller) last, once patterns are proven.
- **Dashboard and home are not ports.** `/dashboard` is a hard redirect to `/analytics`
  (already React) and `/` is role-based redirect logic only. They will be handled as part
  of the long-tail slice as routing logic, not screens.

## Architectural notes (facts that shaped decisions)

- The React shell (`apps/admin`) already owns routing and chrome; Ember screens render
  through `EmberFallback`/`EmberRoot` DOM swapping. "Gating Ember rendering" is therefore
  implemented React-side: a flag-aware route component renders the React screen when the
  labs flag is on and `EmberFallback` when off.
- E2E fixture already supports `test.use({labs: {flag: true}})` (settings API + reload),
  which is the mechanism used to run the same Playwright suites against both implementations.

## Deviations

### Slice 1: Tag detail/new

- **No Unsplash integration in the React tag image uploads.** The Ember
  `GhImageUploaderWithPreview` offers Unsplash search; the React implementation
  uses plain file upload for tag/X/Facebook images. Can be added when a shared
  Shade image-upload pattern exists.
- **Code injection fields are plain textareas** (mono font) instead of the
  CodeMirror editor Ember uses. Shade has no code-editor component yet and
  pulling in admin-x-design-system's CodeEditor would contradict the
  "phase out admin-x-design-system" direction.
- **Ember route handover:** when `tagDetailsX` is on, the Ember tag route
  short-circuits in `beforeModel` and hands the URL to the `react-fallback`
  catch-all, so the hidden Ember app loads no data and registers no transition
  guards (an earlier version left the Ember route active, and its
  unsaved-changes guard fought React's navigation after deletes).
- **Ember store sync:** added `TagsResponseType: {type: 'tag'}` to the state
  bridge's `emberDataTypeMapping`. Tag mutations use `updateQueries`
  (pushPayload/unloadRecord on the Ember side) rather than `invalidateQueries` —
  invalidation would `store.unloadAll('tag')`, stripping tag records out of any
  loaded posts' embedded tag relationships (post save could then drop tags).
- **Post-review fixes from /code-review + Codex pass:** re-entrant submit guard
  (Ember had a drop-concurrency save task; cmd+S key-repeat could create
  duplicate tags), server validation messages surfaced in the error toast
  (was a generic message), `@tryghost/string` slugify (transliteration parity:
  'Новости' → 'novosti'; the hand-rolled version produced empty slugs for
  non-Latin names), bare-hex accent color normalization on blur, leading-comma
  name validation, `useConfirmUnload` for browser-unload parity, no
  `allowInForceUpgrade` on the React tag routes (force-upgraded sites must not
  be able to edit tags), 404 only when no data exists (transient refetch errors
  no longer unmount the form and discard edits), scoped `useWatch` so
  code-injection keystrokes don't re-render the whole accordion, and the Ember
  e2e wrapper pins `tagDetailsX: false` so a future flag GA fails loudly
  instead of silently dropping Ember coverage.
- **Known accepted gaps:** image uploads have no Unsplash and no drag-and-drop
  (Ember had both; a shared Dropzone-based RHF field is the right follow-up —
  apps/posts header-image-field.tsx is the precedent); if another screen ever
  adopts Shade's `Sidebar`, the hardcoded "Main navigation" aria-label needs to
  move to the consumer; a labs-flag flip while a user has unsaved edits on the
  screen swaps implementations without an unsaved-changes prompt (rare admin
  action, silent edit loss accepted); the unsaved-changes blocker+dialog and
  the Ember route handover should be extracted into shared helpers when slice 2
  adds their second consumers.

### Slice 2: Posts/pages list

- **The Ember posts/pages routes are NOT gated to react-fallback while
  `postsListX` is on** (unlike the tag route in slice 1). The tag route needed
  gating because its unsaved-changes transition guard fought React's
  navigation; the posts/pages routes have no such guards — the hidden Ember
  app just wastefully loads its infinity models. Gating them would require
  carrying query params through the react-fallback wildcard (they'd be
  URL-encoded into the path), so the tradeoff is background fetch waste over
  URL fragility. Removed at flag GA when the Ember routes are deleted.
- **Force-upgrade:** /posts and /pages no longer carry `allowInForceUpgrade`
  (same reasoning as the tag routes in slice 1).

### Slice 3: Member detail + members-activity

- **Force-upgrade:** /members/new, /members/:id and /members-activity no longer
  carry `allowInForceUpgrade` (consistent with slices 1–2: the React shell
  redirects to /pro, which is where Ember's own lockout landed anyway).
- **Events cursor skips same-second tails** when a 50-event page ends mid-second
  (`data.created_at:<cursor` is second-precision and strict) — identical
  semantics to Ember's fetcher, so kept as-is.
- **Email events in activity feeds render the subject as text**, not Ember's
  clickable email-preview link — the preview modal is an editor-domain
  component; revisit in the editor slice.
- **Flag flips while a member form is dirty** swap implementations without an
  unsaved-changes prompt (same accepted limitation as slices 1–2).
- **Ember gating split:** the member route is gated via react-fallback handover
  (it registers unsaved-changes guards), which drops the `postAnalytics`/
  `backPath` query params on full-page loads — the analytics breadcrumb
  degrades to the plain Members backlink in that edge. members-activity is
  gated at the template level instead (no guards there, and the handover would
  strip the `member`/`excludedEvents` query params the screen depends on).

### Slice 4: Auth flows — BetterAuth decision (IMPORTANT, deliberate deviation)

The plan asked for BetterAuth for authentication/session management. After a
sourced feasibility assessment (Ghost auth internals + BetterAuth docs/issues),
**the React auth screens call Ghost's existing session/authentication endpoints
instead**, for these reasons:

- Ghost's admin session cookie is the API credential for every admin endpoint,
  the comments auth-frame and the Ghost(Pro) SSO adapter. BetterAuth issues its
  own session in its own table — every consumer would need a second
  authenticator, or a hook would have to hand-mint express-session rows
  (re-implementing express-session internals).
- Ghost's 2FA is per-session device verification (code challenge stored in the
  session row, `require_email_mfa`, skip-on-first-login). BetterAuth's
  twoFactor plugin is per-user TOTP with 30-day device cookies — replicating
  Ghost's semantics means writing a custom plugin that duplicates Ghost's
  logic inside BetterAuth.
- ghost/core is CommonJS; BetterAuth is ESM-only with documented CJS breakage.
- Signup-by-invite, setup and password reset (3 of 6 screens) are not
  BetterAuth concepts and would call Ghost endpoints regardless.
- Estimated 4–8 weeks of backend work with real security-regression surface,
  versus 1.5–3 weeks for the screens with zero backend risk — and the React
  screens are a prerequisite for any later BetterAuth adoption anyway.

This is *not* "rolling something bespoke": the session system remains Ghost's
existing server implementation; the React screens are thin clients to it.
A full BetterAuth adoption is feasible as a separate platform project (custom
knex adapter, bcrypt verify plug-in, custom 2FA plugin, legacy-session bridge)
— the research notes live in the slice-4 research output if wanted.

Also: auth screens render pre-authentication, where the labs `/config`
endpoint isn't available — the flag gate for auth screens needs a pre-auth
flag source (see implementation notes).

### Upstream issues discovered during slice-2 review (pre-existing, NOT introduced here)

- **Server-side bulk-action authorization gap:** `DELETE /ghost/api/admin/posts/?filter=...`
  and `PUT /posts/bulk/` authorize the method without resolving per-post ownership,
  so an Author could bulk-affect posts they don't own by calling the API directly
  (both the Ember and React UIs hide bulk actions from authors, but that's
  client-side only). Needs a core fix; out of scope for the UI migration.
- **Stats batch endpoints (`/stats/posts-visitor-counts`, `/stats/posts-member-counts`)
  only require `posts: browse`**, so non-admin staff can fetch counts for posts
  they don't own. Pre-existing; the React list mirrors the Ember admin's usage.
- **`shared_views` writes are last-write-wins** from both Ember and React (full
  JSON snapshot rewrite). Concurrent edits from two tabs can drop a view; same
  behavior as Ember-only before the migration.

## Infra fixes made along the way

- **Local dev-mode e2e Ghost boots exceed the 30s default test timeout** on this
  machine (per-file environments boot a fresh Ghost container, including a pnpm
  install check). Local runs use `pnpm test ... --timeout=240000`; CI build-mode
  images boot fast and are unaffected.
- **The local `ghost-dev-ghost-dev` Docker image bakes `pnpm-workspace.yaml` at
  build time.** Adding new `catalog:` deps (react-hook-form, @hookform/resolvers
  for the tag form) broke container boots until `pnpm docker:build` was re-run
  (the running ghost-dev container was hot-patched with `docker cp` meanwhile).

- **E2E dev mode was broken on main (pnpm 11 workspace validation).** The e2e Ghost
  worker container only mounted `ghost/`, but `ghost/admin` has `workspace:*` deps on
  `apps/*`; pnpm 11 fails install when those packages are missing. `compose.dev.yaml`
  already carried the fix (mount `apps/`) for the `ghost-dev` container; applied the
  same bind in `e2e/helpers/environment/service-managers/ghost-manager.ts`.

## Open issues / risks

- **BetterAuth (slice 4):** Ghost core implements bespoke session auth
  (`/ghost/api/admin/session`, 2FA via signin-verify). No better-auth usage exists anywhere
  in the monorepo today. Feasibility of adopting BetterAuth server-side without breaking
  every existing API client needs assessment when the slice starts; findings will be
  logged here.
