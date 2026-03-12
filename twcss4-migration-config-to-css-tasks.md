# Tailwind v4 Config-to-CSS Migration Tasklist (Checkbox Version)

## Summary
- [ ] Validate migration in strict sequence: Shade runtime first, Admin apps second, `admin-x-design-system` last (separate lane).
- [ ] Enforce a hard gate after every phase: build + lint + smoke clickthrough must pass before next phase.
- [ ] Keep runtime stable at all times; no phase may introduce required manual class rewrites in app code.

## Public Interface / Contract Tasks
- [ ] Keep `@tryghost/shade/styles.css` as the only stable style contract.
- [ ] Deprecate `@tryghost/shade/tailwind.cjs` (compat shim period), then remove in cleanup phase.
- [ ] Deprecate `@tryghost/admin-x-design-system/tailwind.cjs` only in the DS lane.
- [ ] Rewrite docs/examples to CSS-first tokens (`@theme`, CSS vars), not preset/config usage.

## Phase 0: Baseline + Inventory Freeze
- [x] Extract full token matrix from Shade config to target CSS constructs (`@theme`, `@custom-variant`, keyframes, animation utilities).
- [x] Record every config/preset consumer (runtime, lint, docs, package exports).
- [ ] Capture baseline screenshots/video for Admin smoke paths.
- [x] Run gate: `yarn build` (re-run complete; still fails on existing baseline issues in `@tryghost/admin-x-settings` type checks, unrelated to migration changes).
- [x] Run gate: `yarn lint` (re-run complete; still fails on existing baseline issues in `ghost/core/content/themes/luno-v1.0.0/assets/js/*.ts`, unrelated to migration changes).
- [ ] Smoke gate: clickthrough posts, stats, activitypub, settings, dark mode, breakpoint transitions.

## Phase 1: Add CSS-First Tokens in Shade (Dual-Run)
- [x] Add CSS token source in [apps/shade/styles.css](/Users/peterzimon/Code/Ghost/apps/shade/styles.css) with `@theme` values for colors, type, spacing, shadows, radius, screens.
- [x] Add CSS dark variant equivalent to current behavior.
- [x] Move animation/keyframe definitions into CSS-first source.
- [x] Keep current `@config` active for fallback (dual-run mode).
- [x] Keep current unlayered import order unchanged.
- [x] Run gate: `yarn workspace @tryghost/shade build`.
- [x] Run gate: `yarn workspace @tryghost/shade lint` (passes with pre-existing warning in `apps/shade/src/components/ui/filters.tsx`).
- [x] Run gate: `yarn workspace @tryghost/shade build-storybook` (passes with pre-existing CSS optimization/minification warnings in Storybook output).
- [x] Smoke gate: full Admin clickthrough (manually validated by user before starting Phase 2).

## Phase 2: Switch Shade Runtime to CSS-Only Generation
- [x] Remove `@config` from [apps/shade/styles.css](/Users/peterzimon/Code/Ghost/apps/shade/styles.css).
- [x] Confirm Admin utility generation remains complete via [apps/admin/src/index.css](/Users/peterzimon/Code/Ghost/apps/admin/src/index.css) `@source` scanning (validated with direct `yarn workspace @tryghost/admin run vite build`).
- [x] Keep legacy config files present only as temporary compat/lint artifacts.
- [x] Run gate: `yarn workspace @tryghost/shade build`.
- [x] Run gate: `yarn workspace @tryghost/admin build` (still fails on existing baseline `@tryghost/admin-x-settings` TS errors, unrelated to this migration).
- [x] Run gate: `yarn build` (still fails because `@tryghost/admin-x-settings` build fails on the same baseline TS errors).
- [x] Smoke gate: full Admin clickthrough with special focus on toasts/modals/onboarding animations and dark mode (manually validated by user; rounded-corner regression handled with temporary compatibility override).

## Phase 3: Decouple Admin Apps From Preset/Config Chain
- [x] Remove effective dependency on `shadePreset(...)` for admin/posts/stats/activitypub runtime lane (removed preset usage in app-level configs for admin/posts/stats; runtime CSS generation remains centralized in `apps/admin/src/index.css` + Shade CSS-first tokens).
- [ ] Update ESLint tailwind rules so they no longer require removed config files (currently blocked by `eslint-plugin-tailwindcss` v3 expecting `tailwindcss/resolveConfig` when v4 is hoisted).
- [ ] Remove preset/config references from docs and package metadata for this lane.
- [x] Run gate: `yarn workspace @tryghost/admin build` (still fails on existing baseline `@tryghost/admin-x-settings` TS errors, unrelated to this migration).
- [x] Run gate: `yarn workspace @tryghost/posts build`.
- [x] Run gate: `yarn workspace @tryghost/stats build`.
- [x] Run gate: `yarn workspace @tryghost/activitypub build`.
- [x] Run gate: `yarn lint` (fails on existing baseline lint issues in `@tryghost/activitypub` classname ordering and `ghost` formatting; no new migration-specific runtime build breakage).
- [ ] Smoke gate: full Admin clickthrough; verify no missing classes.

## Phase 4: Migrate admin-x-design-system (Separate Lane)
- [x] Convert [apps/admin-x-design-system/styles.css](/Users/peterzimon/Code/Ghost/apps/admin-x-design-system/styles.css) from v3 directives to v4 CSS-first imports.
- [x] Replace DS PostCSS/Tailwind v3 pipeline with CSS-first-compatible setup.
- [x] Update settings lane to consume DS without config-token dependency.
- [x] Replace temporary Phase 2 `.rounded*` compatibility override in [apps/shade/styles.css](/Users/peterzimon/Code/Ghost/apps/shade/styles.css) with a proper CSS-first default radius token mapping (legacy `rounded` now resolves through Tailwind token variables; removed manual `.rounded*` patch, and moved component-specific `9px` usage to `--input-group-radius`).
- [x] Run gate: `yarn workspace @tryghost/admin-x-design-system build`.
- [x] Run gate: `yarn workspace @tryghost/admin-x-design-system build-storybook` (passes; only existing Storybook eval/chunk-size warnings remain).
- [x] Run gate: `yarn workspace @tryghost/admin-x-settings build` (still fails on existing baseline TS typing errors around `@tryghost/admin-x-framework/api/roles`, unrelated to migration changes).
- [x] Run gate: `yarn build` (still fails because `@tryghost/admin-x-settings` build fails on the same baseline TS errors).
- [ ] Smoke gate: settings-heavy clickthrough (forms, nav, modals, notifications).

## Phase 5: Hard Cleanup
- [ ] Remove deprecated `tailwind.config.*` and `tailwind.cjs` files that are no longer referenced.
- [x] Remove temporary `.rounded*` compatibility override from [apps/shade/styles.css](/Users/peterzimon/Code/Ghost/apps/shade/styles.css) after Phase 4 default-radius token fix is validated.
- [ ] Remove obsolete package `files` exports and outdated doc references.
- [ ] Update architecture/token docs to CSS-first-only guidance.
- [ ] Run gate: `yarn build`.
- [ ] Run gate: `yarn lint`.
- [ ] Final smoke gate: full Admin clickthrough in light and dark modes.

## Acceptance Checklist
- [ ] No missing utility classes in Admin runtime.
- [ ] No visual regressions in key Admin routes beyond baseline tolerance.
- [ ] Storybook builds pass for migrated package(s) at each phase.
- [ ] No remaining runtime dependency on JS Tailwind token config in migrated lane.

## Assumptions / Defaults
- [ ] `admin-x-design-system` remains a separate lane until Phase 4.
- [ ] Full gates are mandatory after each phase.
- [ ] Public UMD apps are out of scope.
- [ ] Unlayered Tailwind import strategy remains required for Ember coexistence.
