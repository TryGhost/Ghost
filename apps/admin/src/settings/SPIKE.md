# Settings-on-Shade spike — coordination notes

Rebuild of Ghost Admin settings as native Shade components inside
`apps/admin`, behind the `shadeSettings` Labs flag. The legacy portal-mounted
`apps/admin-x-settings` app stays fully functional with the flag off. This
file is the log for the agents rebuilding one area each on this branch —
update your area's row (and anything you learn the hard way) as you go.

## What phase 1 built

- **Labs flag `shadeSettings`** (private/developer-experiments tier):
  registered in `ghost/core/core/shared/labs.js` (`PRIVATE_FEATURES`), with a
  toggle in `apps/admin-x-settings/src/components/settings/advanced/labs/private-features.tsx`
  and the config API snapshot updated.
- **Route switch**: `apps/admin/src/routes.tsx` mounts
  `src/settings/settings-gate.tsx` for `settings/*`. The gate reads
  `config.labs.shadeSettings` at render time (same mechanism as
  `memberDetailsReact` / `member-detail-gate.tsx`) and lazy-loads either the
  legacy app (`src/settings/settings.tsx`, unchanged) or the native shell
  (`src/settings/app/settings-app.tsx`). Only an explicit `true` renders the
  new shell.
- **Native chrome** in `src/settings/app/`:
  - `settings-app.tsx` — flag-on entry; portals a full-screen takeover (same
    wrapper/stacking as the legacy app) and defines the route scaffolding:
    `/settings` index, `/settings/:area`, unknown/deeper paths →
    `<Navigate replace to="/settings">`.
  - `settings-shell.tsx` — sidebar + main scroll pane + exit button + Escape
    handling + scroll-to-area. Holds the `AREA_COMPONENTS` registry (see
    checklist).
  - `sidebar.tsx` — search + grouped nav, ported from the legacy sidebar.
  - `nav.ts` — nav groups/items/keywords + conditional visibility (Stripe,
    paid members, tips, newsletters, `automations`/`membersCustomFields`
    flags) + `resolveSettingsArea()` segment→area mapping.
  - `area-section.tsx` — per-area section; renders the registered native
    component or a "not yet rebuilt" placeholder listing the legacy route.
  - `search-provider.tsx` / `use-settings-search.ts` — the chrome's subset of
    the legacy search service (filter, `checkVisible`, `noResult`).
- **Dual-mode acceptance harness** (see below) + a chrome smoke suite
  (`src/settings/app/chrome.acceptance.test.tsx`) that passes in both modes.

## Toggling the flag

- **Dev**: enable developer experiments (`"enableDeveloperExperiments": true`
  in `ghost/core/config.local.json` — already on in the Docker dev setup),
  then Settings → Labs → Private features → "Shade settings UI". Or pin it in
  config: `"labs": {"shadeSettings": true}`.
- **Acceptance tests, per test**: `renderAdminApp("/settings", {labs: {shadeSettings: true}})`.
- **Acceptance tests, whole run**: `SHADE_SETTINGS=1` (below).

## Dual-mode acceptance mechanism

Everything lives in `apps/admin/test-utils/acceptance/settings-mode.ts`.

- `cd apps/admin && pnpm exec vitest run -c vitest.acceptance.config.ts src/settings`
  — the legacy (flag-off) run. Must stay green and untouched by the rebuild.
- `SHADE_SETTINGS=1 pnpm exec vitest run -c vitest.acceptance.config.ts src/settings`
  — the Shade (flag-on) run. Files that opted in run with
  `labs.shadeSettings: true` folded into the boot table's settings/config
  responses (so unchanged `renderAdminApp(...)` calls mount the new UI);
  every other file is **skipped**, not failed.

### Opting a suite into dual-mode (exact steps)

1. Add to the test file's imports: `enableShadeSettingsMode` from
   `@test-utils/acceptance`.
2. Call `enableShadeSettingsMode();` once at the top of the file (module
   scope, before any `describe`).
3. If the file overrides `boot.browseSettings` / `boot.browseConfig` with a
   hand-rolled response, fold the mode's labs into it so the flag survives:
   `settingsResponse({settings: {...}, labs: shadeSettingsBootLabs()})`
   (`shadeSettingsBootLabs` is exported from `@test-utils/acceptance`; it's
   empty outside `SHADE_SETTINGS=1` runs). The `labs:` render option and
   untouched boot defaults are handled automatically.
4. Run the file in both modes; both must be green before the opt-in lands.
5. A test that must only run in one mode can branch on `isShadeSettingsRun`
   (see the "boots the settings UI this run targets" smoke test), but prefer
   tests that pass unchanged in both.

CI note: default CI runs are flag-off; run the `SHADE_SETTINGS=1` lane
locally until the spike graduates.

## Area rebuild checklist

For each area (one agent per area, in its own `src/settings/<area>/` files):

1. **Rebuild the area's screens all-Shade** as native components in
   `apps/admin` — semantic tokens only, no `dark:` variants, imports from
   Shade layer subpaths. This is a **parity** exercise, not a redesign:
   mirror the legacy screens' structure and behavior.
2. **Port the view/edit group interaction faithfully** from
   `apps/admin-x-settings/src/hooks/use-setting-group.tsx` (view ↔ edit
   states, Edit/Cancel/Save buttons, dirty tracking, error handling). Wire
   dirty state into exit confirmation (see "Known chrome gaps").
3. **Modals become Shade Dialogs or routes** (e.g. `/settings/portal/edit`
   as a route under the area). Add real subroutes in `settings-app.tsx`'s
   `<Routes>` as needed and remove the affected paths from the
   redirect-to-index fallback.
4. **Register the area component**: add it to `AREA_COMPONENTS` in
   `settings-shell.tsx`; delete the placeholder expectation from the chrome
   smoke suite if it asserts on your area. Move/replace the area's keyword
   arrays in `nav.ts` if the rebuilt screens change granularity.
5. **Kill that area's hand-rolled leftovers**: don't port legacy one-off
   styling, admin-x-design-system components, or bespoke state machines —
   replace them with Shade primitives/components/patterns (use the
   `patterns`/`page-templates` layers, `Breadcrumb` from
   `@tryghost/shade/components` where a trail appears).
6. **Opt the area's acceptance suites into dual-mode** (steps above). The
   suites themselves should not fork per mode — if a test can't pass
   unchanged against both UIs, that's a parity gap to fix in the UI first,
   or a deliberate, documented behavior change.
7. **Screenshot evidence** flag-off vs flag-on per screen, saved under
   `swap-evidence/<phase>/` (uncommitted).
8. Update the status table below.

## Area status

| Area              | Status  | Suites opted in | Notes |
| ----------------- | ------- | --------------- | ----- |
| general (+staff)  | done    | title-and-description, time-zone, publication-language, seo-meta, social-accounts, staff-profile, staff-roles, staff-password, staff-security, staff-invitations, staff-actions, layout (portal test legacy-only) | See "General area notes" below |
| site              | done    | design, theme, navigation, announcement-bar, search | See "Site area notes" below |
| membership        | pending | —               |       |
| email             | pending | —               |       |
| growth            | pending | —               |       |
| advanced          | pending | —               |       |

## General area notes (phase 2)

**Structure.** Area component `src/settings/general/general-area.tsx`
(registered in `AREA_COMPONENTS`), one file per group next to its acceptance
suite. Staff detail/invite live in `src/settings/general/` too
(`user-detail-dialog.tsx` + `user-detail-tabs.tsx`, `invite-user-dialog.tsx`).
The area gates on `useBrowseSettings` data (renders null while loading) so
every group's `useForm` initial state starts from real settings — the
guarantee the legacy GlobalDataProvider gave; later areas should do the same.

**Shared ported pieces in `src/settings/app/shared/`** (reuse these — don't
re-port):

- `use-setting-group.ts` — the legacy view→Edit→save/cancel hook on framework
  settings hooks; reports dirty state into the shell's exit confirmation.
- `setting-group.tsx` — group chrome (Edit/Cancel/Save contract incl.
  disabled-unless-unsaved Save, "Saved" flash, Cmd/Ctrl+S, keyword-based
  hide-on-search via `keywords` prop, `/settings/<navid>` highlight) +
  `SettingGroupContent`/`SettingValue` view-mode layout.
- `text-field.tsx` — legacy TextField API on Shade Field/Input (error swaps
  the hint line), keeps group ports mechanical.
- `image-upload.tsx` — legacy ImageUpload *test contract*: label-wrapped
  hidden input while empty; `image-upload-container` + img with `id` +
  `image-delete-button` once set. Give the container an explicit height
  (e.g. `h-[300px]`) when the image URL may not load — a collapsed container
  clips the delete button (found via seo-meta suite).
- `toast.tsx` — `showToast` on sonner (ShadeApp's Toaster) emitting the
  legacy `toast-success|error|info` testids + `useSettingsHandleError`
  mirroring the framework handler (418/session-expiry silence). The
  framework's own react-hot-toast has NO `<Toaster/>` in the native shell —
  always disable `defaultErrorHandler` on queries and route errors here.
- `confirmation.tsx` + `use-confirmation.ts` — ConfirmationProvider (mounted
  in settings-app.tsx) with `confirm()`/`showLimit()` (testids
  `confirmation-modal`/`limit-modal`) and the `confirmIfDirty` helper.
- `dirty.tsx` + `use-settings-dirty.ts` — page-level dirty registry;
  `use-setting-group` reports into it; the shell's Escape/exit-button paths
  run `confirmIfDirty` (Leave/Stay), so `layout.acceptance.test.tsx` is
  opted in.
- `use-staff-users.ts`, `use-limiter.ts` — legacy hooks off GlobalDataProvider
  (`useCurrentUser`/`useBrowseConfig` instead). `@tryghost/limit-service` has
  no types; use-limiter declares the constructor surface locally.

**Staff detail routing.** Rebuilt as routed Shade Dialogs (deep links keep
working flag-on): `staff/invite`, `staff/:slug`, `staff/:slug/:tab`
(`social-links` / `email-notifications`; anything else renders profile) —
registered in settings-app.tsx above the `:area` route. Close navigates to
`/settings/staff` (contributors: cross-app to `/`), slug-sanitizing saves
`navigate(..., {replace: true})` to the new slug. The users group reads
`?tab=` from the location for its role tabs (`/settings/staff?tab=invited`).

**Pure logic imported from the legacy app, not duplicated:**
`@tryghost/admin-x-settings/src/utils/social-urls` and
`.../locale-validation` (explicit subpath exports added to
admin-x-settings' package.json — its `./src/*` map only resolves `.tsx`).
Locale data from `@tryghost/i18n/lib/locale-data.json`; timezones from
`@tryghost/timezone-data` (both added as apps/admin deps, plus
`@tryghost/limit-service`).

**Suite adjustments (all mode-mechanics, no behavior changes):**

- The 11 general/staff suites: `enableShadeSettingsMode()` + folding
  `shadeSettingsBootLabs()` into hand-rolled settings/config boot responses.
  No assertion changed.
- `layout.acceptance.test.tsx`: opted in; its portal-modal test is
  `it.skipIf(isShadeSettingsRun)` — the portal modal belongs to the
  membership area (not rebuilt), so `/settings/portal/edit` still redirects
  flag-on. Membership agent: un-skip when the portal modal lands.
- `chrome.acceptance.test.tsx`: general placeholder assertions replaced with
  native-area assertions; every test now calls `fakeSettingsScreens()`
  because the native general area fires the users/invites/roles requests.

**Known gaps left deliberately (legacy-only until later):**

- `permissions.acceptance.test.tsx` stays legacy-only: the editor
  staff-only view and the contributor profile-only flow are not ported (the
  shell renders all areas for every role); per-user canEdit rules inside the
  staff group ARE ported (staff-roles passes both modes).
- `search.acceptance.test.tsx` stayed legacy-only until phase 3 (it asserts
  site-area groups); the site rebuild opted it in.
- Pintura image editing is not wired into the native image uploads
  (config-gated; not part of the acceptance contract).
- Analytics group is ported (it renders under General), but
  `membership/analytics.acceptance.test.tsx` is NOT opted in: its last test
  targets migrationtools (advanced area). Advanced agent: opt it in with
  that test skipped flag-on, or split the file.
- "View user activity" menu item navigates to `/settings/history/view/:id`,
  which flag-on redirects to the settings index until advanced is rebuilt.

**Base-freshness checks done:** #29530 (TabView removal) — native screens
already use shade Tabs. e91932a403 (Billing navigation) — Ember-side only;
it navigates to existing `/settings/...` routes which the shell already
resolves; no nav.ts change needed.

## Site area notes (phase 3)

**Structure.** Area component `src/settings/site/site-area.tsx` (registered
in `AREA_COMPONENTS`): design & branding, theme, navigation, announcement
bar groups (theme group in `theme-group.tsx`, the small groups inline in
site-area.tsx). All screens beyond the groups are **routed dialogs**
registered in settings-app.tsx above the `:area` route, so legacy deep
links keep working flag-on:

- `design/edit` — full-screen Shade Dialog (`PreviewDialog` in
  `preview-chrome.tsx`: preview pane + `design-toolbar` header + 400px
  sidebar with Close/Save). Brand tab (`brand-settings.tsx`) + Theme tab
  (`theme-settings-form.tsx`) with the buffered-iframe live preview
  (`site-preview-frame.tsx` reuses the legacy IframeBuffering; the
  x-ghost-preview param encodings are ported verbatim). `?ref=setup` close
  goes to `/analytics` like the legacy external-analytics redirect.
- `design/change-theme` + `theme/install` — `change-theme-dialog.tsx`:
  official gallery (variant loop), installed list, upload flow, marketplace
  install confirmation. Upload dropzone/upload-failed are local dialogs
  with the legacy `confirmation-modal` testid; install/overwrite/delete
  confirmations go through the shared ConfirmationProvider.
- `theme/edit/:themeName` — `theme-code-editor-dialog.tsx`, see below.
- `navigation/edit` — standard Shade Dialog; drag reordering is built on
  the dnd-kit primitives directly (`navigation-items-editor.tsx`), with the
  legacy editor-state hook ported into `use-navigation-editor.ts` (the
  old-DS useSortableIndexedList folded in). URL semantics come from the
  legacy `format-url`/`use-url-input`, imported not duplicated.
- `announcement-bar/edit` — `PreviewDialog` again; **Koenig is wired
  natively**: `announcement-content-editor.tsx` lazy-imports
  `@tryghost/koenig-lexical` (the same direct-ESM path the automations
  email editor uses) and renders KoenigComposer/KoenigComposableEditor +
  HtmlOutputPlugin with MINIMAL_NODES — no old-DS HtmlField, no fallback
  needed. Closing does NOT dirty-confirm (legacy passes `dirty={false}`).

**Theme code editor: structural port, not a carve-out.** Rendering the
legacy component directly was not viable — it needs NiceModal + legacy
routing + old-DS react-hot-toast (no Toaster in the native shell, so its
toasts would never render and suites would fail). Instead
`theme-code-editor-dialog.tsx` ports the container: routing (`?from=`
allowlist, save-as route replace), toasts, error handling and the
confirm/input prompts (`theme-editor-dialogs.tsx` +
`use-theme-editor-prompts.tsx`, legacy testids) are native; the pure legacy
internals are imported from admin-x-settings source — theme-file-tree,
theme-editor-toolbar (so the "N files modified" pill and tree spinner stay
legacy-styled by design), theme-editor-utils, theme-validation-details. The
IDE surface styling is untouched (hex colors intentionally, not tokens).

**Shared decisions / new pieces:**

- `use-theme-limits.ts` replaces the legacy async
  use-check-theme-limit-error: the customThemes limit is a pure allowlist,
  so the check is computed synchronously from config (limit-service's
  AllowlistLimit just throws its configured error string). Route-level
  guards showLimit + redirect to `/settings/theme` for limited
  change-theme/install/editor deep links.
- `theme-result-dialogs.tsx` — ThemeInstalledDialog/InvalidThemeDialog
  (legacy `confirmation-modal` testid) reusing the legacy
  theme-validation-details components.
- `color-picker-field.tsx` — local swatches + react-colorful picker
  keeping the legacy interaction contract (one toggle button collapsed,
  hex textbox expanded, swatch buttons named via `title`).
- `preview-chrome.tsx` — the local device-toggle (ToggleGroup radios) +
  desktop/mobile chrome frames + the shared full-screen preview dialog
  (PreviewModalContent was NOT imported).
- Unsplash cover picking reuses `@tryghost/kg-unsplash-selector` directly
  (`unsplash-selector.tsx` portals it with the shade namespace classes).
- New admin deps: dnd-kit (pinned to the workspace versions),
  react-colorful, @tryghost/custom-fonts, @uiw/react-codemirror +
  @codemirror/* (all `catalog:`).
- New admin-x-settings subpath exports (its `./src/*` map only resolves
  `.tsx`): is-custom-theme-settings-visible, format-url, use-url-input,
  official-themes data, theme-editor-utils, theme-editor-styles.
- `assets/design-settings.png` copied (binary assets can't come through
  the subpath exports).

**Suite adjustments (mode mechanics only, no behavior changes):**

- The 4 site suites: `enableShadeSettingsMode()`; design folds
  `shadeSettingsBootLabs()` into its hand-rolled settings response; theme
  folds it into the `themeLimits()` config response. No assertion changed.
- `search.acceptance.test.tsx` opted in (was flagged legacy-only until the
  site groups existed — group-level keyword hiding now covers it).
- `chrome.acceptance.test.tsx`: site placeholder assertions replaced with
  native-area assertions; the placeholder-content probe moved to the
  membership area (`#/settings/members`). Membership agent: move it again.
- `area-section.tsx` now hides filtered-out sections with the `hidden`
  class instead of unmounting them — the search suite asserts hidden groups
  still exist in the DOM (legacy contract); the chrome suite's
  `toHaveCount(0)` for filtered areas became `not.toBeVisible()`.

**Gotchas found (membership agent, read these):**

- **Radix modal dialogs block pointer events on outside portals** (the
  aria-hider + scroll lock). Anything interactive opened from inside a
  dialog (Unsplash browser, pickers) must render inside the DialogContent
  subtree, not `createPortal(document.body)`. Nested Radix dialogs are
  fine (their portals register with the dismissable-layer stack).
- **TDZ trap importing legacy modules**: with verbatimModuleSyntax an
  inline `import {type X} from 'mod'` keeps a runtime `import 'mod'`. If
  `mod` value-imports the importing module back (settings-app-provider ↔
  data/official-themes did), any consumer that loads the data module first
  crashes with "Cannot access X before initialization" — and one crash in
  settings-app.tsx's import graph takes down EVERY flag-on suite. Convert
  such legacy imports to full `import type` statements.
- Koenig editors outside the old DS need a `koenig-react-editor relative`
  wrapper or the absolute-positioned placeholder escapes the input.
- Radix full-screen dialogs: override shade DialogContent with
  `inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0` — the
  default centering transform makes iframes blurry and breaks fixed
  children.
- `useForm`'s okProps.label is '' until a save starts — always render
  `okProps.label || "Save"`.
- Dialogs whose dirty state lives in `useSettingGroup` get page-level exit
  confirmation for free; dialogs on raw `useForm` (design) must call
  `confirmIfDirty` in their own close path.
- The editor swallow-Escape capture listener means Radix dialogs opened
  *from* the code editor don't close on Escape — same as legacy; buttons
  only.
- react-router keeps `%2F` inside a path param (decoded to `/`): guard
  params for embedded slashes and add a splat redirect
  (`theme/edit/*` → `/settings/theme`) for real extra segments.

## Chrome behavior ported (phase 1)

- Search filters sidebar groups/items and main sections by keywords (same
  case-insensitive containment matching); nothing-matched shows "No result"
  in the sidebar while keeping all sections visible.
- `/` focuses search (except while typing in a text field); search
  autofocuses on load; Escape in a non-empty search blurs it and keeps the
  value without exiting; clear button restores focus.
- Escape exits settings to `/` when no Shade dialog is open
  (`[role=dialog]/[role=alertdialog][data-state=open]`); exit button
  (`data-testid="exit-settings"`) does the same.
- Nav click clears the search and navigates to the item's **legacy route
  segment** (`/settings/design`, `/settings/members`, ...), which scrolls the
  owning area section into view; deep links to any legacy nav segment
  resolve to their area (`resolveSettingsArea`), unknown or deeper paths
  (`/settings/portal/edit`) redirect to `/settings`.
- Conditional nav visibility (Stripe/paid/tips/newsletters/flags) and the
  Access "Private" badge.
- Test surface kept compatible with `settings.screen.ts`: sidebar testid
  `sidebar`, search label "Search settings", "No result" text, exit-settings
  testid.

## Known chrome gaps (for area agents / later phases)

- **Dirty-state confirmation**: Escape/exit currently leave unconditionally —
  there is no native `useGlobalDirtyState`/`confirmIfDirty` equivalent yet.
  Whoever lands the first editable group must add it to the shell (the legacy
  contract is in `apps/admin-x-settings/src/main-content.tsx`) and opt
  `layout.acceptance.test.tsx` in.
- **Roles**: the legacy app shows editors a staff-only view and contributors
  only their profile modal (`canAccessSettings`/`isEditorUser`). Not ported;
  belongs to the general(+staff) area. `permissions.acceptance.test.tsx`
  stays legacy-only until then.
- **Scroll-position nav highlighting**: the sidebar highlights the routed
  item only; the legacy scroll-spy (`use-scroll-section`) granularity comes
  back as real groups land.
- **Keyword highlighting** (`highlightKeywords`) and per-component search
  registration were not ported — port from
  `apps/admin-x-settings/src/utils/search.tsx` when a rebuilt screen needs
  them.
- **About Ghost** sidebar link and its modal; mobile/tablet layout of the
  chrome (desktop-first for now); `/settings/locksite` legacy redirect.
- Deep links whose screens aren't rebuilt yet (modal routes like
  `/settings/portal/edit`) redirect to `/settings` by design in flag-on mode.
