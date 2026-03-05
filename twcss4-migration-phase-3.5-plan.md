# Phase 3.5: Remove `important: true` from Shade Tailwind Config

## Context

Phase 3 changed `important: '.shade'` to `important: true` in `apps/shade/tailwind.config.cjs` because v4's `@config` bridge silently ignores selector-based importance. This causes EVERY Tailwind utility to get `!important`, which prevents inline styles and custom CSS from overriding them.

## Why It's Safe to Remove

The `important` flag was originally needed to beat Ember's Spirit CSS collision classes (`.flex`, `.relative`, `.absolute`, `.items-center`, etc.). But those Spirit classes are ALL bare selectors with specificity (0,1,0) — the same as Tailwind utilities.

CSS source order resolves the tie:
1. Ember CSS loads first: `<link href="assets/vendor.css">` + `<link href="assets/ghost.css">`
2. Vite/Tailwind CSS loads after: injected via `{{content-for "head-footer"}}`
3. **Later wins** when specificity is equal — Tailwind naturally beats Spirit.

Ember's compound selectors (`.gh-app .hidden { ... !important }`) don't affect React components because `.gh-app` is an Ember component class, and React renders in the separate `#root` element.

## Change

**File:** `apps/shade/tailwind.config.cjs` (line 4)

```diff
- important: true,
+ important: false,
```

## Verification

1. `yarn dev` — Ghost Admin loads normally
2. Check in DevTools that Tailwind utilities no longer have `!important` on every property
3. Test that `.flex`, `.relative`, `.absolute` from Tailwind still win over Spirit CSS (inspect computed styles)
4. Test that inline `style={}` attributes can override Tailwind utilities (e.g., dynamic colors on chart components)
5. Test responsive show/hide patterns (`hidden md:block`) still work correctly
