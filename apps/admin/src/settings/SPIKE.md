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
| general (+staff)  | pending | —               |       |
| site              | pending | —               |       |
| membership        | pending | —               |       |
| email             | pending | —               |       |
| growth            | pending | —               |       |
| advanced          | pending | —               |       |

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
