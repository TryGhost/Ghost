# Settings Layout Bug — Investigation & Fix Plan

## Context

After the TailwindCSS v4 migration (Phases 1–5), the Settings page has a layout bug: it renders correctly for ~1 second, then the content area becomes too narrow/clipped. After closing Settings, the Dashboard layout is also broken. This bug is **pre-existing** — it existed before Phase 5 changes and was introduced during earlier migration phases (1–3).

## Static Analysis Findings

### Import Chain (confirmed)
1. `apps/admin/src/routes.tsx:72` — `lazy: lazyComponent(() => import("./settings/settings"))`
2. `apps/admin/src/settings/settings.tsx` — imports `App` from `@tryghost/admin-x-settings/src/app` (source, NOT built output)
3. `apps/admin-x-settings/src/app.tsx` — imports `DesignSystemApp` from `@tryghost/admin-x-design-system` (resolves to built `es/index.js`)
4. None of these files import CSS

### Portal rendering
- Settings renders via `createPortal(body)` with `position: absolute; inset: 0; z-index: 20`
- Wrapper div has class `shade shade-admin`
- Inside: `DesignSystemApp` wraps content in `admin-x-base admin-x-settings` div

### CSS already loaded (via `apps/admin/src/index.css`)
- `@import "@tryghost/shade/styles.css"` — TW v4 utilities + Shade preflight
- Shade's `preflight.css` (`:where(.shade) { * { max-width: revert; min-width: revert; ... } }`) — loaded at startup
- `@source` directives scan admin-x-settings and admin-x-design-system TSX files for utility classes

### What was ruled out
- **No v3 CSS injection**: The admin imports admin-x-settings from SOURCE (not built dist), and the source path does NOT import CSS. The design system's built `es/` output has no CSS files.
- **No `cssInjectedByJsPlugin` in this path**: That plugin is only in admin-x-framework's vite config (used by admin-x-settings' standalone build, NOT by the admin's vite config)
- **Shade preflight is not the cause**: It's loaded at startup, not lazily. Dashboard works fine without visiting Settings.

### Key symptom: the bug PERSISTS after closing Settings
This is the critical clue — something permanent is modified when Settings loads. Since the portal DOM is removed on unmount, the change must be in:
- A `<style>` tag injected into the DOM
- TW v4 CSS being regenerated/reprocessed when lazy modules load
- A CSS custom property or class being added/removed on body/html

### Primary hypothesis: `@tailwindcss/vite` CSS hot-reload on lazy import
When Settings lazy-loads, Vite's module graph expands to include admin-x-settings source files. Even though `@source` already scanned these files, `@tailwindcss/vite` may reprocess CSS when modules enter the graph. This reprocessing could:
- Reorder utility declarations (changing cascade precedence)
- Add/modify a `<style>` tag that persists after Settings unmounts
- Cause the existing layout (body grid, SidebarInset) to break due to changed utility specificity

## Investigation Plan

### Step 1: Browser-level debugging with Chrome DevTools MCP
1. Navigate to Dashboard — take screenshot (baseline, should be correct)
2. Navigate to Settings — take screenshot immediately (should look correct)
3. Wait 2 seconds — take screenshot (should show broken layout)
4. Capture the DOM: list all `<style>` tags and their sources
5. Inspect computed styles on the broken content area to identify which CSS rule constrains width
6. Navigate back to Dashboard — take screenshot (should show if dashboard is also broken)
7. Compare `<style>` tags before and after Settings load

### Step 2: Identify the specific CSS rule causing the break
Using the browser inspection:
- Find which CSS property causes "too narrow" (likely `max-width`, `width`, or `overflow`)
- Trace it to the specific `<style>` tag or stylesheet
- Determine if it's a TW v4 utility, Shade preflight, or admin custom CSS

### Step 3: Fix based on findings

**If the issue is TW v4 CSS regeneration on lazy load:**
- The `<style>` tag managed by `@tailwindcss/vite` may be replaced with reordered content
- Fix: ensure deterministic CSS ordering, or add explicit CSS rules in `apps/admin/src/index.css` for affected layout properties

**If the issue is Shade's `:where(.shade) * { max-width: revert }` preflight:**
- The `revert` keyword reverts to the user-agent default, which may differ from Ember's expectations
- Fix: add explicit max-width/width on affected layout containers in `index.css`

**If the issue is the portal's `.shade.shade-admin` div interacting with body grid:**
- The portal creates a second `.shade.shade-admin` element as a direct child of body
- Fix: use a different class name on the portal wrapper, or add explicit grid placement

## Verification
- Navigate to Settings and back to Dashboard multiple times
- Settings layout should remain stable (no delayed break)
- Dashboard layout should remain unaffected after visiting Settings
- Run visual regression tests: `npx playwright test -c e2e/visual-regression`
