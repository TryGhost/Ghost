# Framework and boot spike

A spike on `claude/framework-boot-spike`: how much of the target "framework and
boot" structure can be put in place on `main` today, with no domains.

Every claim is marked **verified** (it was run) or **inferred** (it was read).
The branch is cut from `d116439b71`. `main` has moved since
(`069a78ddd5` when last fetched); the branch was not rebased.

## Result in one paragraph

All six things to try were done to some degree, in 15 commits that each pass
the static checks and unit tests (verified). Ghost now starts through a start
sequence owned by the framework, from one application definition in
`ghost/bootstrap/app.ts`. `ghost/core/boot.js` is deleted. The foundation
(config, logger, database handle, event bus, clock) is built first by the
foundry. Thirty service roots, two reshaped shared modules and fifteen
background entries start from lists that name them without loading them. What
is not correct yet is in `transition/` folders and is listed by hand. The full
database suites, a release archive boot and a migration boot pass (verified).
Boot time ranges overlap with `main` (verified).

## Where the code is

| Place                                            | What                                                                                                                                          | Lines (source)               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `kernel/` (`@tryghost/kernel`)                   | Types, `defineService`, pure clock helpers, adapter option types                                                                              | about 220 plus adapter types |
| `foundry/` (`@tryghost/foundry`)                 | `createApplication` with `start()`/`stop()`, `createLogger`, `createDatabase`, `createClock`, the adapter manager class and loader            | about 890                    |
| `ghost/bootstrap/`                               | `app.ts`, `shared.ts`, `services.ts`, `background.ts`, `adapters.ts`, `logging-options.ts`                                                    | —                            |
| `ghost/bootstrap/transition/`                    | `boot.ts` (`bootGhost`), `boot-steps.ts` (25 legacy steps), `legacy-steps.ts`, `background-steps.ts`, `legacy-logging.ts`, `legacy-events.ts` | —                            |
| `ghost/shared/limits/`, `ghost/shared/settings/` | The two reshaped shared modules                                                                                                               | —                            |
| `ghost/shared/transition/settings/`              | What settings still takes from legacy core                                                                                                    | —                            |

**Top-level packages or inside `ghost`:** the kernel and foundry are top-level
workspace packages. Reasons: the release archive only carries workspace
packages, not plain top-level folders (known from the earlier spike; the
archive built here contains both as tarballs with `build/`, verified); with
hoisting off, "the foundry never imports Ghost code" is enforced by package
resolution as well as by a boundary rule; it is the target layout. Costs: both
must be built before Ghost typechecks (42 `TS2307` errors without the kernel
build, verified); `check-internal-packages` does not cover them; their tests
stay in `ghost/test/unit`.

## Commits

Each commit passed format, oxlint, ESLint, boundaries, dependencies, packages,
versioning, docs, typecheck and unit tests when it was made (verified). Unit
tests fail in the same three mail test files on untouched `d116439b71`
(34 tests, verified) and nowhere else.

| #   | Commit       | Subject                                                                      | Files, lines   | A PR alone?                                                                            |
| --- | ------------ | ---------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| 1   | `013c60211e` | Moved the kernel to a top-level package                                      | 96, +335 −186  | Yes                                                                                    |
| 2   | `835b2e1e45` | Added the foundry and built Ghost's foundation from one definition           | 46, +945 −86   | After 1                                                                                |
| 3   | `f79ec24ae2` | Added a start sequence to the foundry and made boot run through it           | 20, +1264 −229 | After 2                                                                                |
| 4   | `f432c8d5bc` | Added a services list that the start sequence starts service roots from      | 32, +869 −431  | After 3                                                                                |
| 5   | `9ea7e51b5c` | Added a shared list that the start sequence starts shared modules from       | 19, +312 −76   | After 3                                                                                |
| 6   | `c5a6481fde` | Moved limits to ghost/shared as the first shared module                      | 30, +484 −111  | After 5                                                                                |
| 7   | `478192e294` | Moved the start of settings to ghost/shared, with what blocks the rest       | 17, +773 −174  | After 6                                                                                |
| 8   | `b1aa1f4993` | Moved reading the time out of the kernel into a foundation clock             | 31, +172 −82   | After 2                                                                                |
| 9   | `8547de401c` | Moved the adapter manager into the foundry and Ghost's registry to bootstrap | 29, +407 −276  | After 3                                                                                |
| 10  | `ce023f5401` | Added lint rules that keep the kernel free of state and reads                | 2, +115 −5     | After 8 and 9                                                                          |
| 11  | `bd84c01afa` | Moved image upload and email analytics knowledge out of boot                 | 8, +199 −55    | Yes (as written it follows 3; the change itself does not need the framework, inferred) |
| 12  | `8d37552856` | Split the background step into an ordered list of isolated entries           | 10, +317 −155  | After 3 and 11                                                                         |
| 13  | `f798287f8d` | Moved the legacy steps of boot to ghost/bootstrap/transition as TypeScript   | 22, +1029 −972 | After 12                                                                               |
| 14  | `cef8d5c243` | Moved the boot entry point to ghost/bootstrap and made index.js call it      | 13, +85 −93    | After 13                                                                               |
| 15  | `781d5bc1eb` | Added a boundary regression for the clock paths services may import          | 1, +22         | Belongs in 8                                                                           |

Total against the base: 184 files, +6528 −2153 (before commit 15 and this
document).

"After N" is the order they were made in; whether a commit can be reordered
before an earlier one was not tried.

## Boot order

**Before** (`ghost/core/boot.js` on `main`; inferred from reading it):

| Order | What                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 0     | Config and logger load on first import; Sentry (reads config, calls `Sentry.init` on import); metrics     |
| 1     | HTTP server starts in maintenance mode                                                                    |
| 2     | Database: initialise or migrate. The database handle is built here on first import                        |
| 3     | `initCore`: settings, limits, keys, i18n, url service and other core modules, in code order               |
| 4     | Services for the front end, front end, Express apps, dynamic routing, app service                         |
| 5     | `initServices`: ten legacy services in one `Promise.all`, then the `defineService` roots, also concurrent |
| 6     | Jobs: handlers registered, runner started, then post rescheduling                                         |
| 7     | Maintenance mode off, "Ghost booted", ready notifications                                                 |
| 8     | `initBackgroundServices`: one function, not awaited; one failure stops the rest of it                     |

**After** (`ghost/bootstrap/app.ts`; verified by booting):

| Step (framework) | Entries (Ghost)                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 foundation     | config, logger, database handle, event bus, clock, built in that order                                                                                               |
| after foundation | unhandled rejections, error reporting (Sentry), metrics, HTTP server in maintenance mode                                                                             |
| 2 database       | initialise or migrate; then query tracing                                                                                                                            |
| (framework)      | adapter manager `init()`                                                                                                                                             |
| 3 shared         | foundation checks; then url utils (legacy), **limits**, settings-transition, **settings**, signing-keys, internal-keys, i18n (legacy), email address policy (legacy) |
| 4 services       | one list in `services.ts`: 30 `defineService` roots interleaved with 12 legacy entries                                                                               |
| 5 jobs           | register handlers and start the runner; then automations and post rescheduling                                                                                       |
| 6 ready          | maintenance mode off, "Ghost booted", notifications                                                                                                                  |
| 7 background     | 15 named entries, each isolated, not awaited                                                                                                                         |

Differences in behaviour (all verified unless marked):

- The database handle (Knex, mysql2) now loads before Sentry and before the
  HTTP server listens. No connection is opened. Modules loaded when the server
  first listens: 1,557 on base, 1,574 on the branch; the extra ones are
  framework, bootstrap and `ghost/shared/limits` files.
- The 16 standard roots that used to start concurrently now start one after
  another. After a root fails, later roots never start. The ten legacy services
  still start together in one `Promise.all`.
- The email address policy starts in the shared step, earlier than on `main`.
- A failed ActivityPub, remote flags or milestones start no longer stops the
  background entries after it.
- A second `start()` on a service root stops the first start. Tests boot Ghost
  several times per process.
- A background rejection is logged by the runner, not as "Unhandled rejection".
- `getUnixTime()` is `floor(Date.now()/1000)`, not `moment().unix()`.
- `bootGhost` is a named export of `ghost/bootstrap/transition/boot.ts`.

## Answers

**Where do the HTTP server, maintenance mode and database migration belong?**

- HTTP server and maintenance mode: a slot after the foundation step, supplied
  by Ghost. They are Ghost's (Express, the maintenance app), and the timing
  requirement is "before anything heavy loads", which the slot gives.
- Database migration: the `run` of the database step, supplied by Ghost. The
  framework owns that the step exists and where it is; Ghost owns what
  "ready" means (knex-migrator).
- Both are legacy steps today, in `transition/boot-steps.ts`.

**Does Sentry need to load before config or the foundation?** No. It reads
config, so it cannot come before it. The after-foundation slot is early enough
for `@sentry/node` 7.120.4, which patches globals at `init` and uses no require
hooks (inferred from reading; not tested by breaking it). The cost is that the
database driver is loaded before it. An upgrade to an OpenTelemetry-based
Sentry (v8 or later) would need a hook before the database handle is built, or
a lazily built handle (inferred).

**Is `defineService` enough for settings and feature flags?** Enough for the
start, with one addition: `create(dependencies)` and `init(dependencies)`,
about 40 lines. Not enough for what they collect. Calculated settings and flag
lists are declared by other code. The missing primitive is a declaration that
other modules register before the shared step and the module reads when it
starts. Labs was not touched.

**Is url-utils shared or closer to foundation?** Closer to foundation: it is
built from config alone and has nothing to start (verified by reading and by
its entry needing nothing). But it fails the membership test "every application
needs it", so it should be a shared module with an empty start. It is a legacy
entry today.

**Can the framework start the job runner straight after services?** No. Between
them sit member jobs init, importer init, assertions and
`registerJobHandlers`; queues and handlers are declared by `handle()`, so they
must exist before `start()`. After it come automations and post
`rescheduleAll()`, which block ready. So the jobs step has a `run` supplied by
Ghost and an `after` slot. The framework owns the position, not the start
(verified by running; the reasons are inferred from reading).

**Services step: how many roots start from a list, and what stops the rest?**

- 30 standard roots start from the list.
- 13 to 14 legacy roots take no arguments and become one line each once
  migrated to `defineService`.
- 4 need objects boot makes: gifts (scheduler adapter), email service (server
  and job runner), email analytics (eleven arguments), webhooks (`listen()`).
- 8 entries are not service starts (job cleanup registration, Knex
  instrumentation, front-end helpers, Express apps, dynamic routing, app
  service, `jobsService.init`, scheduler `run()`).

## What could not be done, and what would unblock it

| Not done                                                              | What blocks it                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings fully in `ghost/shared/settings`                             | It still takes from core: the Bookshelf model, the cache instance (built on import of `core/shared/settings-cache`), the legacy event emitter, the cache adapter, calculated settings (which read labs, url-utils, limits and config), tracing. Each needs its own change; the access-code generator is pure and could simply move |
| Limits without a legacy path                                          | 17 modules read `limitService` at load and tests stub it, so `core/server/services/limits.ts` is a forwarding Proxy                                                                                                                                                                                                                |
| Moving other shared modules unchanged into `ghost/shared/transition/` | Tried with internal-keys in a throwaway worktree: 31 import rewrites, 4 importers flagged, 3 inventory tests and 6 boot tests failed. Not cheap, so none moved                                                                                                                                                                     |
| Foundry owning config loading                                         | Ghost's `loadNconf` still loads and validates config; `app.ts` calls it                                                                                                                                                                                                                                                            |
| Event bus built by the foundry                                        | The published `@tryghost/domain-events` is one static emitter; `transition/legacy-events.ts` adapts it                                                                                                                                                                                                                             |
| Logger built without a private import                                 | The seam uses `@tryghost/logging/lib/GhostLogger` and a `globalThis` symbol. `@tryghost/logging/factory` (`createLogger`, `setInstance`), unreleased in TryGhost/framework, would replace `transition/legacy-logging.ts`. `@tryghost/metrics` still builds itself from `loggingrc.js`                                              |
| Adapter manager not reachable by import                               | 17 modules look adapters up by import, so `server/services/adapter-manager/index.ts` is a named alias. `normalizeAdapterConfig` stays in core because it knows products                                                                                                                                                            |
| No product knowledge in bootstrap                                     | Three checks remain in `transition/boot-steps.ts`: `rescheduleOnBoot`, the `!frontend` branch in dynamic routing, `prometheus:enabled`. Each needs its service to own the decision                                                                                                                                                 |
| Nothing run on import in bootstrap                                    | `transition/boot.ts` requires `server/overrides` on import. Moving it changes load order for tests                                                                                                                                                                                                                                 |
| Permissions as a shared module                                        | Nothing in boot starts it on `main`, so there was nothing to list                                                                                                                                                                                                                                                                  |
| One wrapper layer for legacy steps                                    | `legacy-steps.ts` wraps `boot-steps.ts` because the boot unit tests call the steps with plain arguments                                                                                                                                                                                                                            |

## Enforcement

Each was proven by a deliberate violation on the real tree, then reverted
(verified), unless marked.

| Rule                                              | Check                                                                       | Proven                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| Kernel imports no application code                | Boundary rule `kernel-not-application`; package resolution                  | Yes                                          |
| Kernel has no state, reads, or work on import     | ESLint rules in `kernel/eslint.config.mjs`                                  | Yes: 15 kinds of violation caught            |
| Foundry never imports Ghost                       | `foundry-not-application`; package resolution                               | Yes                                          |
| Only bootstrap imports the foundry                | `foundry-only-from-bootstrap`                                               | Yes                                          |
| Only boot imports bootstrap                       | `bootstrap-only-from-boot`, with named alias exceptions                     | Yes, including the clock and adapter aliases |
| Bootstrap reaches core only through `transition/` | `bootstrap-reaches-core-only-through-transition`, with named exceptions     | Yes                                          |
| Shared modules are given, not importing           | `shared-modules-are-given`, `shared-modules-only-from-bootstrap`            | Yes                                          |
| Shared folder shape and list order                | Unit tests                                                                  | Yes                                          |
| Every service is started exactly once and awaited | oxlint `boot-awaits-service-init`, now reading the list and `boot-steps.ts` | Yes                                          |

Known gaps (verified by running): the kernel lint misses `const D = Date;
D.now()`, the host time zone through `Intl`, `Math.random()`, and state written
onto an imported class. It cannot see reads made inside a dependency
(inferred). It is over-strict on top-level lookup tables. `ghost/index.js` and
`ghost/bin` are not boundary scan roots, so the bootstrap and foundry rules do
not check them; `ghost/bin/validate-adapters.ts` imports both.

## Rule wordings to change

1. **"Nothing in `transition/` is automatic: whatever started it before still
   does, by hand."** Ambiguous once boot itself moves. Suggested: "an entry in
   `transition/` runs only because a list in bootstrap names it explicitly".
2. **"Slots are declared only in the application definition."** Needs a `when`
   on entries, and legacy entries interleaved with modules inside a step
   (`Entry = Module | Slot`); roots and legacy steps alternate nine times in
   the services list. Suggested addition: "a step's list may hold modules and
   named legacy entries; a `when` may be decided once per start".
3. **"A shared module imports nothing stateful."** Impossible for settings
   today. Suggested addition: "or takes it from a named `transition/` root
   listed in `needs`".
4. **"Given the foundation and the earlier shared modules."** Does not say what
   a second start does. Suggested: "built once, started on every start".
5. **"Legacy paths return the same instances."** Needs "or forward to it" for
   instances read at import (limits).
6. **"Foundation: … clock."** Say what it is: "`now()` in epoch milliseconds;
   date arithmetic stays in the kernel".
7. **"Adapter manager … run by the foundry, not handed out."** Add: "legacy
   code reaches it through one named alias".
8. **"Kernel: no module state, no exported instances."** Does not say whether
   constants count. Suggested: "top-level constants are literals only".
9. **"Only Ghost's bootstrap imports the foundry."** Add build-time scripts
   that must resolve as the server does, or move that script into bootstrap.
10. **"Bootstrap: nothing that runs on its own."** Add "outside `transition/`",
    or the entry point cannot live there.
11. **"Only boot imports bootstrap."** Name the entry point: "`ghost/index.js`
    and the legacy aliases".
12. **"Database handle" in the foundation, built in step 1.** Not wrong, but it
    means the driver loads before error reporting. Worth stating as accepted.

## Smallest first PR and the sequence after

1. Commit 1 alone: the kernel as a package. No behaviour change.
2. Commit 11 (product knowledge out of boot), which does not need the
   framework (inferred).
3. Commit 2, then 8 with 15 folded in: foundry, foundation, clock.
4. Commit 3: the start sequence. This is the one that changes how boot runs.
5. Commits 4, 5, 12: the three lists.
6. Commits 6, 7: limits and settings.
7. Commits 9, 10: adapter manager and kernel lint.
8. Commits 13, 14: boot moves to `ghost/bootstrap`.

## What was run

**Static checks and unit, at the end** (verified): all lint parts and typecheck
pass. Unit: 34 failed in the three baseline mail files, 12,119 passed.
tools/scripts 409 and tools/gx 158 pass.

**Database suites, MySQL 8.4** (verified, on `cef8d5c243`):

| Suite       | Files          | Passed                  | Failed | Skipped |
| ----------- | -------------- | ----------------------- | ------ | ------- |
| integration | 81 (6 skipped) | 1,314                   | 0      | 105     |
| e2e         | 225            | 3,566 (6 expected fail) | 0      | 0       |
| legacy      | 35             | 464                     | 0      | 0       |

Base e2e, for comparison: 224 files, 3,560 passed. Integration and legacy were
not run on base.

**Production paths run** (verified):

- Release archive: built with `node scripts/pack.mjs` run directly, unpacked
  into an empty directory, `pnpm install --prod --frozen-lockfile`, booted with
  plain node and `NODE_ENV=production`.
  - Empty database: `/` is 503 at 1.1s and 200 at 7.0s.
  - Existing database: 200 at 2.9s.
  - Database needing migration (6.79 rolled back): 503, then 200 at 3.1s; the
    migration ran.
- tsc-built tree with plain node, production: same statuses.
- From source: fresh database, existing database, migration, and five
  `backend`/`frontend`/`server` combinations identical to base.
- First requests: front end, Admin, Admin API, Content API (403 without a key,
  200 with one), members endpoints.
- Job runner: "Started" logged before "Ghost booted"; six jobs scheduled.
- Shutdown: SIGTERM and SIGINT exit 0; the HTTP server stops, then the cleanup
  tasks including "Application" finish. Under 30 concurrent requests the
  completed counts match base.

**Only read, or not run:**

- Browser E2E (Playwright).
- Install through Ghost-CLI; `Dockerfile.production`.
- A migration from a release older than 6.78; SQLite.
- Admin in a browser (only `/ghost/` and one asset were fetched).
- `test:e2e:better-auth`.
- Sentry actually capturing an error after the move.
- Whether each commit can be reordered before an earlier one.
- The 133 inventory evidence paths, rewritten by script and not read one by
  one.

## Boot time

"Ghost booted in", 12 interleaved runs each, existing database (verified):

|                             | Base                    | Branch                  |
| --------------------------- | ----------------------- | ----------------------- |
| Source, testing-mysql       | 2.61–2.81s, median 2.69 | 2.55–2.83s, median 2.65 |
| Built JS, production        | 1.52–1.74s, median 1.56 | 1.48–1.72s, median 1.62 |
| "Server started in", source | 0.85–0.96s              | 0.89–1.00s              |
| "Server started in", built  | 0.49–0.58s              | 0.50–0.62s              |

The ranges overlap in every row. No difference can be claimed either way.

## Loose ends found

- The kernel and foundry `build` scripts are a bare `tsc` and never clean. A
  packed kernel tarball contained two stale adapter manager files restored
  from the nx cache. Nothing loads them (inferred).
- `gx services verify` needs `--base` on this branch because `main` has moved.
- A test that `import`s `bootstrap/app` gets a second application with its own
  config and database handle; tests must `require` it.
- E2E logged "The server has encountered an error" 5 times on the branch and 4
  on base. Not investigated.
