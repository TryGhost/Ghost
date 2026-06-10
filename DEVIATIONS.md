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
- **Code injection fields use admin-x-design-system's `CodeEditor`** (CodeMirror
  with HTML syntax highlighting; the language pack is lazy-imported the same
  way admin-x-settings' code-injection modal does it, and `CodeEditor` itself
  is React.lazy so CodeMirror stays out of the main bundle). RESOLVED — this
  originally shipped as plain mono textareas to avoid pulling in
  admin-x-design-system (the "phase out" direction), but that stance was
  reversed on review feedback: reuse existing AdminX components for gaps Shade
  doesn't cover yet, rather than shipping degraded UI. apps/posts now depends
  on `@tryghost/admin-x-design-system` + `@codemirror/lang-html`; the section
  labels and `expand-code-injection` testid are unchanged.
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

#### Slice 4 implementation notes (React auth screens behind `authX`)

- **Pre-auth flag distribution:** `authX` is added to the public site payload
  (`public-config/site.js` + the site output serializer), so it's also visible
  on the members `/api/site` endpoint (same controller/serializer). Ember's
  `config-manager.fetchUnauthenticated` copies it onto `config`, which the
  `@feature` decorator prefers — one flag serves both shells.
- **Post-auth bootstrap is a full page reload in place** (`window.location.reload()`
  on the auth screen): the hidden Ember app must boot authenticated for the
  remaining Ember screens (editor). The signin deep link
  (`ghost-signin-redirect`) is deliberately NOT consumed before the reload —
  after boot, the auth gate's `AuthenticatedRedirect` reads it once into
  state, clears it, and navigates with `window.location.replace('#/<target>')`.
  Two hard-won constraints baked into that design: (a) the target must be
  captured once — query refetches re-render the gate after the key is cleared,
  and re-reading would bounce home instead of to the deep link; (b) the
  redirect must be a real location hash change, not a React Router
  `<Navigate>` — router pushState fires no hashchange, so the parked Ember
  app would never wake for Ember-owned targets and the content area stays
  empty. Signout likewise DELETEs the session then reloads to `#/signin`.
- **UX deviations from Ember (deliberate):**
  - Signup prefills the invite email (decoded from the token) as a read-only
    field; Ember left it blank so Chrome would remember the email/password
    combo.
  - Reset/signup API errors render in the on-screen flow notification instead
    of Ember's floating alert notifications. The "you're already signed in"
    warn alerts on signup/reset are replaced by a plain redirect to `/` (same
    destination, no alert).
  - The reset screen drops the legacy `emailVerificationToken` re-auth branch:
    current core always mints a verified session in the reset response.
  - The signin button keeps its "Sign in →" label on failure (Ember's task
    button flips to "Retry"); e2e relies on the flow notification, not the
    label.
  - `/signout` is treated as an auth path by the redirect guard and is never
    stored as (or redirected back to) a signin deep link; Ember could store
    `/signout` as a redirect target.
  - Invalid or expired invite links render an explanation on the signup
    screen (with a signin link) instead of Ember's redirect-to-signin with a
    floating alert; the redirect looked like a silent failure to invitees.
- **Ember-side gating:** templates of signin/signin-verify/signup/reset/setup
  are wrapped in `{{#unless this.feature.authX}}`; the signup model hook,
  setup `beforeModel` and signout `afterModel` early-return when the flag is
  on (skips duplicate API checks and a racing double session-invalidate).
  Both shared route bases park the hidden Ember app when the flag is on:
  `AuthenticatedRoute.beforeModel` aborts signed-out transitions (its
  `replaceLocation` fallback would wipe the deep-link URL before React stores
  it), and `UnauthenticatedRoute.beforeModel` aborts as well — its
  `prohibitAuthentication('home')` ran in the hidden app after the post-signin
  reload and rewrote the shared URL, clobbering React's deep-link redirect.

### Slice 5: Editor (core screen)

- **Fullscreen via portal, not an app.tsx layout branch.** The React editor
  renders through `createPortal(document.body)` with `absolute inset-0 z-20`
  (the same pattern the settings route uses) instead of adding a fullscreen
  branch around `AdminLayout`. This keeps the flag-off path byte-identical:
  `EmberFallback`/`EmberRoot` stay mounted inside `AdminLayout`, so the hidden
  Ember app's DOM is never moved when entering/leaving `/editor/*`.
- **New-post URL swap bypasses the router.** After the first save creates the
  draft, the screen rewrites the hash to `#/editor/post/:id` with
  `history.replaceState` (no hashchange/popstate fires), so the route component
  never remounts — mirrors Ember's `replaceWith` new→edit transition. The
  router's internal location stays `/editor/post` until the next navigation;
  acceptable because the leave guard only compares pathnames.
- **Mobiledoc→lexical conversion ported** (PUT with `?convert_to_lexical=1`,
  minimal `{updated_at}` body); `useEditEditorPost` gained an optional
  `convertToLexical` payload flag. The conversion promise is cached per
  `id:updated_at` so StrictMode double-mounts don't fire a second PUT with a
  stale `updated_at` (which would 409).
- **Slug regeneration on title change uses a simple slugify heuristic** to
  decide whether the current slug is still title-derived (Ember compares with
  its slugify util); the actual slug value always comes from the `/slugs/` API.
- **Tags are not sent in save payloads yet** (the machine models tag names, but
  the editor UI can't edit tags until the settings-menu slice); omitting them
  from the PUT body leaves them untouched server-side. RESOLVED — the settings
  menu edits tags and every save body now carries the name-only tag relation.
- **Koenig ESM bundle doesn't inject its stylesheet** (the UMD bundle Ember
  loads does). Added a vite alias (`koenig-lexical-styles.css` →
  `dist/style.css`, which the package's exports map doesn't expose) and load it
  alongside the dynamic module import.
- **Publish/update/preview flows, settings menu and permission gates landed in
  follow-up passes within the slice** (publish-options ported as a pure module;
  settings menu is an inline non-modal panel like Ember's PSM, not a Radix
  Sheet — a modal sheet intercepted clicks on the editor header; contributor/
  author access gates ported from Ember's edit route).
- **Cross-shell navigations from the editor use real location hash changes**
  (`crossShellNavigate`, the editor backlink is a native hash anchor): router
  pushState fires no hashchange, so a parked flag-off Ember list would never
  wake after publish-complete/delete/back navigations (same mechanism as the
  auth slice's post-signin redirect).
- **Publish complete step is the posts/pages list share modal**, not an
  in-editor modal step: the flow writes Ember's `ghost-last-published/
  scheduled-post` localStorage keys and leaves; the list's success share modal
  (shade `PostShareModal`, which now carries the shared e2e test hooks) is the
  complete UI for both shells.
- **Review-pass fixes (multi-angle + Codex):** failed publish/schedule saves
  disarm the willPublish/willSchedule intent; the save queue carries full
  intent ({kind, saveType, publishedAt}) so a queued publish stays a publish;
  scratch resync after a save no longer clobbers slug/date/image edits made
  mid-flight; per-request email extras; slug-generation races guarded by a
  token; slug blur commits scratch before the async sanitize (leave-guard
  hole); DST-gap conversions are verified fixpoints and impossible calendar
  dates rejected; `page` added to the Ember-bridge type mapping; excerpt ≤300
  validated before the publish flow opens.
- **Force-upgrade:** /editor/* no longer carries `allowInForceUpgrade` (it did
  implicitly as part of the EMBER_ROUTES wildcard). Consistent with the
  documented slice 1–3 decision: the React shell redirects to /pro, which is
  where Ember's lockout landed anyway.
- **Known accepted gaps (documented, deliberate):** word count + TK counts,
  snippets, unsplash/tenor/pintura card integrations, post-history modal,
  email host-limit checks and post-send failure polling, Cmd+P/Cmd+Shift+P
  shortcuts, the analytics breadcrumb (`fromAnalytics` — back link always
  targets the list), Ember's secondary-editor conflict detection (the 409
  UpdateCollisionError toast covers the multi-tab case, without Ember's diff
  modal), and 409 recovery is a toast (no conflict-resolution modal).
- **PSM completion pass:** access/visibility (+tier multiselect), authors,
  template, featured + show-title-and-feature-image toggles, and the meta
  data / X card / Facebook card / code injection subviews are ported. All
  fields flow through the editor machine: PSM settings live in one
  `PostSettings` record (`settingsScratch` + `SETTINGS_CHANGED`), with
  per-field dirty detection and post-save resync mirroring the
  slug/date/image fields. Deviations from Ember:
  - Subviews are collapsible sections (shade `Accordion`) in the same
    column, not Ember's slide-in wide sub-panes (same approved pattern as
    the tag detail screen). Ember's `data-test-button` testids kept.
  - No SERP / X / Facebook previews inside the subviews (Ember renders
    live previews); character countdowns and placeholder fallback chains
    are ported.
  - Social image uploads are plain file uploads (no Unsplash), consistent
    with the slice-1 feature-image deviation.
  - Switching access to "Specific tiers" defers the save until at least
    one tier is picked (Ember relies on client validation to block the
    save); the Ember validator message is shown inline.
  - The "theme doesn't support show title and feature image" warning is
    not ported (needs gscan warnings via themeManagement).
  - Email-only has no PSM toggle in Ember either (publish-flow concern) —
    matched by omission.
  - Code injection reuses admin-x-design-system's `CodeEditor` with the
    lazy `@codemirror/lang-html` import (same approved pattern as
    apps/posts tag details); apps/admin now depends on
    `@tryghost/admin-x-design-system` + `@codemirror/lang-html`.
  - `Theme.templates` in admin-x-framework was typed `string[]` but the
    API returns gscan custom-template objects; fixed to `ThemeTemplate[]`
    ({filename, name, for, slug}).
- **Local revisions (localStorage crash recovery) deferred to slice 6**: the
  `/restore` screen is part of the long-tail slice and is the consumer of that
  data; porting the localRevisions store belongs with it.
- **Preview modal Email tab ported (follow-up; gap RESOLVED).** Web/Email
  format tabs with Ember's gates (posts only, `members_enabled`,
  `editor_default_email_recipients !== 'disabled'`, non-contributors) and
  Ember's shared e2e hooks (`data-test-button="browser-preview"/"email-preview"`).
  The Email pane (`apps/admin/src/editor/publish/email-preview.tsx`) renders
  the same Admin API endpoint Ember uses via a new framework hook
  (`getPostEmailPreview` in `admin-x-framework/api/email-previews`) in a
  sandboxed iframe with Ember's scrollbar-CSS injection, a From/Subject mockup
  header (sender-address rules ported from Ember's `sender-email-address`
  helper using the framework's managed-email config helpers), a newsletter
  selector (>1 active newsletter) and a member-segment picker (email: free/
  paid; web also gets Ember's "Public visitor", now wired to `member_status`).
  Still not ported from Ember's email preview: the send-test-email dropdown,
  the editable subject line, and the email-size clip warning.

### Slice 6: Pure redirects (`/`, `/dashboard`) + dead-route cleanup

- **No labs flag (deliberate).** `/` and `/dashboard` are deterministic
  redirects with no UI of their own — there is no screen to A/B between
  shells, and a flag would only add a dead code path. React owns them
  unconditionally: `/` via `HomeRedirect`
  (`apps/admin/src/home-redirect.tsx`, role redirect + `?firstStart=true`
  onboarding entry ported from `ghost/admin/app/routes/home.js`) and
  `/dashboard` via a plain `loader: () => redirect("/analytics")` (Ember's
  dashboard route redirected everyone unconditionally).
- **Ember home route is now an inert parking spot, not a handover.** A
  `replaceWith('react-fallback', '')` handover is impossible (route-recognizer
  rejects an empty wildcard param), and aborting would strand Ember's internal
  `transitionTo('home')` guards (permission checks, `routeAfterAuthentication`,
  `prohibitAuthentication`). Since `home` already owns the `/` URL, the route
  body was simply emptied: internal transitions land there, render nothing,
  and React reacts to the URL change and performs the redirect. The
  authenticated-route check is kept (signed-out visits to `/` still rewrite
  the URL to signin, which the React shell relies on). Ember's `/dashboard`
  does use the standard `replaceWith('react-fallback', 'dashboard')` handover.
  Ember acceptance tests that asserted post-signin/post-guard destinations
  (`/analytics`, `/site`, `/posts`) now assert the park on `/` instead; the
  role matrix is covered by `home-redirect.test.tsx` and the redirects e2e
  suite.
- **`Navigate replace` instead of Ember's pushed `transitionTo`** for the role
  redirects from `/` — Ember left a `/` history entry that immediately
  re-redirected forward (back button trap); replace matches the codebase's
  other redirect components.
- **Dead routes removed from `EMBER_ROUTES`:** `/launch` (router.js entry but
  no route file, template, controller or inbound link anywhere — the router.js
  entry was removed too), `/mentions` and `/posts/analytics/:postId/mentions`
  (no router.js entries, no route files, no inbound links from either shell;
  only leftover `mentions.css` styles remain in ghost/admin). These URLs now
  fall through to the React 404 screen.

### Slice 6: Restore screen + local revisions crash-recovery store (`restoreX`)

- **Shared localStorage schema (deliberate, load-bearing).** The React store
  (`apps/admin/src/editor/local-revisions.ts`, framework-free) writes the exact
  Ember schema (`post-revision-{id}-{timestamp}` keys, serialized post JSON
  with `id`/`type`/`revisionTimestamp`, 1-minute keepLatest throttle, quota
  eviction, newest-5-per-post filter) so revisions written by either shell are
  restorable from either. The React editor schedules saves from
  `updateTitle`/`updateLexical` in `use-editor.ts` (hook-level, mirrors Ember's
  `updateScratch`/`updateTitleScratch` call sites; the editor machine doesn't
  know about it). Revisions are built from the current scratches, so a React
  revision's title/lexical are both current (Ember serialized last-saved
  attributes and only overrode the field being edited).
- **Restore navigates to the editor.** Ember's `restore()` only `console.log`s
  the new draft's editor URL and shows a success notification; the React
  screen opens the draft via a real hash navigation (`crossShellNavigate`), so
  whichever shell owns `/editor` wakes up. The shared e2e suite branches on
  this (`restoreOpensEditor`); both runs also assert the draft exists in the
  posts list.
- **Pre-existing Ember bug (not fixed here):** `localRevisions.restore()`
  swallows all errors (`console.warn`) and the controller shows "Post restored
  successfully" even when nothing was created — e.g. a revision without
  authors serializes `authors: []`, which the posts API rejects ("At least one
  author is required"). The React screen surfaces a "Failed to restore post"
  error instead. The e2e suite seeds revisions with a real author id so both
  implementations actually create the draft.
- **Restore resolves the resource from `revision.type`** (`pages` vs `posts`
  endpoint). Ember always created a `post` model and passed `type` as an
  attribute, relying on the API ignoring it; the React port posts pages to the
  pages endpoint.

### Slice 7: Post email debug screen (`postDebugX`) — last Ember-owned screen

- **React screen lives in `apps/posts`** (`src/views/PostAnalytics/Debug/`,
  exported as `@tryghost/posts/post-debug`) and is mounted by `apps/admin`'s
  router at `/posts/analytics/:postId/debug` via `FlagGatedRoute`
  (`apps/admin/src/post-debug-route.tsx`). The entry was removed from
  `EMBER_ROUTES`. Ember hands the URL to `react-fallback` from
  `routes/posts/debug.js#beforeModel` when `feature.postDebugX` is on.
- **Framework hooks added** (`apps/admin-x-framework/src/api/emails.ts`):
  `getEmail`, `getEmailBatches`, `getEmailRecipientFailures`,
  `getEmailAnalyticsStatus` (queries), `useScheduleEmailAnalytics` (PUT) and
  `useCancelScheduledEmailAnalytics` (DELETE). The analytics-status dataType is
  mapped to `null` in `state-bridge.js` (read-mostly; mutation only refetches
  the React-side status query, nothing to sync to Ember).
- **Data mapping is a pure module** (`debug-data.ts`) ported 1:1 from the Ember
  component's computed properties (status labels, initials, batch/failure rows,
  email settings, analytics status, custom-schedule defaults). Timestamps are
  formatted with a local `formatTimestamp` (no moment dependency) matching
  Ember's `DD MMM, YYYY, HH:mm:ss[.SSS]`. Presentational `debug-tabs.tsx` is a
  dumb render so both files are unit-testable without network mocks.
- **Polling preserved:** the email record (10s) and analytics status (5s) poll
  via react-query `refetchInterval`, mirroring Ember's ember-concurrency loops.
- **e2e skipped (deliberate):** the screen only renders meaningfully for a
  post with a sent newsletter `email` (+ batches/recipient-failures). No e2e
  data-factory produces a sent email — `PostFactory` sets `newsletter_id`/
  `email_recipient_filter` but never creates the `emails` row, and a real send
  needs the Mailgun batch pipeline. Per the task guidance, not feasible simply,
  so no dual suite was added. Unit coverage: `debug-data.test.ts` (mapping) and
  `debug-tabs.test.tsx` (tab render / empty states / schedule controls).

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

## Final state (end-of-migration summary, 2026-06-11)

- **Every functional admin screen is React-owned behind a labs flag:**
  tagDetailsX, postsListX, memberDetailsX, authX, editorX, restoreX,
  embedScreensX, postDebugX. `/` and `/dashboard` are unflagged pure
  redirects. The only remaining `EMBER_ROUTES` entry is `/designsandbox`,
  deliberately unported: it is a developer-only showcase OF Ember design
  components and dies with the Ember app (the React equivalent is shade's
  storybook).
- **The shared dual-flag e2e suites cover every flagged screen** (auth,
  editor, publishing, publish-flow, post-preview, post-updates, tags,
  posts/pages list, members, restore, site, redirects) using one set of
  page objects. Full admin suite at the end of the migration: 352 passed.
- **Stale BetterAuth note above is superseded** by the slice-4 decision
  section: the assessment happened, the deviation is documented there.
- **Post-review hardening from the final-slice review pass** (multi-angle
  + Codex): migrate iframe replies deferred until the API key is loaded,
  full-fidelity local revisions (Ember serializer field names, restored
  end-to-end), pending revision flushed on editor unmount, exact-origin
  postMessage checks on the explore screen, owner details supplied to the
  billing iframe for non-owners in force-upgrade, template default
  normalized to null, corrupt local-revision entries skipped, and the
  debug screen's permission redirect made cross-shell-safe.
- **Known mechanical follow-ups at flag GA:** delete the Ember routes
  and their react-fallback handovers, remove the EmberFallback plumbing
  for each screen, drop the dual e2e wrappers in favor of the React-only
  ones, and remove the `@source` scan of admin-x-design-system once its
  last consumers (CodeEditor in tag/PSM code injection) move to a shade
  equivalent.
- **The audit-workflow report (AUDIT-REPORT.local.md) is pending the
  live visual phase**, blocked on a dedicated automation login at the
  time of writing; source-phase findings are cached for resume.
