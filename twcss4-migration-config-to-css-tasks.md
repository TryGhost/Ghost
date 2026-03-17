# Tailwind v4 Config-to-CSS Migration Tasklist (Checkbox Version)

Last updated: 2026-03-17 (local branch state, pending CI on latest local changes)

## Summary
- [x] Shade runtime switched to CSS-first tokens (`@theme` + CSS vars).
- [ ] Admin-scope migration is complete end-to-end.
- [x] PR CI was green for pushed commit `401ad1d972` (run `23160350559`).

## Current Blockers
- [ ] Re-run CI on latest local DS lane change (removed DS runtime `@config` bridge).
- [ ] Resolve or re-trigger isolated flaky test if it reappears: `advanced/dangerzone` toast assertion.
- [ ] Remove remaining Admin-scope `tailwind.config.*` files that are still consumed.
- [ ] Re-run full gates (`yarn build`, `yarn lint`, required CI checks) with all required jobs green.

## Public Interface / Contract Tasks
- [x] Keep `@tryghost/shade/styles.css` as the primary runtime style contract for Admin.
- [x] Deprecate and remove `@tryghost/shade/tailwind.cjs`.
- [x] Deprecate and remove `@tryghost/admin-x-design-system/tailwind.cjs`.
- [x] Remove remaining docs/tooling metadata that still point to config as token source (`apps/shade/components.json` no longer references `tailwind.config.cjs`).

## Phase 0: Baseline + Inventory Freeze
- [x] Extract token matrix from Shade config to CSS constructs (`@theme`, `@custom-variant`, keyframes, animation utilities).
- [x] Record config/preset consumers (runtime, lint, docs, package metadata).
- [x] Capture baseline screenshot artifact (`e2e/visual-regression/baselines/settings-migration.png`).
- [ ] Capture baseline video for full Admin smoke paths.
- [ ] Keep gate status current at branch head (`yarn build` + `yarn lint` + smoke clickthrough).

## Phase 1: Add CSS-First Tokens in Shade (Dual-Run)
- [x] Add CSS token source in `apps/shade/tailwind.theme.css`.
- [x] Add CSS dark variant equivalent.
- [x] Move animation/keyframe definitions into CSS-first source.
- [x] Keep unlayered import order unchanged.
- [x] Gate: Shade build/lint/storybook validated during migration.

## Phase 2: Switch Shade Runtime to CSS-Only Generation
- [x] Remove `@config` from `apps/shade/styles.css`.
- [x] Keep Admin utility generation centralized via `apps/admin/src/index.css` `@source`.
- [x] Preserve compatibility while removing preset-chain usage in runtime lane.
- [ ] Reconfirm full smoke set at current branch head with CI passing.

## Phase 3: Decouple Admin Apps From Preset/Config Chain
- [x] Remove `shadePreset(...)` usage from admin/posts/stats/settings configs.
- [x] Remove `apps/shade/tailwind.cjs`.
- [ ] Remove now-redundant app configs once no toolchain/runtime consumer remains.
- [ ] Resolve remaining ESLint/tooling reliance on config files where applicable.

## Phase 4: Migrate admin-x-design-system Lane
- [x] Convert DS CSS imports/pipeline to Tailwind v4-compatible setup.
- [x] Move DS PostCSS to v4-compatible plugin chain.
- [x] Remove DS runtime `@config` bridge (`apps/admin-x-design-system/styles.css`) — local validation passed (`admin-x-design-system` build + focused `admin-x-settings` acceptance suite), CI pending.
- [x] Ensure admin-x-settings no longer depends on config-driven DS tokens/scoping (settings now imports DS base styles + local Tailwind utilities via `@source`; no settings `@config` bridge).
- [ ] Clear `Admin-X Settings tests` in CI after DS/settings lane stabilization.

## Phase 5: Hard Cleanup
- [x] Remove deprecated `tailwind.cjs` compatibility exports (`shade`, `admin-x-design-system`).
- [ ] Remove remaining `tailwind.config.*` files in Admin scope after consumers are gone.
- [ ] Remove config references from docs/tooling metadata and package guidance.
- [ ] Reach zero config-token runtime dependency in migrated Admin lane.

## Remaining `tailwind.config.*` Inventory (Admin Scope)
- [ ] `apps/admin/tailwind.config.js`
- [ ] `apps/shade/tailwind.config.cjs`
- [ ] `apps/posts/tailwind.config.cjs`
- [ ] `apps/stats/tailwind.config.cjs`
- [ ] `apps/activitypub/tailwind.config.cjs`
- [x] `apps/admin-x-settings/tailwind.config.cjs`
- [ ] `apps/admin-x-design-system/tailwind.config.cjs`

## Acceptance Checklist
- [ ] No missing utility classes in Admin runtime.
- [ ] No visual regressions in key Admin routes beyond baseline tolerance.
- [ ] Storybook builds pass for migrated package lanes at branch head.
- [ ] No remaining runtime dependency on JS Tailwind token config in migrated Admin lane.
- [ ] Required CI checks pass on PR #26800.

## Assumptions / Defaults
- [x] Public UMD apps are out of scope.
- [x] Unlayered Tailwind import strategy remains required for Ember coexistence.
- [ ] Full gates are mandatory after each phase and are currently satisfied.
