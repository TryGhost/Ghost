# TailwindCSS v3 → v4 Migration: Phase 0 Audit

**Date:** March 2, 2026
**Branch:** main (pre-migration baseline)

---

## 1. Tailwind Config Inventory

### 1.1 apps/shade/tailwind.config.cjs (Foundation Design System)

**Important:** `important: '.shade'`
**Preflight:** Disabled (`preflight: false`)
**Dark mode:** `['variant', ['&:is(.dark *):not(.light *)']]`
**Content:** `['./src/**/*.{js,ts,jsx,tsx}']`
**Plugin:** `tailwindcss-animate`

**Custom theme values that MUST be preserved:**
- **Screens:** sm:480px, md:640px, sidebar:800px, lg:1024px, sidebarlg:1240px, xl:1320px, xxl:1440px, xxxl:1600px, tablet:860px
- **Colors:** ghostaccent (CSS var), grey/gray (50-975), green, blue, purple, pink, red, orange, yellow, lime + ShadCN semantic colors (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-*, sidebar-*)
- **Spacing:** Custom 0.4rem-based scale (30+ values)
- **Font families:** 18 custom fonts (Inter primary, serif/display/mono variants)
- **Font sizes:** 2xs through 9xl (rem-based)
- **Box shadows:** xs, sm, md, md-heavy, lg, xl, inner, none
- **Border radius:** Uses CSS variables: `calc(var(--radius) - N)`
- **Animations:** toaster-in/out, fade-in/out, modal-in variants, accordion-up/down, spin
- **Letter spacing:** tightest through widest

**Export pattern:** `apps/shade/tailwind.cjs` wraps config as a function: `selector => ({ ...config, important: selector })`

### 1.2 apps/admin/tailwind.config.js (Hub — scans all apps)

**Preset:** `shadePreset(".shade-admin")` → sets `important: '.shade-admin'`
**Content:** Scans 7 directories:
- `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- `../shade/src/**`, `../posts/src/**`, `../stats/src/**`
- `../activitypub/src/**`, `../admin-x-settings/src/**`, `../admin-x-design-system/src/**`

**Extra config:**
- Keyframes: `lineExpand`, `scale` (ActivityPub)
- Animations: `onboarding-handle-bg/line/label`, `onboarding-next-button`, `onboarding-followers`
- Plugin: `.break-anywhere` utility (`overflow-wrap: anywhere`)

### 1.3 apps/posts/tailwind.config.cjs

**Preset:** `shadePreset('.shade-posts')`
**Content:** `./index.html`, `./src/**/*`, `../../node_modules/@tryghost/shade/es/**/*`
**Extra config:** None

### 1.4 apps/stats/tailwind.config.cjs

**Preset:** `shadePreset('.shade-stats')`
**Content:** `./index.html`, `./src/**/*`, `../../node_modules/@tryghost/shade/es/**/*`
**Extra config:** None

### 1.5 apps/activitypub/tailwind.config.cjs

**Preset:** `adminXPreset('.shade-activitypub')`
**Content:** `./index.html`, `./src/**/*`, `../../node_modules/@tryghost/shade/es/**/*`
**Extra config:** Same `lineExpand`/`scale` keyframes and `onboarding-*` animations as admin, plus `.break-anywhere` plugin

### 1.6 apps/admin-x-settings/tailwind.config.cjs

**Preset:** `adminXPreset('.admin-x-settings')` (from admin-x-design-system)
**Content:** `./index.html`, `./src/**/*`, `../../node_modules/@tryghost/admin-x-design-system/es/**/*`
**Extra config:** None

### 1.7 apps/admin-x-design-system/tailwind.config.cjs (Legacy Design System)

**Important:** `important: '.admin-x-design-system'`
**Preflight:** Disabled
**Dark mode:** `['variant', [':is(.dark &):not(.light &)']]` (slightly different syntax from Shade)
**Content:** `['./src/**/*.{js,ts,jsx,tsx}']`
**Plugins:** None (no tailwindcss-animate)
**Note:** Same color/spacing/font scales as Shade but without ShadCN semantic colors. Export pattern identical to Shade's `tailwind.cjs`.

### 1.8 Out-of-scope configs (public apps — stay on v3)

- `apps/comments-ui/tailwind.config.js` — standalone, class-based dark mode
- `apps/sodo-search/tailwind.config.js` — standalone
- `apps/signup-form/tailwind.config.cjs` — standalone

---

## 2. PostCSS Config Inventory

All in-scope apps use the same PostCSS pipeline:
```js
{ 'postcss-import': {}, 'tailwindcss/nesting': {}, tailwindcss: {}, autoprefixer: {} }
```

Config files:
- `apps/shade/postcss.config.cjs` — source
- `apps/admin/postcss.config.js` — imports from shade
- `apps/posts/postcss.config.cjs` — imports from shade
- `apps/stats/postcss.config.cjs` — standalone (same pipeline)
- `apps/activitypub/postcss.config.cjs` — standalone (same pipeline)
- `apps/admin-x-design-system/postcss.config.cjs` — standalone (same pipeline)
- `apps/admin-x-settings/postcss.config.cjs` — imports from admin-x-design-system

---

## 3. Important / Specificity Strategy

**Current approach:** Selector-scoped `important` property.

| App | important selector | Wrapping element |
|---|---|---|
| Shade (standalone/Storybook) | `.shade` | `<div class="shade">` |
| Admin | `.shade-admin` | `<div class="shade shade-admin">` |
| Posts | `.shade-posts` | TBD |
| Stats | `.shade-stats` | TBD |
| ActivityPub | `.shade-activitypub` | TBD |
| admin-x-settings | `.admin-x-settings` | `<div class="admin-x-settings">` |
| admin-x-design-system | `.admin-x-design-system` | `<div class="admin-x-design-system">` |

**How it works:** Setting `important: '.shade-admin'` causes Tailwind to generate every utility as `.shade-admin .flex { display: flex; }` instead of `.flex { display: flex; }`. This adds one ancestor-class level of specificity (0,1,0 → 0,2,0 for most utilities), which is enough to beat the single-class selectors in Ember's `global.css`.

**V4 replacement strategy:**
- v4 doesn't support the `important` config key in the same way
- The unlayered import approach (`@import 'tailwindcss/utilities.css'` without `layer()`) puts Tailwind CSS in the implicit layer alongside Ember CSS
- Specificity boost must come from a different mechanism: CSS `@scope`, `@layer` ordering, or a build-time selector-wrapping plugin
- **Key decision needed in Phase 2:** How to replicate the `.shade-admin` ancestor specificity boost in v4

---

## 4. CSS Entry Point Chain

```
apps/admin/src/index.css
  └─ @import "@tryghost/shade/styles.css"  (= apps/shade/styles.css)
       ├─ @import "./preflight.css"         (custom scoped reset)
       ├─ @import "tailwindcss/base"
       ├─ @import "tailwindcss/components"
       ├─ @import "tailwindcss/utilities"
       ├─ @import url(...bunny.net fonts...)
       └─ @layer base { :root { --background: 0 0% 100%; ... } }
  └─ body.react-admin layout rules
```

**CSS variable format:** Raw HSL values WITHOUT `hsl()` wrapper:
```css
--background: 0 0% 100%;
```
Used in Tailwind config as: `'hsl(var(--background))'`

**V4 change needed:** Variables must include `hsl()` wrapper:
```css
--background: hsl(0 0% 100%);
```

---

## 5. Ember CSS Collisions

### Critical collisions (same classname, unlayered Ember CSS wins over layered Tailwind)

| Classname | Ember file | Ember definition | Tailwind equivalent |
|---|---|---|---|
| `.flex` | `patterns/global.css:695`, `spirit/_flexbox.css:12` | `display: flex` | `display: flex` |
| `.hidden` | `patterns/global.css:640` | `display: none` + visibility fallbacks | `display: none` |
| `.static` | `spirit/_position.css:10` | `position: static` | `position: static` |
| `.relative` | `spirit/_position.css:11` | `position: relative` | `position: relative` |
| `.absolute` | `spirit/_position.css:12` | `position: absolute` | `position: absolute` |
| `.fixed` | `spirit/_position.css:13` | `position: fixed` | `position: fixed` |
| `.sticky` | `spirit/_position.css:14` | `position: sticky` | `position: sticky` |
| `.truncate` | `spirit/_typography.css:40` | `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` | Same |
| `.outline` | `spirit/_outlines.css:12` | `outline: 1px solid` | Different default |
| `.right` | `patterns/global.css:682` | `float: right` | `float: right` |
| `.left` | `patterns/global.css:686` | `float: left` | `float: left` |

### Semantically different collisions (DANGER)

| Classname | Ember definition | Tailwind definition | Risk |
|---|---|---|---|
| `.table` | `patterns/tables.css:6` — Full table styling (borders, padding, striped rows) | `display: table` only | HIGH — Ember adds extensive styling |
| `.clip` | `spirit/_visibility.css:18` — `position:fixed !important; clip:rect(...)` | `clip-path: inset(50%)` | MEDIUM — Different CSS properties |
| `.show` | `patterns/global.css:633` — `display: block !important` | N/A (not a Tailwind utility) | LOW |

### Safe collisions (identical semantics)

Most position/display collisions are safe because they define the same CSS. The issue is purely about *which one wins* in the cascade, not about *different behavior*.

---

## 6. Visual Regression Test Suite

Created at `e2e/visual-regression/`:

- `playwright.config.ts` — Standalone config, runs against `yarn dev` on localhost:2368
- `auth.setup.ts` — One-time auth setup, saves storage state
- `capture-baselines.spec.ts` — Screenshots for 9 screens:
  - dashboard, posts-list, pages-list, tags-list, members-list
  - editor-new-post, settings, stats, activitypub
- `.gitignore` — Excludes auth state and test artifacts

**Usage:**
```bash
# Start Ghost
yarn dev

# Capture baselines (run on main, BEFORE migration)
npx playwright test -c e2e/visual-regression --update-snapshots

# Compare (run AFTER migration changes)
npx playwright test -c e2e/visual-regression
```

---

## 7. Summary: What Must Not Be Lost

This checklist should be verified after migration is complete:

- [ ] All 9 custom screen breakpoints (sm through tablet)
- [ ] All custom colors: 8 color scales + 15 ShadCN semantic tokens + chart-* tokens + sidebar-* tokens
- [ ] Custom spacing scale (0.4rem base unit, 30+ values)
- [ ] 18 font families
- [ ] Custom font size scale (2xs through 9xl, rem-based)
- [ ] 8 box shadow variants
- [ ] CSS-variable-based border radius
- [ ] 12 custom animations (toaster, fade, modal, accordion, spin)
- [ ] `.break-anywhere` utility plugin
- [ ] `important` specificity boost (currently `.shade-admin` selector scoping)
- [ ] Custom dark mode variant: `&:is(.dark *):not(.light *)`
- [ ] Preflight disabled in Shade (custom scoped reset used instead)
- [ ] ShadCN CSS variables (raw HSL → must become `hsl(...)` in v4)
- [ ] Font imports from bunny.net CDN
