# Phase 1: Infrastructure Swap — TailwindCSS v3 → v4

## Context

Phase 0 is complete: visual regression baselines captured, configs audited, branch `DES-1301-twcss4-migration-cld` created. Phase 1 swaps build tooling to TW v4. Goal: `yarn dev` boots without build errors. **Visual regressions are expected and acceptable** — fixed in Phase 2+.

Key constraint: Ember's CSS is unlayered, so TW v4's default `@layer` output loses every specificity battle. We must use **unlayered imports** (`tailwindcss/theme.css`, `tailwindcss/utilities.css`) instead of `@import "tailwindcss"`.

Per MEMORY.md: `admin-x-settings` and `admin-x-design-system` stay on v3 (consumed via `@source` directives).

### Architecture: Centralized CSS Processing

Only the **admin app** processes Tailwind CSS at build time. Shade is a library build (Vite lib mode → `es/`) that exports raw source; its `styles.css` gets processed by admin's Vite pipeline. Posts, stats, and activitypub are embedded React components within admin sharing its CSS build.

So we only need `@tailwindcss/vite` in **one place**: `apps/admin/vite.config.ts`.

---

## Steps

### 1.1 — Update dependencies in `apps/shade/package.json`

**Remove** from devDependencies:
- `tailwindcss` (3.4.18), `postcss-import` (16.1.1), `autoprefixer` (10.4.21)
- `@tailwindcss/forms` (0.5.10), `@tailwindcss/line-clamp` (0.4.4)
- `tailwindcss-animate` (1.0.7)

**Add** to devDependencies:
- `tailwindcss@^4`, `@tailwindcss/vite@^4`, `@tailwindcss/postcss@^4` (Storybook needs PostCSS), `tw-animate-css@^1`

**Keep:** `postcss` (8.5.6) — still needed as peer dep, `tailwind-merge` (2.6.0) — already v4-compatible.

### 1.2 — Add `@tailwindcss/vite` to admin's Vite config

**File:** `apps/admin/vite.config.ts`

Add as the **first** plugin (must process CSS before other plugins):
```ts
import tailwindcss from "@tailwindcss/vite";
plugins: [tailwindcss(), react(), emberAssetsPlugin(), ...],
```

### 1.3 — Remove PostCSS-based Tailwind processing

| File | Action |
|---|---|
| `apps/shade/postcss.config.cjs` | Replace contents with `@tailwindcss/postcss` only (for Storybook) |
| `apps/admin/postcss.config.js` | **Delete** (admin uses `@tailwindcss/vite` now) |
| `apps/posts/postcss.config.cjs` | **Delete** (consumed by admin) |
| `apps/stats/postcss.config.cjs` | **Delete** (consumed by admin) |
| `apps/activitypub/postcss.config.cjs` | **Delete** (consumed by admin) |

New `apps/shade/postcss.config.cjs`:
```js
module.exports = {
    plugins: {
        '@tailwindcss/postcss': {}
    }
};
```

### 1.4 — Migrate `apps/shade/styles.css` to v4

Replace v3 directives with v4 unlayered imports and add `@config` to use existing JS config during transition:

**Before:**
```css
@import "./preflight.css";
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
```

**After:**
```css
@import "tailwindcss/theme.css";
@import "./preflight.css";
@import "tailwindcss/utilities.css";

@config "./tailwind.config.cjs";
```

Notes:
- Skip `tailwindcss/preflight.css` — Shade has its own scoped preflight (`preflight.css`) and disables TW preflight in v3 config.
- `@config` tells v4 to load the legacy JS config with all custom theme values (colors, spacing, fonts, animations). The `important` key will be ignored by v4 but all theme values will load.
- `theme.css` comes before custom preflight so theme variables are available.

### 1.5 — Add `@source` directives in `apps/admin/src/index.css`

These replace the `content` array from `apps/admin/tailwind.config.js`. Paths are relative to `apps/admin/src/`:

```css
@source "../../shade/src/**/*.{ts,tsx}";
@source "../../posts/src/**/*.{ts,tsx}";
@source "../../stats/src/**/*.{ts,tsx}";
@source "../../activitypub/src/**/*.{ts,tsx}";
@source "../../admin-x-settings/src/**/*.{ts,tsx}";
@source "../../admin-x-design-system/src/**/*.{ts,tsx}";
```

Add these at the top of `apps/admin/src/index.css`, before the `@import "@tryghost/shade/styles.css"` line.

### 1.6 — Install and boot

```bash
yarn install
yarn dev
```

Fix any build/compilation errors until the app loads in the browser.

---

## Files to modify

| File | Action |
|---|---|
| `apps/shade/package.json` | Update deps (remove v3 packages, add v4 packages) |
| `apps/admin/vite.config.ts` | Add `@tailwindcss/vite` plugin |
| `apps/shade/postcss.config.cjs` | Replace with `@tailwindcss/postcss` only |
| `apps/admin/postcss.config.js` | **Delete** |
| `apps/posts/postcss.config.cjs` | **Delete** |
| `apps/stats/postcss.config.cjs` | **Delete** |
| `apps/activitypub/postcss.config.cjs` | **Delete** |
| `apps/shade/styles.css` | Replace `@tailwind` directives with unlayered v4 imports + `@config` |
| `apps/admin/src/index.css` | Add `@source` directives at top |

## What we are NOT doing in Phase 1

- NOT running `npx @tailwindcss/upgrade` (risky per past failures — manual approach)
- NOT renaming utility classes (Phase 2)
- NOT converting CSS variables to `@theme inline` (Phase 2)
- NOT replacing `tailwindcss-animate` with `tw-animate-css` imports (Phase 2)
- NOT touching admin-x-settings or admin-x-design-system configs (stay on v3)
- NOT modifying Storybook config (Phase 2)
- NOT changing any `.tsx` component files

## Verification

1. `yarn dev` runs without build errors
2. Open `http://localhost:2368/ghost/` — app loads, navigation works
3. DevTools → Network: CSS files served (no 404s)
4. DevTools → Console: No Tailwind/PostCSS/Vite CSS errors
5. Visual regressions expected — that's OK for Phase 1
