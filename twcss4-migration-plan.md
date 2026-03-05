# TailwindCSS v3 → v4 Migration: Execution Plan

**Project:** Ghost Monorepo CSS Migration
**Created:** March 2, 2026
**Based on:** twcss4-migration-prd-claude.md v1.0

---

## How to Use This Plan

Each phase ends with a **"Manual Test Checkpoint"** — a concrete set of things you can verify yourself before greenlighting the next phase. Phases are strictly sequential; never start Phase N+1 until Phase N's checkpoint passes. Within multi-app phases (4 and 5), work one app at a time and run its checkpoint before moving to the next app.

Throughout the plan, items marked with ⚠️ call out specific traps from past failed attempts.

---

## Phase 0: Preparation & Baseline Capture

**Duration:** 1–2 days
**Goal:** Establish the "before" state so you have something to compare against. Nothing changes in the codebase.

### Steps

**0.1 — Set up Playwright visual regression suite**

Create `e2e/visual-regression/capture-baselines.spec.ts` with every significant Ghost Admin screen. The PRD lists the minimum set: dashboard, posts-list, editor, settings-general, settings-membership, members-list, activitypub, stats. Add any screens you regularly use that aren't listed.

Hide dynamic content (timestamps, notifications, animations) using injected CSS so they don't cause false diffs later.

**0.2 — Capture golden baseline screenshots**

Run `npx playwright test --project=visual-regression --update-snapshots` against the current `main` branch with `yarn dev` running. Store the resulting `.png` files in version control under `e2e/visual-regression/` — these are your ground truth.

**0.3 — Audit every Tailwind config file**

Locate and document all custom configuration across in-scope apps. At minimum check: `apps/admin/tailwind.config.js`, `apps/shade/tailwind.config.ts`, `apps/admin-x-design-system/tailwind.config.cjs`, `apps/admin-x-settings/tailwind.config.cjs`. For each file, record custom colors, fonts, spacing scales, plugins, and the `content` array paths. This inventory becomes your "nothing must be lost" checklist for later phases.

**0.4 — Audit Ember CSS collisions**

Scan `ghost/admin/app/styles/` (especially `global.css`) and build a reference list of every classname that collides with a Tailwind utility. The known dangerous ones from past failures: `.flex`, `.block`, `.hidden`, `.relative`, `.absolute`. There will be more — grep for single-word classnames and cross-reference against Tailwind's utility list.

**0.5 — Audit the current `important` strategy**

Document exactly how Shade currently wins specificity over Ember. Check for `important: true`, `important: '[data-shade]'`, or selector-based scoping in the Shade tailwind config. This directly determines what replacement strategy you need in v4.

**0.6 — Create migration branch and lock versions**

Branch off `main` (e.g., `twcss4-migration`). Pin the current Tailwind v3 version in `package.json` to prevent drift. All subsequent phases happen on this branch.

### Manual Test Checkpoint — Phase 0

1. Run `yarn dev` — Ghost Admin loads normally, no changes have been made.
2. Run `npx playwright test --project=visual-regression` — all screenshots pass (they should, since you just generated them).
3. You have a written document listing: (a) every custom Tailwind config value across all apps, (b) every Ember-Tailwind classname collision, (c) the current `important` strategy.

If any of those three aren't complete, do not proceed.

---

## Phase 1: Infrastructure Swap

**Duration:** 2–3 days
**Goal:** Get the build running on Tailwind v4 tooling. Visual regressions are expected and acceptable — the point is that `yarn dev` boots without build errors.

### Steps

**1.1 — Update dependencies**

In root and relevant app `package.json` files: remove `tailwindcss` (v3), `postcss-import`, `autoprefixer`. Add `tailwindcss@^4`, `@tailwindcss/vite`. Keep `tailwindcss-animate` for now — it gets replaced in Phase 2. Update `tailwind-merge` to the latest v4-compatible version.

**1.2 — Run the official upgrade tool per app**

Run `npx @tailwindcss/upgrade` individually in each in-scope app directory: `apps/shade`, `apps/admin`, `apps/stats`, `apps/activitypub`, `apps/posts`, `apps/admin-x-settings`, `apps/admin-x-design-system`.

⚠️ **Past failure: trusting the upgrade tool blindly.** Review every diff it produces. The tool handles ~90% of renames but misses context-dependent changes. Do not auto-commit its output.

**1.3 — Configure `@tailwindcss/vite`**

In each app's `vite.config.ts`, add the Tailwind Vite plugin:

```ts
import tailwindcss from "@tailwindcss/vite";
// Add tailwindcss() to the plugins array
```

Remove the old `tailwindcss` entry from any `postcss.config.js/mjs` files.

⚠️ **Past failure: media queries broken.** This was caused by incomplete Vite plugin setup. Make sure `@tailwindcss/vite` is the plugin being used, not a leftover PostCSS-based setup. If both are active simultaneously, media queries will break.

**1.4 — Migrate the main CSS entry point to unlayered imports**

This is the single most critical step in the entire migration. Replace the old `@tailwind` directives with individual, unlayered imports:

```css
@import 'tailwindcss/theme.css';
@import 'tailwindcss/preflight.css';
@import 'tailwindcss/utilities.css';
```

Do NOT use `@import "tailwindcss"` (the shorthand), because it wraps everything in `@layer` blocks.

⚠️ **Past failure: cascade layer conflicts (the #1 cause of previous failures).** When Tailwind output is inside `@layer` blocks, any unlayered CSS (like Ember's `global.css`) automatically wins per the CSS spec. This is what hid the sidebar, broke layouts, and caused Ember styles to override Tailwind utilities. The unlayered import pattern puts Tailwind into the implicit layer alongside Ember, restoring normal specificity rules.

⚠️ **Past failure: sidebar hidden.** Directly caused by the cascade layer problem. If the sidebar disappears after this step, the unlayered import isn't working correctly — check that you're not using the shorthand `@import "tailwindcss"`.

**1.5 — Add `@source` directives for monorepo scanning**

In the main CSS entry point (likely `apps/admin/src/index.css`), add explicit source directives for every in-scope app:

```css
@source "../shade/src/**/*.{ts,tsx}";
@source "../stats/src/**/*.{ts,tsx}";
@source "../activitypub/src/**/*.{ts,tsx}";
@source "../posts/src/**/*.{ts,tsx}";
@source "../admin-x-settings/src/**/*.{ts,tsx}";
@source "../admin-x-design-system/src/**/*.{ts,tsx}";
```

⚠️ **Past failure: classes tree-shaken away (e.g., `bg-green` not generating CSS).** Tailwind v4's auto-detection uses different heuristics than v3's explicit `content` array. Without `@source` directives, v4 may not scan the right directories and will silently omit classes it never finds. This also caused arbitrary values like `mt-[284px]` to disappear.

**1.6 — Boot the dev server**

Run `yarn dev`. Fix any build/compilation errors. The app should load in the browser — it will likely look broken in places, and that's fine. The goal is zero build errors, not zero visual regressions.

### Manual Test Checkpoint — Phase 1

1. `yarn dev` runs without build errors or CSS-related console errors.
2. Open Ghost Admin in the browser at `localhost:2368/ghost/`. The app loads. You can navigate between screens.
3. Open DevTools → Network tab. Confirm CSS files are being served (not 404s).
4. Open DevTools → Console. No errors related to Tailwind, PostCSS, or Vite CSS processing.
5. **Expect visual regressions** — colors may be off, spacing may be wrong, some elements may look different. That's normal. What matters is: the app boots, pages render, and navigation works.

If the app doesn't boot or pages are completely blank, debug before proceeding.

---

## Phase 2: Shade Design System Migration

**Duration:** 3–5 days
**Goal:** Fully migrate Shade to v4 patterns. This is the foundation every other app depends on — nothing downstream can be correct until Shade is correct.

### Steps

**2.1 — Migrate CSS variables to `@theme inline` pattern**

Convert Shade's CSS variables from the v3 pattern (inside `@layer base`) to v4's pattern (unwrapped `:root` with full `hsl()` values, plus `@theme inline` mapping). The PRD's Appendix has the exact before/after patterns.

Key change: v3 stored raw HSL values like `--background: 0 0% 100%` and composed them in utility classes. v4 expects complete color values like `--background: hsl(0 0% 100%)`.

**2.2 — Replace `tailwindcss-animate` with `tw-animate-css`**

Remove the old plugin reference and add `@import "tw-animate-css"` to Shade's CSS. Update `package.json` accordingly (remove `tailwindcss-animate`, add `tw-animate-css`).

**2.3 — Rename all deprecated utility classes in Shade components**

Systematically update every Shade `.tsx` file. The key renames: `shadow-sm` → `shadow-xs`, bare `shadow` → `shadow-sm`, `rounded-sm` → `rounded-xs`, bare `rounded` → `rounded-sm`, `blur-sm` → `blur-xs`, `outline-none` → `outline-hidden`, bare `ring` → `ring-3`, `flex-shrink-*` → `shrink-*`, `flex-grow-*` → `grow-*`. Also convert any `!` prefix important modifiers to suffix form (e.g., `!flex` → `flex!`).

Use a project-wide search to make sure nothing is missed. The upgrade tool should have caught most of these in 1.2, but verify manually.

**2.4 — Fix default border colors**

Search all Shade components for bare `border` class usage (without an explicit color). In v4, `border` uses `currentColor` instead of `gray-200`. Add explicit `border-gray-200` (or the appropriate Shade semantic border color) everywhere a bare `border` appears.

Similarly, check for bare `ring` usage — the default color changed from `blue-500` to `currentColor`.

**2.5 — Adapt the specificity / `important` strategy**

The v3 `important: true` or `important: '[data-shade]'` config no longer works the same way. Since Phase 1 already set up unlayered imports, Tailwind utilities are now in the implicit cascade layer alongside Ember CSS. Normal specificity applies.

If Ember's identically-named classes still win (because they appear later in the cascade or have equal specificity), the fallback is to ensure the Tailwind CSS import order places utilities after Ember's CSS, or to add a scoping selector to React mount points (e.g., `[data-shade]` attribute on React containers, combined with a Tailwind selector strategy).

Test this by checking the specific classes from your Phase 0 collision audit (`.flex`, `.hidden`, `.block`, etc.) in DevTools to confirm which rule wins.

**2.6 — Update Storybook configuration**

Update `.storybook/preview.js` (or equivalent) to import the new v4 CSS entry point. Storybook may need `@tailwindcss/postcss` instead of the Vite plugin if it uses its own build pipeline.

**2.7 — Visual test through Storybook**

Run Storybook (`yarn storybook` or equivalent) and manually review every Shade component story. Check buttons, inputs, dialogs, dropdowns, cards, tables, and any animated components.

### Manual Test Checkpoint — Phase 2

1. Run Shade's Storybook. Every component story renders without errors.
2. Visually inspect at least these Shade components in Storybook: Button (all variants), Input, Dialog, Dropdown Menu, Card, Table, Tabs, Alert, Toast/Notification. They should look identical to how they looked before migration.
3. Check a Shade component with animations (e.g., Dialog open/close, Dropdown expand). Animations should be smooth and correct.
4. In DevTools on any Shade component, inspect a `border` element — confirm the border color is explicit (not `currentColor` defaulting to black).
5. In DevTools, inspect a `.flex` element inside a Shade component — confirm Tailwind's `display: flex` rule is winning, not Ember's `.flex` definition.
6. `yarn dev` still boots Ghost Admin. Navigate to a screen that uses Shade components (e.g., Settings). Components should look visually correct.

---

## Phase 3: Admin App Migration

**Duration:** 2–3 days
**Goal:** The main Admin app renders pixel-perfect compared to the Phase 0 baseline.

### Steps

**3.1 — Fix the sidebar**

⚠️ **Past failure: sidebar hidden.** This was the most visible regression in previous attempts. Diagnose by: (a) checking if `.flex`, `.hidden`, or `.block` from Ember's `global.css` are overriding the sidebar's Tailwind layout utilities — use DevTools to inspect computed styles; (b) verifying the sidebar container has the correct scoping attributes; (c) confirming the unlayered import order from Phase 1 is placing Tailwind after Ember in the cascade.

If the sidebar is working correctly after Phase 1's unlayered imports, validate and move on. If not, this is the step where you fix it.

**3.2 — Verify media queries work**

Resize the browser to various breakpoints (mobile, tablet, desktop) and verify responsive layouts respond correctly. Check: sidebar collapse behavior, responsive grids, mobile navigation.

⚠️ **Past failure: media queries broken.** Caused by incomplete Vite plugin configuration. If breakpoints aren't working, confirm `@tailwindcss/vite` is the only CSS processing pipeline (no competing PostCSS setup) and that no old `@media` preprocessing is interfering.

**3.3 — Verify arbitrary values work**

Search the Admin codebase for arbitrary Tailwind values (patterns like `mt-[284px]`, `w-[calc(100%-2rem)]`, `bg-[#hex]`). Load the screens where they appear and confirm they're rendering.

⚠️ **Past failure: arbitrary values lost.** Caused by content detection issues. If any arbitrary values aren't generating CSS, check that `@source` directives from Phase 1.5 cover the files containing those classes.

**3.4 — Run visual regression against baseline**

Run `npx playwright test --project=visual-regression`. Compare every Admin screen against the Phase 0 golden baselines. Interpret failures by category: layout shifts → cascade/specificity issue; color changes → default border/ring color change; spacing changes → renamed utility that was missed; missing elements → tree-shaking or `hidden` attribute priority change.

Fix each failure, re-run, repeat until all screens pass within the < 0.1% pixel diff threshold.

**3.5 — Verify `hidden` attribute behavior**

In v4, `display: flex` no longer overrides the HTML `hidden` attribute. Search the Admin codebase for patterns where elements have both a Tailwind display class and a `hidden` attribute (often toggled dynamically). Verify these elements show/hide correctly.

### Manual Test Checkpoint — Phase 3

1. Run `npx playwright test --project=visual-regression` — all Admin screens pass within threshold.
2. **Sidebar:** Visible and properly laid out on dashboard, posts, members, and settings screens.
3. **Responsive:** Resize the browser window from 1440px down to 768px. Layout adjusts at breakpoints without breaking.
4. **Editor:** Open the post editor. The editor toolbar, content area, and sidebar panel all render correctly. Any custom spacing (arbitrary values) looks right.
5. **Settings:** Open each settings section. Shade components render identically to Phase 0 baseline.
6. Open DevTools console — no CSS-related errors or warnings.

---

## Phase 4: Secondary App Migration (stats, activitypub, posts)

**Duration:** 2–3 days
**Goal:** Each secondary app renders identically to its Phase 0 baseline. Work one app at a time.

### Per-App Steps (repeat for each: stats → activitypub → posts)

**4.1 — Ensure app-specific Tailwind config is migrated**

If the app has its own `tailwind.config.*` file, convert its custom values to CSS `@theme` blocks or `@source` directives. If it relies entirely on the Admin hub config, confirm the `@source` directive from Phase 1.5 covers this app's files.

**4.2 — Run the upgrade tool (if not done in Phase 1)**

`npx @tailwindcss/upgrade` in the app directory. Review all diffs.

**4.3 — Fix renamed utilities**

Same rename pass as Phase 2.3, but scoped to this app's `.tsx` files.

**4.4 — Fix default color/border changes**

Same border/ring color audit as Phase 2.4, scoped to this app.

**4.5 — Run visual regression for this app's screens**

Run Playwright tests filtered to just this app's screens. Fix any diffs before moving to the next app.

### Manual Test Checkpoint — Phase 4 (per app)

After each app, verify:

1. Playwright visual regression passes for that app's screens.
2. Navigate to the app in Ghost Admin (e.g., `/ghost/#/stats`, `/ghost/#/activitypub`). Pages load, data displays, interactions work.
3. No console errors related to CSS.
4. Any charts, graphs, or data visualizations in that app render correctly (especially relevant for stats).

Do not start the next app until the current app's checkpoint passes.

---

## Phase 5: Legacy React Apps (admin-x-settings, admin-x-design-system)

**Duration:** 2–3 days
**Goal:** Legacy React apps work correctly. Lower priority since they'll be refactored, but they must not be broken.

### Steps

**5.1 — Run the upgrade tool**

`npx @tailwindcss/upgrade` in `apps/admin-x-settings` and `apps/admin-x-design-system`.

**5.2 — Update classnames**

Same rename and border/ring audit as previous phases.

**5.3 — Verify Shade component integration**

These apps import Shade components. Since Shade was migrated in Phase 2, the components themselves should be correct. Verify that the integration points (how these apps import and render Shade components) still work — check for any wrapper CSS or overrides that might conflict.

**5.4 — Visual regression test Settings screens**

Run Playwright tests for all settings-related screens.

**5.5 — Fix any regressions**

### Manual Test Checkpoint — Phase 5

1. Playwright visual regression passes for all settings screens.
2. Navigate to Settings in Ghost Admin. Open every settings section (General, Membership, Email, etc.). All render correctly.
3. Interact with settings forms — inputs, toggles, dropdowns, save buttons all work and look correct.
4. The `admin-x-design-system` components used across settings look identical to Phase 0 baseline.
5. No console errors.

---

## Phase 6: Cleanup & Final Verification

**Duration:** 1–2 days
**Goal:** Remove all migration scaffolding, verify everything end-to-end, and confirm nothing was left behind.

### Steps

**6.1 — Delete old config files**

Remove all `tailwind.config.js/ts/cjs` files that have been fully migrated to CSS-first configuration. If any config is still needed during a transition period (via `@config` directive), leave it but add a TODO comment.

**6.2 — Remove deprecated packages**

Clean up `package.json` files across all apps. Remove: `tailwindcss-animate`, `postcss-import`, `autoprefixer`, any old Tailwind plugins that are now built-in to v4. Run `yarn install` to update the lockfile.

**6.3 — Full visual regression suite**

Run the complete Playwright visual regression suite one final time across all screens, all apps. This is the comprehensive pass.

**6.4 — Run existing E2E tests**

Run `yarn test:e2e` or whatever the project's E2E command is. These tests existed before the migration and must still pass.

**6.5 — Run unit/integration tests**

Run the project's unit and integration test suites. Look specifically for broken imports (old Tailwind packages that were removed) or test utilities that reference v3 class names.

**6.6 — Cross-browser spot check**

Open Ghost Admin in Chrome, Firefox, and Safari. Tailwind v4 targets Safari 16.4+, Chrome 111+, Firefox 128+. Spot-check the dashboard, editor, settings, and one secondary app in each browser.

**6.7 — Performance check**

Compare CSS build times before and after. The PRD expects 2–5x improvement. Run `yarn build` and time it, or check Vite's reported build stats.

**6.8 — Update documentation**

Update `CLAUDE.md`, `AGENTS.md`, and contributing docs to reflect: the new CSS architecture (unlayered imports, `@source` directives, `@theme inline`), the removal of `tailwind.config.*` files, and any new conventions.

### Manual Test Checkpoint — Phase 6 (Final)

1. `npx playwright test --project=visual-regression` — 100% pass across all screens, all apps.
2. `yarn test:e2e` — all E2E tests pass.
3. Unit/integration tests pass.
4. Ghost Admin works correctly in Chrome, Firefox, and Safari.
5. `yarn dev` boots cleanly with zero CSS-related console errors.
6. `yarn build` completes without errors and CSS build time is equal to or faster than pre-migration.
7. No `tailwind.config.*` files remain (unless explicitly retained with a documented reason).
8. No references to `tailwindcss-animate`, `postcss-import`, or `autoprefixer` in any `package.json`.
9. Documentation is updated.

---

## Quick Reference: Past Failures and Where They're Addressed

| Past Failure | Root Cause | Where It's Fixed |
|---|---|---|
| Sidebar hidden | Cascade layer conflict — Ember's unlayered CSS beat Tailwind's layered CSS | Phase 1.4 (unlayered imports), Phase 3.1 (sidebar-specific fix) |
| Media queries broken | Incomplete Vite plugin setup or competing PostCSS config | Phase 1.3 (Vite plugin), Phase 3.2 (verification) |
| Arbitrary values lost (`mt-[284px]`) | Content detection — v4 didn't scan the right files | Phase 1.5 (`@source` directives), Phase 3.3 (verification) |
| Classes tree-shaken (`bg-green`) | Missing `@source` directives | Phase 1.5 (`@source` directives) |
| No visual regression testing loop | AI agents couldn't verify rendered output | Phase 0 (Playwright baseline setup) |
| Cascade layer conflicts generally | `@import "tailwindcss"` wraps output in `@layer` | Phase 1.4 (individual unlayered imports) |

---

## Parallel Execution Notes

Phases 0 → 1 → 2 are strictly sequential. Phase 2 (Shade) must complete before anything downstream because every other app depends on Shade components.

After Phase 2, Phases 3, 4, and 5 can partially overlap if different people are working on them — they target independent apps. However, if you're working solo, do them sequentially to keep the feedback loop tight: Phase 3 (Admin) → Phase 4 (secondary apps) → Phase 5 (legacy apps).

Phase 6 must wait until all of Phases 3–5 are complete.
