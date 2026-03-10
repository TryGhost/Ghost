# Portal Coverage Baseline (Phase 1)

- Date: 2026-03-09
- Workspace: `apps/portal`
- Command: `yarn test:ci`
- Scope: `src/**/*.{js,jsx,ts,tsx}` (with non-executable assets excluded in Vitest coverage config)

## Baseline metrics

- Statements: `70.3%` (`7398/10523`)
- Branches: `77.05%` (`1461/1896`)
- Functions: `72.23%` (`510/706`)
- Lines: `70.3%` (`7398/10523`)

## Temporary non-regression lock

The following temporary global thresholds are configured in `apps/portal/vite.config.mjs`:

- `statements: 70.3`
- `branches: 77`
- `functions: 72.23`
- `lines: 70.3`

This lock is intended to prevent regression until final strict enforcement (`thresholds.100` + `perFile`) is enabled in Phase 7.
