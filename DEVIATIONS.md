# Ember → React Migration: Deviations & Issues Log

Running log of intentional deviations from the stated plan, discovered constraints,
and issues worth reviewing at the end. Newest entries at the bottom of each section.

## Plan & sequencing

- **Slice order chosen:** tag detail/new → posts/pages list → member detail/new +
  members-activity → auth flows → editor → long-tail (restore/explore/migrate/pro/site/home).
  Rationale: smallest contained slice first to establish the flag + shared-E2E pipeline;
  the editor (1,632-line Ember controller) last, once patterns are proven.
- **Dashboard and home are not ports.** `/dashboard` is a hard redirect to `/analytics`
  (already React) and `/` is role-based redirect logic only. They will be handled as part
  of the long-tail slice as routing logic, not screens.

## Architectural notes (facts that shaped decisions)

- The React shell (`apps/admin`) already owns routing and chrome; Ember screens render
  through `EmberFallback`/`EmberRoot` DOM swapping. "Gating Ember rendering" is therefore
  implemented React-side: a flag-aware route component renders the React screen when the
  labs flag is on and `EmberFallback` when off.
- E2E fixture already supports `test.use({labs: {flag: true}})` (settings API + reload),
  which is the mechanism used to run the same Playwright suites against both implementations.

## Deviations

(none yet)

## Infra fixes made along the way

- **E2E dev mode was broken on main (pnpm 11 workspace validation).** The e2e Ghost
  worker container only mounted `ghost/`, but `ghost/admin` has `workspace:*` deps on
  `apps/*`; pnpm 11 fails install when those packages are missing. `compose.dev.yaml`
  already carried the fix (mount `apps/`) for the `ghost-dev` container; applied the
  same bind in `e2e/helpers/environment/service-managers/ghost-manager.ts`.

## Open issues / risks

- **BetterAuth (slice 4):** Ghost core implements bespoke session auth
  (`/ghost/api/admin/session`, 2FA via signin-verify). No better-auth usage exists anywhere
  in the monorepo today. Feasibility of adopting BetterAuth server-side without breaking
  every existing API client needs assessment when the slice starts; findings will be
  logged here.
