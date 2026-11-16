# Domain structure spike: findings

Status: in progress. This is a spike log, not a plan of record. It records what
was done to prove out the agreed rules for `ghost/domains/`, what it cost, what
passed and failed, and where a rule did not survive contact with real code.

Throughout, **verified** means the command was run in this spike and the result
is quoted; **inferred** means it was read from source and not run.

## Step 1: baseline

Base commit: `3dca1a3` (main, "Started running "label added" automations").
Node v22.23.4, pnpm 12.16.1. Installed with
`corepack pnpm install --frozen-lockfile` (verified, exit 0).

| Check                                                                | Command                                                                                                | Result (verified)                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| recommendations, oembed and boot unit tests                          | `vitest run test/unit/server/services/recommendations test/unit/server/services/oembed test/unit/boot` | 25 files, 479 tests passed                                               |
| Full unit suite                                                      | `vitest run` in `ghost/`                                                                               | 806 files passed, 3 failed; 11569 tests passed, 34 failed (see below)    |
| Boundaries                                                           | `corepack pnpm lint:boundaries`                                                                        | passed: 5891 modules, 294 known violations, 189 deferred                 |
| Oxlint                                                               | `corepack pnpm lint:oxlint`                                                                            | passed                                                                   |
| Typecheck                                                            | `corepack pnpm nx run ghost:test:types`                                                                | passed. Plain `pnpm test:types` fails until workspace packages are built |
| DB-backed: recommendations (admin, content, members), oembed, emails | `vitest run -c vitest.config.db.ts <7 files>` against MySQL 8.4                                        | 7 files, 75 tests passed                                                 |
| Real boot from source (`node --conditions=source --import=tsx`)      | three warm boots against MySQL                                                                         | "Ghost booted in" 3.471s, 3.398s, 3.398s                                 |

The seven DB-backed files are
`test/e2e-api/{admin,content,members}/recommendations.test.js`,
`test/e2e-api/admin/oembed.test.js`,
`test/e2e-frontend/recommendations-well-known.test.js`,
`test/e2e-server/services/recommendation-emails.test.js` and
`test/e2e-server/well-known.test.ts`.

### Baseline failures that are not caused by the spike

The full unit suite fails 34 tests in 3 files on untouched main in this
container: `test/unit/server/lib/mailgun/mailgun-client.test.js` (31),
`test/unit/server/services/email-suppression-list/mailgun-email-suppression-list.test.ts`
(2) and `test/unit/server/lib/mail/ghost-mailer.test.js` (1). The errors show
the container's outbound proxy address prefixed to the Mailgun URL
(`ERR_INVALID_URL`, input `http://127.0.0.1:<port>https://api.mailgun.net/...`).
Clearing the proxy variables for the run did not change the result, so the
cause is only partly established: it is specific to this container, and its
exact mechanism was not verified. The bar for later steps is "the same 34 and
no others".

### Database

Docker Hub returned 429 and the ECR mirror's CDN is blocked by the container's
network policy. `mirror.gcr.io/library/mysql:8.4` pulled and runs. This is
MySQL 8.4 from a mirror, not the pinned `mysql:8.4.11` digest in
`compose.dev.yaml`.

## Step 2: `ghost/domains/` as a first-class location

Cost: 30 files changed, about 330 lines added and 60 removed. No runtime code
changed. Nothing lives in `ghost/domains/` yet except a README.

### What had to change

| Area                          | File                                                                                                | Change                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| One definition of "a service" | `tools/configs/oxlint/service-locations.cjs` (new)                                                  | The three homes of a root: `core/server/services/<name>`, `domains/<d>/transition/services/<name>`, `domains/<d>/services/<name>`              |
| Boundary rules                | `.dependency-cruiser.cjs`                                                                           | Service rules, specialist owners, `service-roots-in-services`, sharp, shared, frontend and server layer rules all follow a root into a domain  |
| Boundary scanner              | `tools/scripts/lib/dependency-boundaries.ts`, `tools/scripts/ci/service-dependency-resolver.mjs`    | Scans `ghost/domains`; known violations are keyed by service in either home; build-output check covers domains                                 |
| Oxlint                        | `.oxlintrc.json`, `service-root-shape.ts`, `boot-awaits-service-init.ts`, `legacy-services.ts`      | Globs and rules cover both transition and reshaped roots; boot rule accepts `require('../domains/<d>/transition/services/<name>')`             |
| Package contents              | `ghost/package.json` `files`                                                                        | `domains/` ships, `domains/*/test/` does not                                                                                                   |
| TypeScript                    | `ghost/tsconfig.json`, `ghost/test/tsconfig.json`, `ghost/jsconfig.json`                            | Domain code is built; domain tests are checked with the test config                                                                            |
| Test runners                  | `ghost/vitest.config.ts`, `ghost/vitest.config.db.ts`                                               | `domains/*/test/unit`, `test/integration`, `test/e2e/{api,server,frontend,webhooks}` map onto the existing projects; coverage includes domains |
| ESLint and scripts            | `ghost/eslint.config.mjs`, `ghost/package.json` (`lint:domains`, `test:single`)                     | Same rules as Core for code, same as `test/` for domain tests                                                                                  |
| Dev and build                 | `ghost/nodemon.json`, `ghost/scripts/prune.mts`, `.lintstagedrc.cjs`, root `package.json` nx inputs | Domain tests do not restart dev; prune treats `domains/` as an app root; commit hook and lint cache see domains                                |
| CI                            | `.github/workflows/ci.yml`                                                                          | Domain unit tests are excluded from the acceptance filter and domain tests from the E2E filter, as `ghost/test` is                             |
| Tests that list services      | `standard-services.test.ts`, `legacy-service-inventory.test.ts`                                     | Enumerate both boot-owned homes, so a moved root keeps its boot test and extras check                                                          |
| Tool tests                    | 6 files under `tools/scripts/test` and `tools/gx/test`                                              | Fixture repositories copy the new shared module; the config-pinning test expects three root overrides                                          |

### Verified

- `lint:oxlint`, `lint:boundaries` (5895 modules, 294 known, 189 deferred),
  `nx run ghost:test:types`, `pnpm lint` in `ghost/` (ESLint): all pass.
- Boot tests and inventory tests: 7 files, 191 tests pass; inventory config, 71 pass.
- `tools/gx` tests: 155 pass. `tools/scripts` tests: the same 20 failures as the
  untouched baseline (they concern versioning and publishing against the live
  workspace and fail before any change here) and no others.
- **Packed tarball contains `domains/`.** With a temporary probe domain,
  `pnpm build:tsc` emitted `domains/probe/services/probe.js`, the unit runner
  found and ran `domains/probe/test/unit/probe.test.ts`, and `pnpm pack` listed
  `package/domains/probe/services/probe.js` and `.ts` and no file under
  `domains/probe/test/`. The probe was then removed. This was `pnpm pack` in
  `ghost/`, which reads `files`; the full `pnpm archive` (which also needs an
  Admin build) was not run.

### Facts checked against this main

- Confirmed: every service check keys on `ghost/core/server/services/<name>`
  (`servicesRoot` in the dependency-cruiser config, `legacy-services.ts`,
  `boot-awaits-service-init.ts`, `service-root-shape.ts`, globs in
  `.oxlintrc.json`, `gx` tools). A root elsewhere got none of them.
- Confirmed: the boundary scanner scanned `ghost/core` and `apps` only.
- Confirmed: `files` listed `core/` only, `tsconfig.json` included `core/**/*.ts`
  only, the unit runner included `test/unit/**` only.
- New: two **tests** also enumerate `core/server/services` directly
  (`standard-services.test.ts` and `legacy-service-inventory.test.ts`). A moved
  root would silently have lost its "boot waits for it" test and its extras
  check. Not in the list of facts handed to the spike.
- New: `build:tsc` emits JavaScript beside every TypeScript source and that
  output is **not gitignored**. After one build `git status` listed about 600
  untracked `.js` files. Anything that finds files by reading folders will see
  both `x.ts` and `x.js` in a built development checkout. Discovery has to
  handle that (step 3).
- Snapshots: `@tryghost/jest-snapshot` writes `__snapshots__/` beside the test
  file using the path vitest reports, so no snapshot configuration names a
  folder. To be confirmed when tests move in step 6.

### Not done

- `gx services verify`, `gx services report` and `gx generate service` still
  address `ghost/core/server/services` only (`tools/gx/services-verify.ts` lines
  219, 272, 342, 382, 446; `services.ts` line 103; `create-service.ts`). They are
  usable on a root before it moves, not after. Judged not practical inside the
  spike: `services-verify.ts` is 634 lines with its own dependency scan and boot
  mutation test.
- A **legacy** root cannot move: the inventory test requires every legacy entry
  to exist under `core/server/services`. Only standard roots can move as things
  stand, which matches "migrate, then move" as two separate changes.
- `.coderabbit.yaml` review paths and `.github/CODEOWNERS` were not extended.

### Decisions taken here that the rules did not specify

- Domain e2e tests keep the suite they came from as a folder name:
  `test/e2e/api/`, `test/e2e/server/`, `test/e2e/frontend/`. See the open
  question on e2e organisation.
- Service names stay unique across all homes (the tooling throws on a
  duplicate). The inventory, the known-violations file and the boot rule are all
  keyed by bare service name.
