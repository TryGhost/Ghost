# Tailwind v4 Config-to-CSS Migration Tasklist (Checkbox Version)

Last updated: 2026-03-17 (CI run `23193857127`, attempt 2, completed green)

## Summary
- [x] Shade runtime switched to CSS-first tokens (`@theme` + CSS vars).
- [x] Admin-scope config/preset migration is complete at code + CI level.
- [ ] Final QA sign-off (manual smoke + visual regression confirmation) is complete.

## Locked Decisions (from this PR cycle)
- [x] Keep classname-order linting behavior aligned with `main` (no new enforcement in this migration PR).
- [x] Keep `tailwindcss/no-contradicting-classname` as blocking (`error`) in migrated lanes.
- [x] Revert class-order-only churn introduced by temporary enforcement changes.
- [x] Do not use a custom `lint-staged-router` workflow for this migration.
- [x] CI triage rule: fix only migration-caused failures; rerun non-migration failures.

## CI Monitoring Status
- [x] Rerun failed jobs for run `23193857127` via `--failed` (attempt 2).
- [x] `Admin-X Settings tests` passed in attempt 2.
- [x] `Unit tests (Node 22.18.0)` passed in attempt 2.
- [x] `All required tests passed or skipped` green in attempt 2.

## Public Interface / Contract Tasks
- [x] Keep `@tryghost/shade/styles.css` as the primary runtime style contract for Admin.
- [x] Deprecate and remove `@tryghost/shade/tailwind.cjs`.
- [x] Deprecate and remove `@tryghost/admin-x-design-system/tailwind.cjs`.
- [x] Remove docs/tooling metadata that still pointed to config as token source.

## Phase 0: Baseline + Inventory Freeze
- [x] Extract token matrix from Shade config to CSS constructs (`@theme`, `@custom-variant`, keyframes, animation utilities).
- [x] Record config/preset consumers (runtime, lint, docs, package metadata).
- [x] Capture baseline screenshot artifact (`e2e/visual-regression/baselines/settings-migration.png`).
- [ ] Capture baseline video for full Admin smoke paths.
- [ ] Capture final smoke evidence at branch head after manual QA.

## Phase 1: Add CSS-First Tokens in Shade (Dual-Run)
- [x] Add CSS token source in `apps/shade/tailwind.theme.css`.
- [x] Add CSS dark variant equivalent.
- [x] Move animation/keyframe definitions into CSS-first source.
- [x] Keep unlayered import order unchanged.
- [x] Gate: Shade build/lint/storybook validated.

## Phase 2: Switch Shade Runtime to CSS-Only Generation
- [x] Remove `@config` from `apps/shade/styles.css`.
- [x] Keep Admin utility generation centralized via `apps/admin/src/index.css` `@source`.
- [x] Preserve behavior while removing preset-chain usage in runtime lane.
- [ ] Final manual smoke reconfirmed on current branch head.

## Phase 3: Decouple Admin Apps From Preset/Config Chain
- [x] Remove `shadePreset(...)` usage from admin/posts/stats/settings configs.
- [x] Remove `apps/shade/tailwind.cjs`.
- [x] Remove redundant Admin-scope app configs once consumers were gone.
- [x] Resolve ESLint/tooling reliance on removed configs without changing lint policy vs `main`.

## Phase 4: Migrate admin-x-design-system Lane
- [x] Convert DS CSS imports/pipeline to Tailwind v4-compatible setup.
- [x] Move DS PostCSS to v4-compatible plugin chain.
- [x] Remove DS runtime `@config` bridge.
- [x] Ensure admin-x-settings no longer depends on config-driven DS runtime styling.
- [x] Keep acceptance/tests green after DS/settings lane stabilization.

## Phase 5: Hard Cleanup
- [x] Remove deprecated `tailwind.cjs` compatibility exports (`shade`, `admin-x-design-system`).
- [x] Remove Admin-scope `tailwind.config.*` files after consumers were removed.
- [x] Remove remaining config-token references from docs/tooling metadata and package guidance.
- [x] Reach zero config-token runtime dependency in migrated Admin lane.

## Remaining Tailwind Config Inventory (Repo-Wide)
- [x] `apps/comments-ui/tailwind.config.js` (public app, intentionally out of scope)
- [x] `apps/signup-form/tailwind.config.cjs` (public app, intentionally out of scope)
- [x] `apps/sodo-search/tailwind.config.js` (public app, intentionally out of scope)

## Acceptance Checklist
- [ ] No missing utility classes in Admin runtime (final manual smoke pending).
- [ ] No visual regressions in key Admin routes beyond baseline tolerance (pending user smoke + visual regression run).
- [x] Storybook builds pass for migrated package lanes at branch head.
- [x] No remaining runtime dependency on JS Tailwind token config in migrated Admin lane.
- [x] Required CI checks pass on PR #26800 at current head (`23193857127`, attempt 2).

## Assumptions / Defaults
- [x] Public UMD apps are out of scope.
- [x] Unlayered Tailwind import strategy remains required for Ember coexistence.
- [x] Migration PR must stay focused (no unrelated lint-policy tightening).
