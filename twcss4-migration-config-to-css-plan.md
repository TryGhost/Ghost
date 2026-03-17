# Admin-First Tailwind Config → CSS-First Migration Map & Plan

## Summary
- Goal: migrate Admin scope from JS Tailwind config to CSS-first tokens/variants with no behavior change.
- Scope locked to Admin runtime lanes: `apps/admin`, `apps/shade`, `apps/posts`, `apps/stats`, `apps/activitypub`, `apps/admin-x-settings`, plus `apps/admin-x-design-system` as dependency lane.
- Out of scope: public UMD apps (`comments-ui`, `signup-form`, `sodo-search`) and their Tailwind configs.
- Unlayered import strategy remains required for Ember coexistence.

## Status Snapshot (2026-03-17)
- Admin runtime lane migration is implemented: Admin-scope Tailwind config/preset chain removed.
- Shade/admin-x-design-system runtime token flow is CSS-first.
- Classname-order linting policy was intentionally reset to parity with `main`:
  - no branch-wide class-order enforcement added,
  - no custom lint-staged router script kept.
  - `tailwindcss/no-contradicting-classname` remains blocking in migrated lanes.
- CI policy during this migration is locked:
  - fix failures only when clearly migration-related,
  - otherwise retrigger failed jobs.
- Latest branch CI result: run `23193857127` (attempt 2) finished green (`All required tests passed or skipped`).

## Current State Map
1. **Production Admin CSS lane (active)**
- Central build is in `apps/admin/src/index.css` via `@source` + `@import "@tryghost/shade/styles.css"`.
- Tailwind v4 plugin is centralized in `apps/admin/vite.config.ts`.
- This is the runtime lane for embedded Admin apps.

2. **Shade token lane (migrated)**
- `apps/shade/styles.css` is CSS-first (no runtime `@config` bridge).
- Tokens/variants/animations are sourced from CSS (`@theme` + CSS vars).

3. **Preset/config compatibility lane (removed in Admin scope)**
- `tailwind.cjs` preset exports removed for migrated Admin lanes.
- Admin-scope `tailwind.config.*` files removed where no active consumer remained.

4. **Remaining Tailwind config files (intentional, out of scope)**
- `apps/comments-ui/tailwind.config.js`
- `apps/signup-form/tailwind.config.cjs`
- `apps/sodo-search/tailwind.config.js`

## Remaining Work to Close This Project
1. Complete manual Admin smoke test on this branch.
2. Run/compare visual regression suite and confirm no migration regressions.
3. If regressions appear, patch only migration-caused issues and rerun CI.
4. If no regressions, prepare final merge/sign-off note.

## Known Non-Migration CI Noise
- `apps/admin-x-settings` acceptance failure around `member-welcome-emails` slash-command bookmark flow was reproduced on `main`.
- `ghost/core` unit timeout in `external-media-inliner` was observed as non-migration failure.
- These are tracked as upstream/flake risk, not blockers for migration correctness unless they become deterministic and migration-specific.

## Test Plan (Final Validation Pass)
- Run `yarn build` at repo root.
- Run `yarn lint` at repo root.
- Run required PR CI checks.
- Execute focused Admin smoke paths: settings/posts/stats/activitypub, dark mode, responsive breakpoints.
- Execute visual regression comparison for migrated Admin surfaces.

## Acceptance Criteria
- No runtime dependency on JS Tailwind token config in migrated Admin lane.
- No visual regression in approved Admin baselines.
- Required CI checks green on final head commit.
- Documentation reflects final scope boundary (Admin migrated; public apps intentionally unchanged).
