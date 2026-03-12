# Admin-First Tailwind Config → CSS-First Migration Map & Plan

## Summary
- Goal: migrate Admin scope from JS Tailwind config to CSS-first tokens/variants while preserving current behavior and zero visual regressions.
- Scope locked: `apps/admin`, `apps/shade`, `apps/posts`, `apps/stats`, `apps/activitypub`, `apps/admin-x-settings` first; `apps/admin-x-design-system` included as a dependency/compat lane.
- Decision: keep the current unlayered import strategy (required for Ember coexistence), replace `@config` and preset-based token/scoping gradually.

## Current State Map (What exists today)
1. **Production Admin CSS lane (active)**
- Central build is in [apps/admin/src/index.css](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin/src/index.css:1) via `@source` + `@import "@tryghost/shade/styles.css"`.
- Tailwind v4 plugin is centralized in [apps/admin/vite.config.ts](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin/vite.config.ts:6).
- This is the real runtime lane for embedded apps (posts/stats/activitypub/settings).

2. **Shade token lane (active bridge)**
- [apps/shade/styles.css](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/styles.css:23) uses unlayered imports, plus `@config` at line 28.
- Runtime CSS variables already exist in `:root`/`.dark` in the same file.
- Token scales/variants/animations still live in [apps/shade/tailwind.config.cjs](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/tailwind.config.cjs:1).

3. **Preset/scoping lane (legacy compatibility)**
- [apps/shade/tailwind.cjs](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/tailwind.cjs:1) provides `shadePreset(selector)` (historical app-level scoping).
- App configs (admin/posts/stats/activitypub/settings) still reference presets, but are mostly not part of the production Admin CSS path now.

4. **Legacy Storybook/design-system lane (hardest dependency)**
- `admin-x-design-system` still compiles with v3-style Tailwind imports in [apps/admin-x-design-system/styles.css](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin-x-design-system/styles.css:3) and v3 PostCSS in [apps/admin-x-design-system/postcss.config.cjs](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/admin-x-design-system/postcss.config.cjs:1).
- This is the main technical drag on full config removal in Admin scope.

## Technical Blockers (and status)
- **No hard platform blocker** to CSS-first in Tailwind v4.
- **Blocker A (migration work):** custom theme scales (screens, spacing, shadows, typography, animations, dark variant) must be redefined in CSS (`@theme`, `@custom-variant`, keyframes/utilities equivalents).
- **Blocker B (compat):** `shadePreset(selector)` consumers need a replacement/deprecation window.
- **Blocker C (legacy lane):** `admin-x-design-system` Storybook/build is still v3-config driven.
- **Blocker D (docs/tooling):** docs and `components.json` currently describe config as token source and must be rewritten in lockstep.

## Implementation Plan (Decision-complete)
### Phase 0: Baseline + inventory freeze
- Freeze current token inventory from `apps/shade/tailwind.config.cjs` into a migration matrix: `theme key → CSS target`.
- Snapshot visual baselines for Admin screens and Shade Storybook stories.
- Exit criteria: inventory approved; baseline suite green.

### Phase 1: Introduce CSS-first token source in Shade (dual-run, no behavior change)
- Add a new CSS token file in Shade (single source): includes `@theme` tokens, `@custom-variant dark`, and animation token/keyframe definitions.
- Keep `@config` temporarily; wire Shade styles so CSS tokens are present but not authoritative yet.
- Ensure unlayered import order remains unchanged.
- Exit criteria: no visual diffs; both build and Storybook pass.

### Phase 2: Switch Shade from `@config` to CSS-only generation
- Remove `@config` from [apps/shade/styles.css](/Users/peterzimon/Code/Ghost-DES-1301-twcss4/apps/shade/styles.css:28).
- Replace all config-provided semantics with CSS-defined equivalents (`@theme` values for color/spacing/type/shadow/radius/screens + dark variant + animations).
- Keep existing `:root`/`.dark` runtime vars and unlayered imports.
- Exit criteria: Admin runtime unchanged, Shade Storybook unchanged, no missing utilities in compiled CSS.

### Phase 3: Decommission preset-chain for Admin-first apps
- Mark app-level `tailwind.config.*` files in admin/posts/stats/activitypub/settings as deprecated and remove them once confirmed unused in CI/build tasks.
- Replace `@tryghost/shade/tailwind.cjs` preset guidance with CSS-import guidance for Admin-first consumers.
- Keep a compatibility export for one release cycle if any non-Admin consumer still imports preset.
- Exit criteria: no production task references removed configs; no downstream breakages.

### Phase 4: Migrate admin-x-design-system legacy lane
- Upgrade admin-x-design-system styles/postcss from v3-style imports to v4-compatible CSS-first token consumption.
- Align Storybook to CSS-first token source (no local config-as-token-source).
- Remove dependency of admin-x-settings on config-driven design-system styling.
- Exit criteria: admin-x-design-system Storybook/build green under CSS-first model.

### Phase 5: Cleanup and hard removal
- Remove remaining `tailwind.config.*` files in Admin scope that are no longer consumed.
- Remove `tailwind.cjs` preset export once compatibility window ends.
- Update docs: architecture/tokens/readmes/AGENTS to declare CSS as the only token source.
- Exit criteria: zero config-token references in Admin scope; docs and build scripts consistent.

## Public Interfaces / Contract Changes
- Deprecate `@tryghost/shade/tailwind.cjs` preset API (replace with CSS-token import contract).
- Keep `@tryghost/shade/styles.css` as the stable runtime entrypoint.
- Document new token contract as CSS-first (`@theme` + runtime vars), not JS config.
- Transition policy: one release cycle with deprecation warning notes before hard removal of preset export.

## Test Plan
- Run `yarn build` at repo root after each phase boundary.
- Run `yarn lint` at repo root at Phase 2/4/5 boundaries.
- Run Admin visual regression suite (same baseline set used in migration).
- Run `yarn storybook` and `yarn build-storybook` in `apps/shade` and `apps/admin-x-design-system`.
- Run focused smoke paths in Admin: sidebar/layout breakpoints, posts/stats/activitypub/settings pages, dark mode, animations, arbitrary values.
- Acceptance threshold: no visual regressions beyond existing tolerance; no missing class generation; no CSS pipeline errors.

## Assumptions and Defaults
- Scope is Admin-first; public UMD apps are out-of-scope in this roadmap.
- Unlayered Tailwind import strategy remains mandatory due Ember CSS cascade behavior.
- Zero-regression policy is strict; migration is staged with dual-run before removals.
- Cleanup removes only confirmed-unused config files in Admin scope; anything still referenced by CI/build remains until its lane is migrated.
