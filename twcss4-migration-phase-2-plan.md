# Phase 2: Shade Design System Migration — TailwindCSS v4

## Context

Phase 1 is complete: TW v4 build infrastructure is in place, `yarn dev` boots, the app loads. Visual regressions exist but are expected. Phase 2 migrates the Shade design system to full v4 patterns. This is the foundation every other app depends on — nothing downstream can be correct until Shade is correct.

We're currently using `@config "./tailwind.config.cjs"` as a bridge to load the legacy JS config. Phase 2 keeps this bridge while fixing the most impactful issues.

---

## Audit Summary (from Explore agent)

| Item | Count | Files |
|---|---|---|
| `outline-none` → `outline-hidden` | 42 | 18 files |
| `rounded-sm` → `rounded-xs` | 18 | 11 files |
| `shadow-sm` → `shadow-xs` | 6 | 3 files |
| `!` prefix important modifiers | ~80 | 18 files |
| `theme()` calls in CSS | 2 | `preflight.css` |
| `theme()` calls in TSX | 2 | `sidebar.tsx` |
| `@apply` directives | 6 | `styles.css` (5), `preflight.css` (1) |
| CSS vars needing `hsl()` wrapping | ~50 | `styles.css` |

---

## Steps

### 2.1 — Convert CSS variables to include `hsl()` wrappers

**File:** `apps/shade/styles.css`

The v3 pattern stores raw HSL values and wraps them in the config:
```css
/* v3 — raw HSL in CSS, hsl() in config */
:root { --background: 0 0% 100%; }
/* config: background: 'hsl(var(--background))' */
```

Convert to v4 pattern where CSS variables include the full color value:
```css
/* v4 — full hsl() in CSS */
:root { --background: hsl(0 0% 100%); }
```

This affects all ~50 CSS variables in both the `:root` and `.dark` blocks. After this change, the config's `'hsl(var(--background))'` becomes `'var(--background)'` (or we register via `@theme inline`).

**Also update** the color references in `tailwind.config.cjs` from `'hsl(var(--X))'` to `'var(--X)'` since the hsl() is now in the CSS variable itself.

### 2.2 — Add `@theme inline` block for semantic color tokens

**File:** `apps/shade/styles.css` (after the CSS variable blocks)

Register the semantic tokens with TW v4 so it can use them for opacity modifiers and class generation:

```css
@theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-sidebar-background: var(--sidebar-background);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-ring: var(--sidebar-ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-chart-gray: var(--chart-gray);
    --color-chart-darkgray: var(--chart-darkgray);
    --color-chart-rose: var(--chart-rose);
    --color-chart-orange: var(--chart-orange);
    --color-chart-amber: var(--chart-amber);
    --color-chart-yellow: var(--chart-yellow);
    --color-chart-green: var(--chart-green);
    --color-chart-teal: var(--chart-teal);
    --color-chart-blue: var(--chart-blue);
    --color-chart-purple: var(--chart-purple);
}
```

**Note:** The `@theme inline` block registers these with TW v4 so utilities like `bg-background`, `text-foreground` etc. work. The `inline` keyword prevents TW from generating CSS variables for them (since we already define them in `:root`).

After adding `@theme inline`, the `extend.colors` block in `tailwind.config.cjs` for these semantic tokens can be removed (they'll be picked up from @theme). However, keep the non-semantic colors (grey, gray, green, blue, etc.) in the JS config.

### 2.3 — Wire in `tw-animate-css`

**File:** `apps/shade/styles.css`

Add after the TW imports:
```css
@import "tw-animate-css";
```

This replaces the `tailwindcss-animate` plugin we removed in Phase 1. The custom keyframes/animations in `tailwind.config.cjs` (toaster, modal, fade, accordion, spin) will still be loaded via `@config`.

### 2.4 — Rename deprecated utility classes in Shade components

All changes in `apps/shade/src/`:

**a) `outline-none` → `outline-hidden`** (42 occurrences, 18 files)
- Find-and-replace across all `.tsx` files
- Files: popover, toggle, textarea, tabs, switch, sidebar, select, input, input-group, hover-card, filters, dropdown-menu, dialog, checkbox, chart, button, badge, color-picker

**b) `rounded-sm` → `rounded-xs`** (18 occurrences, 11 files)
- Files: post-share-modal, sheet, select, dropdown-menu, card, tabs, command, badge, checkbox, kbd, toggle

**c) `shadow-sm` → `shadow-xs`** (6 occurrences, 3 files)
- Files: switch.stories, banner, toggle
- **IMPORTANT:** Verify these are using TW's built-in shadow-sm, not Shade's custom `sm` shadow. Since Shade overrides the entire `boxShadow` theme, these classes map to Shade's custom values. The rename may NOT be needed if using `@config` with the legacy JS config. Test after rename — if shadows look wrong, revert.

**d) `!` prefix → suffix** (~80 occurrences, 18 files)
- Convert `!mt-0` → `mt-0!`, `!text-md` → `text-md!`, etc.
- Files: tabs, sidebar, filters, chart, button, color-picker, shade-provider, utm-campaign-tabs, post-share-modal, form, pagemenu, field, card, gh-chart, and stories files
- **Note:** `!` prefix still works in v4 but is deprecated. Convert for future-proofing.

### 2.5 — Fix `theme()` calls

**a) CSS files** (`apps/shade/preflight.css` lines 37 and 127):
```css
/* Before */
font-family: theme("fontFamily.sans", ...fallback...);
font-family: theme("fontFamily.mono", ...fallback...);

/* After */
font-family: var(--font-sans, ...fallback...);
font-family: var(--font-mono, ...fallback...);
```

**b) TSX files** (`apps/shade/src/components/ui/sidebar.tsx` lines 233, 245):
```tsx
/* Before */
theme(spacing.4)

/* After */
var(--spacing-4)
```

Note: This requires that `--spacing-4` is registered as a TW v4 theme variable. Since we're using `@config` with Shade's custom spacing scale (where `4` = `1.6rem`), we need to verify the variable name. In v4 with legacy config, spacing values become `--spacing-*`. If the custom 0.4rem-based scale doesn't map correctly, hardcode the value (`1.6rem`) instead.

### 2.6 — Verify `@apply` directives

**File:** `apps/shade/styles.css` (5 occurrences) and `apps/shade/preflight.css` (1 occurrence)

These should continue to work in v4 but verify:
- `@apply font-sans text-black text-base leading-normal` — uses theme fonts/sizes
- `@apply border-border` — uses semantic color
- `@apply bg-background text-foreground` — uses semantic colors
- `@apply text-gray-500` (in preflight.css) — uses custom color scale

Run `yarn dev` after changes and check for `@apply` errors in the console.

### 2.7 — Fix the duplicate `@layer base` blocks

**File:** `apps/shade/styles.css`

Currently has two duplicate `@layer base` blocks (lines 30-127 and 129-136, then again at 188-195). These set the same properties. In v4 with unlayered imports, `@layer base` blocks may behave differently. Consolidate into a single block and move outside `@layer` if needed for the unlayered approach.

### 2.8 — Update Storybook configuration

**File:** `apps/shade/.storybook/main.tsx`

Storybook uses its own build pipeline (not admin's Vite). Since we kept `@tailwindcss/postcss` in shade's postcss.config.cjs, Storybook should pick it up automatically via `@storybook/react-vite`. Verify by running:
```bash
cd apps/shade && yarn storybook
```

If Storybook fails, it may need the `@tailwindcss/postcss` config adjusted or a Storybook-specific Vite plugin override.

### 2.9 — Visual testing

Run visual regression suite to see how regressions have improved:
```bash
npx playwright test -c e2e/visual-regression
```

Also manually check in Storybook:
- Button (all variants), Input, Dialog, Dropdown, Card, Table, Tabs, Alert, Toast
- Animated components: Dialog open/close, Dropdown expand, Accordion
- Dark mode variants

---

## Files to modify

| File | Action |
|---|---|
| `apps/shade/styles.css` | Wrap CSS vars in hsl(), add @theme inline, add tw-animate-css import, consolidate @layer blocks |
| `apps/shade/tailwind.config.cjs` | Update extend.colors from `hsl(var(--X))` to `var(--X)`, remove semantic colors covered by @theme |
| `apps/shade/preflight.css` | Replace theme() with var() |
| `apps/shade/src/components/ui/*.tsx` (18+ files) | outline-none → outline-hidden |
| `apps/shade/src/components/ui/*.tsx` (11 files) | rounded-sm → rounded-xs |
| `apps/shade/src/components/ui/*.tsx` (3 files) | shadow-sm → shadow-xs (verify needed) |
| `apps/shade/src/**/*.tsx` (18 files) | ! prefix → suffix |
| `apps/shade/src/components/ui/sidebar.tsx` | theme() → var() |

## What we are NOT doing in Phase 2

- NOT converting the full JS config to CSS-first @theme (keep @config bridge)
- NOT changing non-semantic theme values (custom spacing, shadows, fonts — stay in JS config)
- NOT touching admin, posts, stats, activitypub component files (Phase 3-4)
- NOT running the upgrade tool

## Verification

1. `yarn dev` boots without errors
2. Storybook loads: `cd apps/shade && yarn storybook`
3. Inspect a Shade component with `border` — confirm color is not black/currentColor
4. Inspect a `.flex` element inside Shade — confirm TW's rule wins over Ember's
5. Check animated components (Dialog, Dropdown, Accordion) — animations work
6. Run `npx playwright test -c e2e/visual-regression` — regressions should decrease vs Phase 1
