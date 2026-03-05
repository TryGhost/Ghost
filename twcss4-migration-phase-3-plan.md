# Phase 3: Fix Visual Regressions — TailwindCSS v4

## Context

Phases 1 and 2 are complete. The app loads, charts work, but visual regressions persist from Phase 1. This phase investigates and fixes them.

## Root Cause Analysis

The most likely cause of regressions is the **`important: '.shade'` config option**. In v3, this generated every utility as `.shade .utility {}` (specificity 0,2,0). In v4 with `@config`, the selector-based `important` option behavior may have changed — if v4 silently ignores it, all utilities now have regular specificity (0,1,0), causing Ember CSS and other styles to win cascade battles they previously lost.

Other potential causes:
- **Default border color change**: v4 border defaults to `currentColor` instead of `gray-200`. Shade's `* { @apply border-border }` in `@layer base` may have lower cascade priority than unlayered styles.
- **`darkMode` variant syntax**: The config uses `['variant', ['&:is(.dark *):not(.light *)']]` — may need v4 adaptation.
- **`corePlugins.preflight: false`**: May behave differently in v4 with `@config`.
- **Ember CSS collisions**: `.flex`, `.hidden`, `.block` etc. in `ghost/admin/app/styles/patterns/global.css`.

---

## Steps

### 3.1 — Diagnose: inspect the actual CSS output

Before making changes, verify what's happening in the browser:
1. Open Ghost Admin at `localhost:2368/ghost/`
2. Open DevTools → inspect a Shade component (e.g., a button or sidebar element)
3. Check: do Tailwind utility rules have the `.shade` ancestor selector? If not, `important: '.shade'` is being ignored.
4. Check: are Ember CSS rules overriding Tailwind utilities?
5. Take note of specific visual regressions to track.

### 3.2 — Fix the `important` strategy

**Option A (recommended first attempt): Change to `important: true`**

In `apps/shade/tailwind.config.cjs`, change:
```js
important: '.shade',
```
to:
```js
important: true,
```

This adds `!important` to ALL utilities, guaranteeing they win over any Ember CSS. This is aggressive but matches the original intent — Tailwind utilities should always win inside Shade/React components.

**Tradeoff**: `!important` on all utilities means inline styles can't override them. However, Shade uses CVA + `cn()` (tailwind-merge) for variant handling, not inline styles, so this should be safe.

**Option B (if A causes issues): Remove `important` entirely**

If `important: true` causes problems (e.g., component variants not applying correctly), remove `important` entirely and rely on the unlayered import cascade order. This requires ensuring Tailwind CSS loads AFTER Ember CSS in the final HTML.

**Option C: v4-native selector scoping**

If neither A nor B works, explore v4's native `@variant` or CSS nesting to scope utilities. This is more complex and should be a last resort.

### 3.3 — Verify `darkMode` compatibility

Check if `darkMode: ['variant', ['&:is(.dark *):not(.light *)']]` works in v4 with `@config`. If dark mode is broken, may need to convert to v4's CSS-based dark mode configuration.

### 3.4 — Audit `@layer base` cascade priority

The `@layer base` block in `styles.css` contains:
```css
* { @apply border-border; }
body { @apply font-sans antialiased bg-background text-foreground; }
```

Since utilities are unlayered (highest cascade priority) and `@layer base` is a named layer (lower priority), verify:
- Border colors render correctly (not `currentColor`)
- Body background and text colors apply correctly

If `@layer base` rules are being overridden, move critical resets out of `@layer base` into unlayered CSS.

### 3.5 — Check bare `border` usage in components

Search for `border` class without explicit color in Shade and app components. In v4, if the `@layer base` `border-border` reset isn't winning, these would show `currentColor` borders instead of the intended `--border` color.

### 3.6 — Test and iterate

After each fix:
1. Restart dev server
2. Check the specific regressions noted in 3.1
3. Navigate through: Dashboard, Posts, Members, Settings, Stats
4. Compare with expected appearance

### 3.7 — Commit

---

## Files likely to modify

| File | Changes |
|---|---|
| `apps/shade/tailwind.config.cjs` | `important` strategy change |
| `apps/shade/styles.css` | Possibly move base resets out of `@layer` |
| Various `.tsx` files | Fix any remaining regressions found during testing |

## What we are NOT doing in Phase 3

- NOT converting to `@theme inline` (keep `@config` bridge)
- NOT removing the JS config file
- NOT renaming Ember CSS classes (that's a much larger task)
- NOT running Playwright visual regression (manual verification for now)
