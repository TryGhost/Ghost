# PRD: Ghost TailwindCSS v3 → v4 Migration

**Version:** 1.0
**Date:** March 2, 2026
**Status:** Draft

---

## 1. Executive Summary

This document defines the plan for migrating all React-based apps within the Ghost monorepo from TailwindCSS v3 to v4. The migration must produce zero visual regressions across all Admin screens — both the legacy Ember-rendered screens and the new React-rendered screens. The document also specifies a local testing system using Playwright MCP that enables AI coding agents to capture baselines, make changes, and self-verify results in a feedback loop.

---

## 2. Background & Context

### 2.1 Current CSS Architecture

Ghost's CSS system has evolved over ~10 years and currently has several interacting layers:

**Ember Layer (`ghost/admin/`):**
The original admin interface uses plain CSS files processed by PostCSS. Critically, `global.css` and other Ember stylesheets define classnames that collide with Tailwind utility names — for example `.flex`, `.block`, `.hidden`, `.relative`, `.absolute`, and others. These classes have standard CSS specificity and are **not** placed inside CSS cascade layers.

**Shade Design System (`apps/shade/`):**
Ghost's official design system, based on ShadCN/UI. Uses TailwindCSS v3 scoped with the `important` modifier (`important: true` or a selector-based `important` in `tailwind.config`) to win specificity battles against the Ember styles. Shade is developed via Storybook.

**React Apps (in scope):**

- `apps/admin/` — New Admin React app (acts as the main Tailwind config hub scanning all apps)
- `apps/stats/` — Analytics/stats screens
- `apps/activitypub/` — ActivityPub/social integration
- `apps/posts/` — Posts management
- `apps/admin-x-settings/` — React-based settings (uses some Shade components)
- `apps/admin-x-design-system/` — Shared React component library
- `apps/admin-x-framework/` — Framework utilities

**React Apps (out of scope):**

- `apps/comments-ui/` — External, embedded on published sites
- `apps/portal/` — External member portal
- `apps/signup-form/` — External embedded signup
- `apps/sodo-search/` — External search widget

### 2.2 Why Previous Migration Attempts Failed

1. **No visual regression testing loop.** AI agents had no way to verify rendered output — they could only modify source code and hope.
2. **Cascade layer conflicts.** TailwindCSS v4 places all generated utilities inside native CSS `@layer` blocks. Any CSS not in a `@layer` (like Ember's `global.css`) automatically wins, regardless of specificity. The v3 `important` modifier no longer works the same way.
3. **Media queries broken.** Likely caused by incomplete Vite plugin configuration or missing `@tailwindcss/vite` setup.
4. **Arbitrary values lost.** Custom classes like `mt-[284px]` weren't generated — a content detection issue where Tailwind v4's automatic source scanning didn't find the right files.
5. **Classes tree-shaken away.** For example `bg-green` not generating CSS — the `@source` directive was missing or misconfigured, so v4's auto-detection failed to scan the correct template directories.
6. **Sidebar hidden.** A direct consequence of the cascade layer issue: Ember CSS overriding Tailwind layout utilities.

---

## 3. Goals & Success Criteria

### 3.1 Goals

1. All in-scope React apps run on TailwindCSS v4 with `@tailwindcss/vite` (preferred) or `@tailwindcss/postcss`.
2. Zero visual regressions: every Admin screen (Ember + React) must look identical before and after migration.
3. Shade design system fully migrated: CSS variables moved to `@theme`, `tailwindcss-animate` replaced with `tw-animate-css`, ShadCN/UI components updated.
4. Storybook for Shade continues to work.
5. All custom Tailwind config (colors, fonts, spacing, plugins) preserved as CSS-native `@theme` tokens.
6. A reusable visual regression testing harness is available for AI agents.

### 3.2 Success Criteria

- All existing Playwright/E2E tests pass.
- Baseline screenshots match post-migration screenshots within a defined pixel threshold (< 0.1% diff per screen).
- `yarn dev` boots Ghost Admin without console errors related to CSS.
- Build times for CSS compilation are equal or faster.

---

## 4. Technical Analysis: Key Migration Challenges

### 4.1 The Cascade Layer Problem (Critical)

This is the single biggest challenge and the root cause of most previous failures.

**How TailwindCSS v4 uses cascade layers:**

TailwindCSS v4 generates CSS inside native `@layer` blocks:

```css
@layer theme, base, components, utilities;
@layer utilities {
  .flex { display: flex; }
  .hidden { display: none; }
}
```

**The problem:** Per the CSS spec, any CSS *not* inside an `@layer` block (the "implicit layer") automatically takes precedence over all layered CSS, regardless of selector specificity. Ember's `global.css` is unlayered, so:

```css
/* Ember (unlayered — always wins) */
.flex { /* some Ember definition */ }

/* Tailwind v4 (layered — always loses to unlayered) */
@layer utilities {
  .flex { display: flex; }  /* ← This loses */
}
```

**Solution strategy: Remove layers from Tailwind's output for the Admin context.**

TailwindCSS v4 allows importing without layers:

```css
@import 'tailwindcss/theme.css';
@import 'tailwindcss/preflight.css';
@import 'tailwindcss/utilities.css';
```

When imported without the `layer(...)` suffix, Tailwind's CSS lands in the implicit layer alongside Ember's CSS, and normal specificity rules apply — restoring v3-like behavior. This approach is documented in Tailwind's GitHub discussions as the recommended workaround for coexistence with unlayered third-party CSS.

Additionally, to ensure Tailwind utilities win over Ember's identically-named classes, the `important` strategy must be adapted. In v4 the `!` modifier moves to the end of the class (e.g., `flex!`), but for blanket specificity boosting, the recommended approach is:

- Use a CSS `@scope` wrapper, or
- Import Tailwind utilities with a prefixed selector strategy, or
- Use `@import "tailwindcss/utilities.css"` without a layer and ensure the import comes **after** Ember's CSS in the cascade

The cleanest solution for Ghost: import Tailwind's CSS files individually (without layers), ordered after Ember's global CSS, and use a scoping selector (e.g., `[data-shade]` or `#shade-root`) on the React mount points so that Tailwind utilities scoped to React containers naturally beat global Ember rules via specificity.

### 4.2 Content Detection / Source Scanning

TailwindCSS v4 auto-detects template files but uses different heuristics than v3's explicit `content` array. The `apps/admin/tailwind.config.js` in v3 explicitly lists paths across multiple apps. In v4 this must be replicated using `@source` directives:

```css
@import "tailwindcss";
@source "../../apps/shade/src/**/*.{ts,tsx}";
@source "../../apps/stats/src/**/*.{ts,tsx}";
@source "../../apps/activitypub/src/**/*.{ts,tsx}";
@source "../../apps/posts/src/**/*.{ts,tsx}";
@source "../../apps/admin-x-settings/src/**/*.{ts,tsx}";
@source "../../apps/admin-x-design-system/src/**/*.{ts,tsx}";
```

This explicitly tells v4's engine where to scan for class names, preventing tree-shaking of used classes.

### 4.3 Shade / ShadCN UI Migration

ShadCN/UI has official Tailwind v4 support (shipped February 2025). Key changes:

1. **CSS variables:** Move from `@layer base { :root { --background: 0 0% 100%; } }` to unwrapped `:root` with `hsl()` values + `@theme inline` mapping.
2. **Animation:** Replace `tailwindcss-animate` with `tw-animate-css`.
3. **Utility renames:** `shadow-sm` → `shadow-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `ring` → `ring-3`, etc.
4. **Color model:** HSL → OKLCH (optional but recommended).
5. **`data-slot` attributes:** New primitives use `data-slot` for styling hooks.
6. **`forwardRef` removal:** Components updated for React 19 compatibility.

### 4.4 Vite Plugin vs PostCSS

Ghost's React apps use Vite. The recommended v4 path is `@tailwindcss/vite` which provides tighter integration and better HMR performance. The `vite.config.ts` for the admin app should include:

```tsx
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss(), /* other plugins */],
});
```

### 4.5 Renamed & Removed Utilities

The v4 upgrade tool (`npx @tailwindcss/upgrade`) handles ~90% automatically. Key renames across the codebase:

| v3 | v4 |
| --- | --- |
| `shadow-sm` | `shadow-xs` |
| `shadow` (bare) | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` (bare) | `rounded-sm` |
| `blur-sm` | `blur-xs` |
| `outline-none` | `outline-hidden` |
| `ring` (bare) | `ring-3` |
| `flex-shrink-*` | `shrink-*` |
| `flex-grow-*` | `grow-*` |
| `bg-opacity-*` | `bg-{color}/{opacity}` |
| `!` prefix | `!` suffix (e.g., `!important` → `flex!`) |

### 4.6 Default Behavior Changes

These are silent breaking changes that cause visual regressions if not addressed:

1. **Border color default:** `border` now uses `currentColor` instead of `gray-200`. Every `border` class without an explicit color needs `border-gray-200` added.
2. **Ring width:** `ring` is now 1px instead of 3px. Replace with `ring-3` where the old 3px ring was intended.
3. **Ring color:** Default changed from `blue-500` to `currentColor`.
4. **Placeholder color:** Changed from `gray-400` to current text color at 50% opacity.
5. **Button cursor:** Now `cursor: default` instead of `cursor: pointer`.
6. **`hidden` attribute priority:** `display: flex` no longer overrides `hidden` attribute.

---

## 5. Testing System for AI Agents

### 5.1 Architecture Overview

The testing system provides a **capture → modify → compare** feedback loop:

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent Workflow                      │
│                                                          │
│  1. Capture baseline screenshots (before migration)      │
│  2. Make code changes (migration step)                   │
│  3. Capture current screenshots (after changes)          │
│  4. Run pixel-diff comparison                            │
│  5. If diff > threshold → analyze diff → fix → goto 3    │
│  6. If diff ≤ threshold → step complete                  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Playwright MCP Setup

The Playwright MCP server allows AI agents to interact with the running Ghost Admin in a real browser. Install and configure:

```bash
# Install Playwright MCP globally
npm install -g @playwright/mcp

# Or add to project devDependencies
yarn add -D @playwright/test @playwright/mcp pixelmatch pngjs
```

**MCP Server Configuration (for Claude Code / Cursor / VS Code):**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp", "--browser", "chromium"],
      "env": {
        "DISPLAY": ":0"
      }
    }
  }
}
```

This gives the AI agent access to tools like `browser_navigate`, `browser_take_screenshot`, `browser_click`, `browser_resize`, and `browser_snapshot`.

### 5.3 Screenshot Baseline Capture Script

Create a Playwright test suite that captures every significant screen:

```tsx
// e2e/visual-regression/capture-baselines.spec.ts
import { test, expect } from '@playwright/test';

const SCREENS = [
  { name: 'dashboard', path: '/ghost/#/dashboard' },
  { name: 'posts-list', path: '/ghost/#/posts' },
  { name: 'editor', path: '/ghost/#/editor/post' },
  { name: 'settings-general', path: '/ghost/#/settings' },
  { name: 'settings-membership', path: '/ghost/#/settings/members' },
  { name: 'members-list', path: '/ghost/#/members' },
  { name: 'activitypub', path: '/ghost/#/activitypub' },
  { name: 'stats', path: '/ghost/#/stats' },
  // Add all significant screens...
];

for (const screen of SCREENS) {
  test(`visual baseline: ${screen.name}`, async ({ page }) => {
    await page.goto(`http://localhost:2368${screen.path}`);
    await page.waitForLoadState('networkidle');
    // Hide dynamic content
    await page.addStyleTag({
      content: `
        [data-testid="timestamp"], .gh-notification,
        .animated, [data-test-date] { visibility: hidden !important; }
      `
    });
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.001,
    });
  });
}
```

### 5.4 Comparison Script for AI Agents

```tsx
// scripts/visual-diff.ts
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';

function compareScreenshots(baselinePath: string, currentPath: string, diffPath: string) {
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const mismatchedPixels = pixelmatch(
    baseline.data, current.data, diff.data,
    width, height,
    { threshold: 0.1, includeAA: false }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = (mismatchedPixels / totalPixels) * 100;

  return {
    mismatchedPixels,
    totalPixels,
    diffPercentage,
    pass: diffPercentage < 0.1,
  };
}
```

### 5.5 Agent Workflow Protocol

AI agents should follow this protocol for each migration step:

1. **Start Ghost locally:** `yarn dev` (ensure both Ember admin + React apps are running)
2. **Log in:** Navigate to `/ghost/#/signin`, authenticate
3. **Capture baseline:** Run `npx playwright test --project=visual-regression --update-snapshots` on the current (pre-migration) code
4. **Create branch:** `git checkout -b twcss4-phase-N`
5. **Apply migration changes** for the current phase
6. **Restart dev server** if needed
7. **Capture current screenshots:** Run `npx playwright test --project=visual-regression`
8. **Review diffs:** Any failures produce diff images in `test-results/`
9. **Fix regressions:** Analyze diffs, apply fixes, repeat from step 6
10. **Commit** when all screenshots pass within threshold

---

## 6. Migration Phases

### Phase 0: Preparation & Baseline (1–2 days)

**Goal:** Set up testing infrastructure, capture visual baselines, audit the codebase.

**Steps:**

0.1. **Set up the visual regression test suite.** Create the Playwright config, screen list, and comparison scripts as defined in Section 5. Run against current `main` to generate golden baselines.

0.2. **Set up Playwright MCP server** for AI agent access. Verify the agent can navigate to Ghost Admin, take screenshots, and compare them.

0.3. **Audit all `tailwind.config` files.** Document every custom configuration:

- `apps/admin/tailwind.config.js` (the main hub)
- `apps/shade/tailwind.config.ts`
- `apps/admin-x-design-system/tailwind.config.cjs`
- `apps/admin-x-settings/tailwind.config.cjs`
- Any others across in-scope apps

0.4. **Audit Ember CSS collisions.** Scan `ghost/admin/app/styles/` for all classnames that overlap with Tailwind utilities. Create a reference list. Key files: `global.css`, component-specific CSS files.

0.5. **Audit the `important` strategy.** Document how Shade currently scopes Tailwind (likely `important: '[data-shade]'` or `important: true` in the config). This informs the v4 replacement strategy.

0.6. **Create a migration branch** and lock the Tailwind v3 version to prevent drift during migration.

---

### Phase 1: Infrastructure Migration (2–3 days)

**Goal:** Swap build tooling to TailwindCSS v4 without changing any component code. Get the build running (even if visual regressions exist).

**Steps:**

1.1. **Update dependencies.** In the root `package.json` and relevant app `package.json` files:

- Remove: `tailwindcss` (v3), `postcss-import`, `autoprefixer`, `tailwindcss-animate`
- Add: `tailwindcss@^4`, `@tailwindcss/vite`, `tw-animate-css`
- Update `tailwind-merge` to latest (v4-compatible)

1.2. **Run the official upgrade tool** on each app individually:

```bash
cd apps/shade && npx @tailwindcss/upgrade
cd apps/admin && npx @tailwindcss/upgrade
cd apps/stats && npx @tailwindcss/upgrade
cd apps/activitypub && npx @tailwindcss/upgrade
cd apps/posts && npx @tailwindcss/upgrade
cd apps/admin-x-settings && npx @tailwindcss/upgrade
cd apps/admin-x-design-system && npx @tailwindcss/upgrade
```

Review all diffs carefully. The tool handles ~90% of class renames and config migration.

1.3. **Configure `@tailwindcss/vite`.** Update `vite.config.ts` for each app:

```tsx
import tailwindcss from "@tailwindcss/vite";
// Add to plugins array
```

Remove the old `tailwindcss` PostCSS plugin from `postcss.config.js/mjs`.

1.4. **Migrate the main CSS entry point** (e.g., `apps/admin/src/index.css`). Replace:

```css
/* OLD */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

With the unlayered import strategy to avoid cascade conflicts with Ember:

```css
/* NEW — unlayered to coexist with Ember CSS */
@import 'tailwindcss/theme.css';
@import 'tailwindcss/preflight.css';
@import 'tailwindcss/utilities.css';
```

1.5. **Add `@source` directives** to ensure all template files across the monorepo are scanned:

```css
@source "../shade/src/**/*.{ts,tsx}";
@source "../stats/src/**/*.{ts,tsx}";
@source "../activitypub/src/**/*.{ts,tsx}";
@source "../posts/src/**/*.{ts,tsx}";
@source "../admin-x-settings/src/**/*.{ts,tsx}";
@source "../admin-x-design-system/src/**/*.{ts,tsx}";
```

1.6. **Verify the dev server boots** with `yarn dev`. Fix any build errors. The goal is a running app — visual regressions are expected at this point and will be fixed in subsequent phases.

---

### Phase 2: Shade Design System Migration (3–5 days)

**Goal:** Fully migrate the Shade design system to TailwindCSS v4 and ShadCN/UI v4 patterns. This is the foundation everything else depends on.

**Steps:**

2.1. **Migrate Shade's CSS variables** to `@theme inline` pattern:

```css
/* Before (v3) */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
  }
}

/* After (v4) */
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
}
.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... all other semantic tokens */
}
```

2.2. **Replace `tailwindcss-animate`** with `tw-animate-css`:

```css
/* Remove: @plugin 'tailwindcss-animate'; */
@import "tw-animate-css";
```

2.3. **Update all renamed utility classes** within Shade components. Run a codemod or find-and-replace:

- `shadow-sm` → `shadow-xs`
- `shadow` (bare) → `shadow-sm`
- `rounded-sm` → `rounded-xs`
- `rounded` (bare) → `rounded-sm`
- `outline-none` → `outline-hidden`
- `ring` (bare) → `ring-3`
- `!` prefix → `!` suffix on all important modifiers

2.4. **Fix default border colors.** Search all Shade components for bare `border` usage and add explicit `border-gray-200` (or the appropriate Shade semantic color).

2.5. **Adapt the `important` / specificity strategy.** Replace the v3 `important` config with one of:

- Importing Tailwind utilities without `@layer` (as in Phase 1 step 1.4)
- Using a `@scope` wrapper if supported by the toolchain
- Using a class-based selector approach: `@import "tailwindcss/utilities.css" scope("[data-shade]")`

The exact approach depends on testing results from Phase 1.

2.6. **Update Storybook configuration** for Shade. Ensure Storybook loads the new v4 CSS correctly. This may require updating `.storybook/preview.js` to import the new CSS entry point.

2.7. **Visual test: Storybook.** Run through all Shade Storybook stories and verify components render correctly. Fix any issues.

---

### Phase 3: Admin App Migration (`apps/admin/`) (2–3 days)

**Goal:** Migrate the main Admin React app — the most critical piece since it orchestrates Tailwind for all embedded apps.

**Steps:**

3.1. **Fix the sidebar.** The sidebar was hidden in previous attempts. Diagnose by:

- Checking if `flex`, `hidden`, `block` from Ember's `global.css` are overriding Tailwind layout utilities
- Verifying the sidebar container has the correct scoping selector
- Ensuring the unlayered import order places Tailwind after Ember CSS

3.2. **Verify media queries work.** Test responsive breakpoints by resizing the viewport in Playwright MCP. Common fix: ensure `@tailwindcss/vite` is properly configured (it handles media query generation differently than the v3 PostCSS plugin).

3.3. **Verify arbitrary values work.** Test screens using custom values like `mt-[284px]`, `w-[calc(100%-2rem)]`, etc. If missing, ensure `@source` directives cover all relevant files.

3.4. **Run visual regression against baseline.** Compare all Admin screens. Fix any diffs:

- Layout shifts → likely cascade/specificity issue
- Color changes → likely default border/ring color changes
- Spacing changes → likely renamed utility (e.g., `shadow` → `shadow-sm`)
- Missing elements → likely tree-shaking or `hidden` attribute priority change

---

### Phase 4: Secondary App Migration (2–3 days)

**Goal:** Migrate remaining React apps one by one.

For each app (`stats`, `activitypub`, `posts`):

4.1. Ensure the app's specific TailwindCSS config (if any) is migrated to CSS-first.
4.2. Run the upgrade tool.
4.3. Fix renamed utilities.
4.4. Fix default color/border changes.
4.5. Run visual regression for that app's screens.
4.6. Fix any diffs before moving to the next app.

---

### Phase 5: Legacy React Apps (`admin-x-*`) (2–3 days)

**Goal:** Migrate `admin-x-settings` and `admin-x-design-system`. These are lower priority since they'll be refactored, but they still need to work.

5.1. Run the upgrade tool.
5.2. Update classnames.
5.3. Ensure components imported from Shade work correctly (they should, after Phase 2).
5.4. Visual regression test the Settings screens.
5.5. Fix any regressions.

---

### Phase 6: Cleanup & Verification (1–2 days)

**Goal:** Final pass to ensure everything is solid.

6.1. **Delete old config files.** Remove all `tailwind.config.js/ts/cjs` files that have been fully migrated to CSS.

6.2. **Remove deprecated packages.** Clean up `package.json` files: remove `tailwindcss-animate`, `postcss-import`, `autoprefixer`, old Tailwind plugins that are now built-in.

6.3. **Run the full visual regression suite** one final time across all screens.

6.4. **Run existing E2E tests** (`yarn test:e2e` or Playwright tests in `/e2e/`).

6.5. **Run existing unit/integration tests** to catch any broken imports.

6.6. **Cross-browser spot check.** Verify in Chrome, Firefox, and Safari (TailwindCSS v4 targets Safari 16.4+, Chrome 111+, Firefox 128+).

6.7. **Performance check.** Compare CSS build times before/after. Expect 2–5x improvement.

6.8. **Update documentation.** Update `CLAUDE.md`, `AGENTS.md`, and any contributing docs to reflect the new CSS architecture.

---

## 7. Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Ember CSS overrides break React layouts | High | Use unlayered Tailwind imports; add `@source` for full scanning; scope React containers |
| Subtle color shifts from OKLCH color model | Medium | Keep HSL colors in Shade initially; defer OKLCH migration to a future PR |
| `tailwind-merge` incompatibility | Medium | Update to latest `tailwind-merge` which has v4 support |
| Storybook breaks with v4 | Medium | Update Storybook Tailwind integration; may need `@tailwindcss/postcss` for Storybook separately |
| Third-party Radix UI component styles affected | Low | Radix uses inline styles / data attributes, minimal Tailwind dependency |
| Build time regression | Low | v4 is benchmarked 2–5x faster; monitor during migration |

---

## 8. File-by-File Migration Checklist

For each in-scope app, the AI agent should process these files:

- [ ]  `package.json` — Update `tailwindcss`, add `@tailwindcss/vite`, remove deprecated deps
- [ ]  `tailwind.config.js/ts/cjs` — Convert to CSS `@theme` block (or delete if fully migrated)
- [ ]  `postcss.config.js/mjs` — Replace `tailwindcss` + `autoprefixer` with `@tailwindcss/postcss` (or remove if using Vite plugin)
- [ ]  `vite.config.ts` — Add `@tailwindcss/vite` plugin
- [ ]  Main CSS file (e.g., `index.css`, `globals.css`) — Replace `@tailwind` directives with `@import "tailwindcss"` (or unlayered imports), add `@source`, `@theme`, animation imports
- [ ]  All `.tsx` / `.jsx` files — Fix renamed utilities, border defaults, important modifier syntax
- [ ]  Storybook config (`.storybook/`) — Update CSS imports and Tailwind integration

---

## 9. AI Agent Instructions

When working on this migration, AI agents should:

1. **Always capture a screenshot before and after changes.** Use Playwright MCP's `browser_take_screenshot` tool.
2. **Work one phase at a time.** Do not skip ahead.
3. **Work one app at a time** within multi-app phases.
4. **After every code change, restart the dev server** and re-verify visually.
5. **When encountering a visual regression, inspect the rendered DOM** using Playwright MCP's `browser_snapshot` to check computed styles and identify which CSS rule is winning.
6. **Never assume the upgrade tool caught everything.** Always do a manual review of diffs.
7. **Keep changes atomic.** Each commit should represent one logical step (e.g., "migrate Shade CSS variables", "fix Admin sidebar visibility").
8. **If a class appears to have no CSS generated for it**, check `@source` directives first — this is the most common cause of missing styles in v4.
9. **If a layout breaks**, check whether the element has a `hidden` attribute (v4 changed priority) and check cascade layer conflicts with Ember CSS.
10. **Reference this PRD** at each phase for the specific steps and known pitfalls.

---

## 10. Estimated Timeline

| Phase | Duration | Dependencies |
| --- | --- | --- |
| Phase 0: Preparation & Baseline | 1–2 days | None |
| Phase 1: Infrastructure | 2–3 days | Phase 0 |
| Phase 2: Shade Design System | 3–5 days | Phase 1 |
| Phase 3: Admin App | 2–3 days | Phase 2 |
| Phase 4: Secondary Apps | 2–3 days | Phase 2 |
| Phase 5: Legacy React Apps | 2–3 days | Phase 2 |
| Phase 6: Cleanup & Verification | 1–2 days | Phases 3–5 |
| **Total** | **~12–21 days** |  |

Phases 3, 4, and 5 can partially overlap since they target independent apps — the dependency is only on Phase 2 (Shade) being complete.

---

## 11. Appendix: Quick Reference

### TailwindCSS v4 Import Patterns

```css
/* Standard (with cascade layers) — for standalone apps */
@import "tailwindcss";

/* Unlayered (for coexistence with non-layered CSS like Ember) */
@import "tailwindcss/theme.css";
@import "tailwindcss/preflight.css";
@import "tailwindcss/utilities.css";

/* With legacy JS config (transition period) */
@import "tailwindcss";
@config "./tailwind.config.js";

/* Source scanning for monorepo */
@source "../other-app/src/**/*.{ts,tsx}";
```

### ShadCN/UI v4 CSS Variable Pattern

```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 89.8%);
  --ring: hsl(0 0% 3.9%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  /* ... */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

### Playwright Visual Regression Config

```tsx
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/visual-regression',
  use: {
    baseURL: 'http://localhost:2368',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'visual-regression',
      use: { browserName: 'chromium' },
    },
  ],
});
```
