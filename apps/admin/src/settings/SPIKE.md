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
  - `area-section.tsx` — per-area section; renders the area's registered
    native component (the "not yet rebuilt" placeholder machinery was
    retired in phase 7 once every area was native).
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
| general (+staff)  | done    | title-and-description, time-zone, publication-language, seo-meta, social-accounts, staff-profile, staff-roles, staff-password, staff-security, staff-invitations, staff-actions, layout | See "General area notes" below |
| site              | done    | design, theme, navigation, announcement-bar, search | See "Site area notes" below |
| membership        | done    | access, tiers, stripe, portal, membership-settings, custom-fields, member-welcome-emails (incl. automations-on customize test), layout portal test un-skipped | See "Membership area notes" below |
| email             | done    | email-settings, newsletters, default-recipients, mailgun | See "Email area notes" below |
| growth            | done    | network, explore, recommendations, tips-and-donations, offers (top-level suite) | See "Growth area notes" below |
| advanced          | done    | advanced, integrations, membership/analytics (the inherited debt) | See "Advanced area notes" below |

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
- `layout.acceptance.test.tsx`: opted in; its portal-modal test was
  `it.skipIf(isShadeSettingsRun)` until the membership area landed — phase 4
  un-skipped it.
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
- Analytics group is ported (it renders under General);
  `membership/analytics.acceptance.test.tsx` was opted in by phase 7 once
  its migrationtools test had a native target.
- "View user activity" menu item navigates to `/settings/history/view/:id`,
  which opens the native history dialog since phase 7.

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
  membership area (`#/settings/members`) — phase 4 moved it on to the email
  area.
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

## Membership area notes (phase 4)

**Structure.** Area component `src/settings/membership/membership-area.tsx`
(registered in `AREA_COMPONENTS`): access, spam filters, tiers, portal, gift
subscriptions, welcome emails (automations off), tips & donations (Stripe +
donations on), custom fields (`membersCustomFields` flag) — the same groups
in the same order the legacy membership-settings.tsx composes, including the
cross-area ones (spam filters from advanced/, tips from growth/). Routed
dialogs registered in settings-app.tsx (legacy deep links keep working
flag-on): `portal/edit`, `tiers/add`, `tiers/:tierId`, `stripe-connect`.

**Boundary notes for the email and growth agents:**

- The membership sidebar group also contains the Email/Newsletters nav item,
  but everything it points at is the **email area** — not touched here.
- **Welcome emails (memberemails) is membership's**: nav.ts puts it in the
  Membership group, so the full member-emails port (rows, welcome email
  editor modal, customize dialog) landed in this phase. ONE test stayed
  flag-off-only: "saves shared sender settings without creating rows when
  automations owns them" opens the customize modal from the automations-on
  email area (`/settings/emails`) — `it.skipIf(isShadeSettingsRun)` with a
  comment; **email agent: un-skip it** when the emails section lands. The
  native customize dialog (`welcome-email-customize-dialog.tsx`) is written
  to be reusable from the email area (no membership-specific coupling).
- The access suite's "disables dependent settings" test asserts on the
  enable-newsletters group; that one assertion is guarded with
  `if (!isShadeSettingsRun)` — **email agent: drop the guard**.
- **Tips & donations**: the group component is ported here
  (`tips-and-donations-group.tsx`, renders in the membership area), but its
  acceptance suite lives in `src/settings/growth/` — **growth agent: opt it
  in**; the section itself should already pass.
- `membership/analytics.acceptance.test.tsx` remains NOT opted in (its last
  test targets migrationtools) — still the advanced agent's, as noted under
  the general area.

**Portal preview mechanism ported as-is.** `getPortalPreviewUrl` (the portal
script iframe params) is imported from legacy source
(`utils/get-portal-preview-url`, new subpath export), fed from the dialog's
form state so the iframe re-renders on every setting/tier change;
`portal-frame.tsx` ports the `portal-preview-ready` postMessage reveal. The
portal dialog runs on the shared `PreviewDialog` chrome with synced sidebar
and preview tabs; the Links tab renders the copyable-URLs page in the
preview pane. The signup-notice Koenig field reuses the site area's
`AnnouncementContentEditor` (same MINIMAL_NODES HtmlOutputPlugin lane).

**Tiers.** Cards grid on semantic tokens (TrialDaysLabel pill and the cards
rebuilt; old-DS Icon/clsx leftovers gone), active/archived shade Tabs, and
the tier detail dialog with dnd-kit benefits reordering via a local port of
the old-DS `useSortableIndexedList` (the pending new-benefit row folds into
form state, so Save includes an un-added benefit — the legacy contract).
Currency helpers (`utils/currency`) and `use-currency-input` are imported
from legacy source via new subpath exports, not duplicated.

**Stripe connect** (`stripe-connect-dialog.tsx`) covers all four legacy
states: Start (branded StripeButton, local `stripe-buttons.tsx`), Connect
(test-mode switch on the `/members/stripe_connect?mode=` link, token paste,
tier-save poll on STRIPE_NOT_CONFIGURED), Connected (disconnect flow with
the paid-members check), and Stripe Direct keys. Limit checks: route-level
`errorIfWouldGoOverLimit('limitStripeConnect')` shows the shared limit
modal and bounces to `/settings/tiers`; already-connected sites bypass the
limit (same as the tiers-group entry button).

**Welcome emails.** The section reuses the native automations email-modal
machinery (`@/automations/components/email-modal/*`: EmailEditor with the
direct-ESM Koenig import, validation) plus welcome-specific ports
(`use-welcome-email-preview.ts` with the stale-response guard,
`welcome-email-preview-frame.tsx`, `welcome-email-test-dropdown.tsx`) and
`@/automations` hooks/utils for sender details + default records. The modal
is the automations pattern: **non-modal Dialog + inert body siblings** (a
Radix modal would fight Koenig's body portals), Escape guarded for
`[data-kg-link-input]`/`[data-kg-portal]` focus. The customize dialog
imports the legacy email-design fields/preview from admin-x-settings source
and rebuilds only the NiceModal chrome (EmailDesignModal/DirtyConfirmModal)
natively, keeping the `welcome-email-dirty-confirm-modal` testid.

**Shared infra touched:**

- `confirmation.tsx`: `okLabel`/`cancelLabel` of `""` now hide their button
  — the legacy ConfirmationModal single-button contract (portal
  verify-address notices, blocked-disconnect prompt).
- `shade-provider.tsx` (apps/shade): the sonner ToasterPortal wrapper gets
  `pointerEvents: 'auto'` so toasts stay dismissable while a Radix modal
  dialog is open (Radix sets `pointer-events: none` on the body; the tiers
  suite dismisses the archive toast over the open tier dialog).
- New admin-x-settings subpath exports: `utils/currency`,
  `utils/get-portal-preview-url`, `hooks/use-currency-input`,
  `email-design/types`, `email-design/design-fields`.

**Suite adjustments (mode mechanics unless noted):**

- access, tiers, stripe, portal, membership-settings, custom-fields,
  member-welcome-emails: `enableShadeSettingsMode()` + folding
  `shadeSettingsBootLabs()` into every hand-rolled settings/config boot
  response. No assertion changed.
- access: the enable-newsletters assertion guard (see boundary notes).
- member-welcome-emails: the automations-on test skip (see boundary notes).
- `layout.acceptance.test.tsx`: portal-modal test un-skipped — passes
  flag-on against the native portal dialog.
- `chrome.acceptance.test.tsx`: membership placeholder assertions replaced
  with native-area assertions; the placeholder-content probe moved to the
  email area (`#/settings/enable-newsletters`) — **email agent: move it
  again**; the not-yet-rebuilt deep-link probe moved from
  `/settings/portal/edit` (now real) to `/settings/newsletters/new`.

**Gotchas found (email agent, read these):**

- **Toasts under Radix modal dialogs**: sonner toasts render below-left and
  Radix modals disable body pointer events. The shade ToasterPortal now
  opts back in (`pointerEvents: 'auto'`), but a dialog must also
  `event.preventDefault()` in `onInteractOutside` when
  `event.target.closest("[data-sonner-toaster]")` — otherwise dismissing a
  toast closes the dialog (see tier-detail-dialog.tsx).
- **Full-screen Koenig editors**: copy the automations email-modal pattern
  wholesale (non-modal Dialog + inert siblings + Escape guards +
  onInteractOutside preventDefault). The shared ConfirmationProvider's
  AlertDialog still works from inside it — its portal mounts as a fresh
  body child after the inert pass.
- The welcome-email machinery in `@/automations` is directly reusable;
  don't re-port it. The only differences for a new consumer are the API
  mutations (preview/test/save endpoints) and testids.
- `checkStripeEnabled` needs config — gate group/dialog components on BOTH
  `useBrowseSettings` and `useBrowseConfig` data before first render or
  Stripe-dependent UI flashes the disconnected state.

## Email area notes (phase 5)

**Structure.** Area component `src/settings/email/email-area.tsx` (registered
in `AREA_COMPONENTS`): both legacy compositions behind one component —
automations off renders enable-newsletters, default recipients, the
Newsletters group and Mailgun (`email-settings.tsx` order); automations on
renders enable-newsletters, default recipients, the tabbed
Newsletters & automation emails group and Mailgun (`emails.tsx` order), with
the same newsletters-enabled/mailgunIsConfigured conditions. Routed dialogs
registered in settings-app.tsx: `newsletters/new` (add dialog),
`newsletters/:newsletterId` (detail dialog).

**Newsletter detail** (`newsletter-detail-dialog.tsx`) runs on the shared
`PreviewDialog` chrome: General/Content/Design sidebar tabs beside the live
email preview, `okLabel={okProps.label || "Save"}`, close through
`confirmIfDirty(saveState === "unsaved")`. Implementation notes:

- **Preview ported, not imported**: the legacy newsletter-preview(-content)
  components read `useGlobalData`, so they can't be imported like the
  email-design fields were; `newsletter-preview.tsx` +
  `newsletter-preview-content.tsx` are native ports on the framework hooks
  (color resolution rules verbatim, assets copied into
  `src/settings/email/assets/`). The preview document is a fixed-light email
  surface, so it uses literal grays/inline colors by design (theme-editor
  rationale). New apps/admin dep: `@tryghost/color-utils` (catalog).
- **Sender/reply-to flows**: the three managed-email states are ported
  (self-host editable field; sending-domain field with `@domain` validation;
  managed-without-domain shows no field — the preview header carries the
  managed address). Reply-to keeps the legacy local-state trick so the
  `newsletter`/`support` → concrete-address mapping doesn't rewrite while
  typing. Save surfaces `meta.sent_email_verification` as the info toast.
- **Archive/reactivate** run through the shared ConfirmationProvider;
  reactivate checks `errorIfWouldGoOverLimit("newsletters")` first (limit
  modal). The form resets from the query cache when the newsletter record
  changes (`setFormState` effect) so the status flip updates the sidebar.
- The email footer field reuses the site area's `AnnouncementContentEditor`
  (Koenig MINIMAL_NODES → HTML lane); the design toggles are shade
  ToggleGroups; color fields are the site area's `ColorPickerField`.
- Legacy hides the preview toolbar for newsletters
  (`previewToolbar={false}`); the shared PreviewDialog header brings the
  desktop/mobile device toggle — a deliberate shade-only addition.

**Newsletters list/tabs.** `use-newsletters.ts` (browse + active/archived
split + the optimistic drag-reorder cache update) is shared by the
automations-off group and the automations-on tab; `newsletters-list.tsx`
rebuilds the rows on dnd-kit (old-DS SortableList/Table gone).
`use-newsletter-verification.tsx` is the shared `?verifyEmail=` token flow
(newsletters routes); the automations-on group adds the automated-email
variant, which listens on `/settings/memberemails` and bounces to
`/settings/emails` — the legacy route contract. Both guard with a
submitted-token ref so re-renders can't double-redeem. The transactional tab
reuses membership's `WelcomeEmailCustomizeDialog` as predicted (zero changes
needed; it already gates row-creation on the automations flag).

**Add newsletter** (`add-newsletter-dialog.tsx`): plain routed shade Dialog;
the newsletters host limit check runs in an effect keyed on the limiter (it
re-materializes when the lazy limit-service/config load settles, so the
check re-runs until authoritative — legacy timing), then limit modal +
bounce to the return route. Create navigates into the new newsletter's
detail route; the framework mutation inserts it into the browse cache so
the list shows it immediately.

**Shared infra touched:**

- `preview-chrome.tsx` (site): PreviewDialog's DialogContent now
  `preventDefault()`s `onInteractOutside` for `[data-sonner-toaster]`
  targets — the tier-detail toast-dismissal gotcha, applied to every
  PreviewDialog consumer (design, announcement bar, portal, newsletter).
- `nav.ts`: `emailKeywords`/`emailsKeywords` exported for the area groups.
  No keyword/granularity changes.

**Suite adjustments (mode mechanics only, no assertion changes):**

- email-settings, newsletters, default-recipients, mailgun:
  `enableShadeSettingsMode()` + folding `shadeSettingsBootLabs()` into the
  hand-rolled settings/config responses.
- access: dropped the `if (!isShadeSettingsRun)` guard around the
  enable-newsletters assertion (per the phase-4 handoff).
- member-welcome-emails: un-skipped "saves shared sender settings without
  creating rows when automations owns them" (opens the customize modal from
  the native emails section).
- chrome: email placeholder assertions replaced with native-area assertions;
  the placeholder-content probe moved to the growth area
  (`#/settings/recommendations`) — **growth agent: move it again**; the
  not-yet-rebuilt deep-link probe moved from `/settings/newsletters/new`
  (now real) to `/settings/recommendations/add`.

**Gotchas found (growth agent, read these):**

- The legacy verification effects read `window.location.hash`; the native
  ports must use `useLocation()` (pathname + search) — the native app is
  path-routed inside the settings shell, and the hash trick would break the
  dual-mode suites.
- A prompt passed to `confirm()` can't easily close the dialog from inside
  (the legacy NiceModal `modal.remove()` trick): the verification prompts'
  newsletter-name links navigate but leave the confirmation open behind its
  Close button — a known minor delta, not covered by suites.
- `useLimiter` has no readiness flag: it returns a no-op limiter until the
  lazy service + config land, then re-materializes (new identity). Run
  mount-time limit checks in an effect with the limiter in the deps so the
  check re-runs when it becomes authoritative; don't one-shot it.
- The legacy email preview grey classes (`text-grey-700` etc.) don't exist
  in the admin Tailwind theme — a port that keeps them silently renders
  unstyled. Use literal default-palette grays for fixed-light email
  surfaces, semantic tokens everywhere else.

## Growth area notes (phase 6)

**Structure.** Area component `src/settings/growth/growth-area.tsx`
(registered in `AREA_COMPONENTS`): network, explore, recommendations,
embed signup, offers (Stripe-gated) — the same groups in the same order as
the legacy growth-settings.tsx. Tips & donations stays in the membership
area composition (phase 4); its acceptance suite in `growth/` is opted in
here and passed without changes. Routed dialogs registered in
settings-app.tsx (legacy deep links keep working flag-on):
`recommendations/add`, `explore/testimonial`, `embed-signup-form/show`,
`offers/new`, `offers/edit`, `offers/edit/retention(/:cadence)`,
`offers/edit/:offerId`, `offers/success/:offerId`. Route order matters:
`offers/edit/retention` is declared explicitly so it doesn't fall into
`offers/edit/:offerId` as `offerId="retention"` (the legacy container-modal
route contract, which renders the index for that path).

**Offers index rebuilt on shade Table** (`offers-index-dialog.tsx`, the
minefield screen): the legacy hand-rolled `<table>` is now shade
Table/TableHeader/TableRow, status pills are shade Badges
(`success`/`secondary`), and the hand-rolled sort menu is a shade
DropdownMenu with radio items (same options: date-added/name/redemptions +
direction + "Show archived" checkbox, trigger keeps the `Filter options`
accessible name). Kept from legacy by parity: the column set/widths
(colgroup), the sticky name column (`sticky left-0` + `bg-background` on
name cells, `overflow-x-auto` + `min-w-[900px]` wrapper), full-cell click
targets (real `<button>`s per cell; redemption counts > 0 render `<a>`s to
the members filter URL), retention rows always present, and the
tier-active/archived filter semantics. Sorting/show-archived state is
**dialog-local** (legacy kept it in a settings-app-provider; it now resets
when the index closes — deliberate minor delta, no suite covers
persistence). Display math (`getOfferDiscount` etc.) is a local port in
`offer-display-utils.ts` on the legacy currency/`numberWithCommas` utils.

**Offer editors on PreviewDialog.** add-offer, edit-offer and retention run
on the shared PreviewDialog with the membership `PortalFrame` +
`getOfferPortalPreviewUrl` (imported from legacy source, new subpath
export). PreviewDialog gained a `cancelLabel` prop (offers say "Cancel",
like the legacy modals; every other consumer keeps "Close"). The legacy
`previewToolbarBreadcrumbs` slot maps to `previewToolbarTabs` with a shade
Breadcrumb trail (`offers-breadcrumbs.tsx`); add-offer had
`previewToolbar={false}` in legacy but gets the standard toolbar + device
toggle here (the deliberate shade-only addition, same as newsletters). The
retention terms/display/status save matrix, name/code hash generation and
last-non-zero preview amounts are ported verbatim from
edit-retention-offer-modal.tsx. offer-success is a full-screen dialog with
the shade Breadcrumb trail; the X/Facebook/LinkedIn share buttons use
inline SVGs — **lucide-react no longer ships brand icons** (Twitter/
Facebook/Linkedin are gone from the package; `LucideIcon.Twitter` renders
`undefined` and takes down the whole settings portal).

**Recommendations metadata flow.** The legacy NiceModal pair
(add-recommendation-modal → add-recommendation-modal-confirm) is one routed
dialog with two internal steps (`add-recommendation-dialog.tsx`): URL step
(format-url on blur, Enter submits) → `POST /recommendations/check/` →
existing-id throws AlreadyExistsError (error toast) / metadata folds into
the draft → confirm step (shared `recommendation-description-form.tsx` +
`recommendation-validation.ts`), Back returns to the URL step preserving
edits. Both steps keep the `add-recommendation-modal` testid. The `?url=`
recommend-back flow auto-submits behind a loading view like legacy. The
edit dialog is **not routed** (legacy opened it via NiceModal without a
route change to avoid refetching): the list row click passes the loaded
record into a local Dialog. Lists are shade Table rows (the old-DS
Table/TableRow + hand column grid is gone), incoming rows keep the
Recommend back / Recommending affordances, and the 5-then-100
`getNextPageParams` pagination is ported verbatim.

**Other groups.** Network/Explore are immediate-save Switch groups
(`customButtons`); network reuses the shared `useLimiter`
(`isDisabled("limitSocialWeb")` is a render-time boolean that re-evaluates
when the lazy limiter materializes — no effect needed, unlike the
mount-time checks). The explore preview card and the recommendation
preview card are fixed-light surfaces (literal white/gray by design); the
purple testimonial banner keeps its fixed brand colors. The testimonial
dialog POSTs to `config.exploreTestimonialsUrl` with plain fetch and reads
the current user from `useCurrentUser`. Embed signup
(`embed-signup-dialog.tsx`) reuses the site area's `ColorPickerField` and
the legacy `IframeBuffering` + `generateCode` (new subpath export); no
acceptance suite covers it (screenshot evidence only).

**Shared infra touched:**

- `preview-chrome.tsx` (site): PreviewDialog `cancelLabel` prop (default
  "Close").
- `text-field.tsx` (shared): `autoFocus` + `rightAddon` props (the legacy
  `rightPlaceholder` — renders an InputGroup with an inline-end addon).
- New admin-x-settings subpath exports: `utils/get-offers-portal-preview-url`,
  `utils/get-tiers-cadences`, `utils/generate-embed-code`, `utils/helpers`,
  `components/settings/growth/offers/offer-helpers`,
  `components/settings/growth/offers/offers-retention` (the latter two are
  pure logic despite living under components/).
- `nav.ts`: `growthKeywords` exported for the area groups. No keyword
  changes.
- Assets copied into `src/settings/growth/assets/` (network, ghost-explore,
  explore-default-logo, ghost-favicon + the three testimonial portraits).

**Suite adjustments (mode mechanics only, no assertion changes):**

- network, explore, tips-and-donations, offers (`src/settings/
  offers.acceptance.test.tsx`): `enableShadeSettingsMode()` + folding
  `shadeSettingsBootLabs()` into the hand-rolled settings/config responses.
- recommendations: `enableShadeSettingsMode()` only (no hand-rolled boot
  responses).
- chrome: growth placeholder assertions replaced with native-area
  assertions; the placeholder-content probe moved to the advanced area
  (`#/settings/integrations`) — the last one; the not-yet-rebuilt deep-link
  probe moved from `/settings/recommendations/add` (now real) to
  `/settings/history/view/123` (**advanced agent: replace it** when history
  routes land — it's also the "View user activity" redirect noted under the
  general area).

**Gotchas found (advanced agent, read these):**

- **lucide-react has no brand icons** (Twitter/Facebook/Linkedin removed
  upstream): `LucideIcon.<Brand>` type-checks as `any` member access but is
  `undefined` at runtime, and one undefined element type crashes the whole
  settings portal (React unmounts the portal subtree; suites then see the
  bare admin shell). Use inline SVGs for brand marks.
- **Tall shade Dialogs need `max-h-[85vh] overflow-y-auto`** (the
  invite-user pattern): DialogContent is fixed-position, so overflow below
  the fold is unreachable — Playwright reports "element is outside of the
  viewport" and the click times out after retries.
- The acceptance viewport is 1280x800 (vitest.acceptance.config.ts) — the
  414px note in the memory files is about unit browser tests, don't design
  dialogs against the wrong number.
- `useForm.validate()` runs against the current formState snapshot; okLabel
  flips to "Retry" after a failed save but any `updateForm` resets
  saveState to "unsaved" and the label back to "Save" — suites that click
  "Save" twice rely on this, don't "fix" it.

## Advanced area notes (phase 7)

**Structure.** Area component `src/settings/advanced/advanced-area.tsx`
(registered in `AREA_COMPONENTS`): integrations, migration tools, code
injection, labs, history, danger zone — the same groups in the same order
as the legacy advanced-settings.tsx. Spam filters stays in the membership
area composition (phase 4); the advanced suite's spam-filters tests pass
against it unchanged. Routed dialogs registered in settings-app.tsx
(legacy deep links keep working flag-on): `integrations/new`, the seven
built-in configs (`integrations/zapier|slack|unsplash|firstpromoter|
pintura|transistor|contentapi`), `integrations/:integrationId`, and
`history/view(/:userId)`. Code injection and universal import are NOT
routed — legacy opens both via NiceModal without a route change, so they
stay state-driven dialogs.

**Integration dialog architecture.** `integration-dialog.tsx` is the
shared chrome for the built-in configs (full-bleed muted header with
logo/title/detail/optional API keys, scrollable body, footer with custom
left slot + Close/Save, every close path through `confirmIfDirty`). The
simple settings-backed dialogs (unsplash, firstpromoter, pintura,
transistor) share `use-save-label.ts` — the legacy Save → "Saving..." (≥1s)
→ "Saved" (1s) → Save label dance. Slack runs on the shared
`useSettingGroup` (validation + okProps) like legacy. The custom
integration dialog is a plain Dialog on `useForm` with the legacy
`savingDelay/savedDelay: 500` and `onSavedStateReset` → navigate back
(i.e. it auto-closes ~1s after a successful save — suite-pinned timing,
don't "fix" it). Webhooks are a nested Radix Dialog opened from local
state inside the custom dialog; webhook event options and the Zapier
template data are imported from legacy source (`webhook-event-options`
resolves through the existing `./src/*` map; `data/zapier-templates` got
a subpath export + its type import converted to a full `import type` —
the TDZ rule from phase 3).

**The one copy-field component.** `api-key-field.tsx` (APIKeyField +
APIKeys on shade CopyField/CopyFieldActions/CopyFieldCopyButton) is the
single API-key row used by zapier, transistor, content-api and the custom
integration dialog — hover-reveal Copy ("Copied" flash) / Regenerate, and
the regenerated hint line. The legacy api-keys.tsx already sat on shade
CopyField, so the port is mechanical; the "Copied" reset-on-value-change
contract comes from CopyField itself.

**Brand icons are inlined raw SVGs.** `integration-icon.tsx` imports the
legacy design-system icon files with Vite's `?raw` and injects them
inline (`svg-raw.d.ts` declares the module shape) — lucide-react ships no
brand icons, `<img>` would break the currentColor-based marks (unsplash,
transistor, medium, angle-brackets, integration, import/export) in dark
mode, and one bad element type unmounts the whole portal. zapier-logo
(fixed-color wordmark in the dialog footer) stays a plain `<img>` URL
import.

**CodeMirror.** `code-editor.tsx` is the advanced-area CodeMirror field
(html/yaml, async language import, renders nothing until the extension
resolves — the legacy CodeEditor contract). The editing surface is
**fixed-light** (bg-white + neutral gutters, like the email-preview
fixed-light lane; the legacy dark: overrides are not reproducible without
dark: variants). Used by the full-screen code injection dialog
(header/footer tabs, Cmd/Ctrl+S, Save keeps the dialog open) and the
redirects/routes YAML editors (`yaml-editor-dialog.tsx`: loads via fetch
from the download endpoint, saves through the upload mutation, keeps
validation errors inline under testid `yaml-editor-error` with the modal
open). Full-screen dialogs use the phase-3 recipe
(`top-0 left-0 h-dvh w-screen max-w-none translate-x-0 …`).

**Labs.** Open/Close toggle with the bubbles illustration while closed;
Beta features + Private features tabs (the latter behind
`config.enableDeveloperExperiments`). `feature-toggle.tsx` ports the labs
JSON save + the config-cache poke (so flag-gated UI flips immediately);
the automations one-way confirmation runs through the shared
ConfirmationProvider (legacy testid `feature-toggle-confirmation-modal`
became `confirmation-modal` — no suite asserts the old id). The
redirects/routes upload buttons are `file-upload-button.tsx` (label +
hidden input carrying `#upload-redirects`/`#upload-routes` — the suites
address the input by id). The legacy auto-expand-on-single-search-hit
(useAutoExpandable) is not ported (needs per-component search
registration, a known chrome gap).

**Migration tools.** Import tab: the six external migrator buttons
(`navigate(route, {crossApp: true})` → `{route, isExternal: true}`) +
Universal import, which is now a shade Dropzone dialog (the legacy pasted
grey click-panel is gone). Export tab: Content & settings
(`downloadAllContent()` iframe download) and the Post analytics CSV
export (disabled + sr-only "Loading..." while in flight — the legacy
Button-loading text contract the analytics suite asserts).

**History.** `history-dialog.tsx` ports the legacy history-modal onto a
routed Dialog: the framework's `useBrowseActions` does the grouping
(skip/count), `keepPreviousData` + the `created_at:<'…'` cursor
getNextPageParams are verbatim, infinite scroll is a local
IntersectionObserver sentinel (offset 250) inside the dialog's own scroll
pane. The filter row (event/resource Switch popover under
`history-filters`, staff combobox under `history-staff-filter` on
useFilterableApi with the route-param hydration and the absolute-
positioned Clear button) is a near-verbatim port — the legacy component
was already all-shade. Staff selection navigates to
`/settings/history/view/:userId`; clear goes back to
`…/history/view`. Description links map InternalLink routes to
`/settings/<route>` and external ones through `crossApp`.

**Danger zone.** Three rows (reset-auth behind `labs.dangerZoneResetAuth`)
through the shared ConfirmationProvider with the legacy labels/toasts;
delete-all-content refetches all queries after the toast, reset-auth
redirects to the admin root on success.

**Suite adjustments (mode mechanics only, no assertion changes):**

- advanced: `enableShadeSettingsMode()` + folding `shadeSettingsBootLabs()`
  into the `advancedSettings()` boot response.
- integrations: `enableShadeSettingsMode()` + folding it into
  `limitedConfig()`.
- membership/analytics (the inherited debt): opted in with the labs folded
  into both hand-rolled responses; its migrationtools test passes against
  the native export tab, so no skip was needed.
- chrome: the advanced placeholder assertions became native-area
  assertions; the placeholder machinery is retired (AreaPlaceholder +
  `LEGACY_AREA_ROUTES` deleted, `AREA_COMPONENTS` is now a full Record);
  the not-yet-rebuilt deep-link probe became a real
  `/settings/history/view/123` dialog assertion plus a separate
  unknown-route redirect probe.
- routing: opted in after adding the `/settings/locksite` →
  `/settings/members` redirect to the native route table (its other two
  tests already passed against the phase-4 portal dialog).
- **Flag-on skip list after phase 7**: `permissions.acceptance.test.tsx`
  only (4 tests — the roles gap below). Every other `src/settings` suite
  runs green in both lanes.

**Deliberate deltas (documented, not suite-covered):**

- The Pintura card's Active state is a static approximation
  (`pintura && (config.pintura || (js && css urls))`) — the legacy
  usePinturaEditor probes the actual script/css loads; Pintura wiring
  into image uploads remains unported (phase-2 note).
- The code editors are fixed-light surfaces (see CodeMirror note).
- Labs auto-expand on single search hit not ported (see Labs note).
- The feature-toggle confirmation uses the shared `confirmation-modal`
  testid instead of the legacy `feature-toggle-confirmation-modal`.

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

## Remaining gaps for the final sweep (all areas rebuilt; consolidated)

Dirty-state confirmation shipped in phase 2 (shared dirty registry +
`confirmIfDirty` on every exit path) and every legacy modal route is now a
real native route — those phase-1 gaps are closed. Still open:

- **Roles** (phase 2): the legacy app shows editors a staff-only view and
  contributors only their profile modal
  (`canAccessSettings`/`isEditorUser`). Not ported; the shell renders all
  areas for every role. `permissions.acceptance.test.tsx` is the ONE
  remaining legacy-only suite (skipped flag-on).
- **Scroll-position nav highlighting** (phase 1): the sidebar highlights
  the routed item only; the legacy scroll-spy (`use-scroll-section`)
  granularity was never ported.
- **Keyword highlighting** (`highlightKeywords`) and per-component search
  registration (phase 1) — also blocks the Labs auto-expand-on-single-
  search-hit behavior (phase 7, `useAutoExpandable`).
- **About Ghost** sidebar link and its modal; mobile/tablet layout of the
  chrome (desktop-first for now). (The `/settings/locksite` redirect landed
  in phase 7 — `routing.acceptance.test.tsx` is dual-mode now.)
- **Pintura wiring** (phases 2/7): image uploads don't open the Pintura
  editor, and the integration card's Active state is a static
  approximation (no script/css load probing).
- **Fixed-light editor surfaces** (phases 5/7): email preview and the
  advanced-area CodeMirror editors are deliberately fixed-light; revisit
  if a dark CodeMirror/email theme is wanted.
- **Minor deliberate deltas** already documented per area: offers
  sort/show-archived state is dialog-local (phase 6); verification
  prompts' newsletter-name links leave the confirmation open behind its
  Close button (phase 5); PreviewDialog adds the device toolbar to
  newsletters/add-offer where legacy hid it (phases 5/6); the
  feature-toggle confirmation uses the shared `confirmation-modal` testid
  (phase 7).
