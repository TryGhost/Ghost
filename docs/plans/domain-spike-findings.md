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

Cost: 30 files changed, 333 lines added and 90 removed. No runtime code
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

## Step 3: kernel utilities and discovery

Cost: 21 files, 1,603 lines added and 21 removed (about 620 of code, 800 of
tests, the rest documentation). Three production lines changed outside new files: two
blocks in `boot.js`.

### What was built

| Piece                                 | File                                                                      | What it does                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Definitions                           | `core/kernel/domains/definitions.ts`                                      | `defineEvent`, `defineListener`, `defineJob`, `defineRoutes`, `defineSettings`, `definePermissions`, `defineSchema`, `defineDomain`              |
| Discovery                             | `core/kernel/domains/discover.ts`                                         | Reads the fixed folders; returns entries with a `load()` that requires on first call; `describeManifest` for the listing                         |
| Runner                                | `core/kernel/domains/domain-layer.ts`                                     | `start()`, `ready()`, `stop()`, `routes(surface)`, `fragments(kind)`, given an event bus, a scheduler and a logger                               |
| `defineService` extension             | `core/kernel/define-service.ts`                                           | `startAfter`, `blocking: false`, and `create(dependencies)`                                                                                      |
| Foundation instance                   | `core/foundation/domains/{manifest,index}.ts`                             | The manifest of `ghost/domains`, read once per process; the runner given `@tryghost/domain-events`, the logger and the jobs service              |
| Boot                                  | `core/boot.js`                                                            | `await domains.start()` after `memberWelcomeEmails.init()` and before job handlers are registered; `domains.ready()` after `notifyServerReady()` |
| Listing command                       | `ghost/bin/list-domains.ts`, `pnpm --filter ghost domains:list [--write]` | Prints everything found                                                                                                                          |
| Test that fails when the list changes | `test/unit/foundation/domains/manifest.test.ts`, `domains/manifest.txt`   | Compares what is found with the committed list; checks every describing file exports the right definition                                        |

Every utility only tags and returns its argument. None has an effect when the
file is imported. The effect is the runner's.

### Verified

- 37 new unit tests pass (definitions, discovery, runner, manifest); the three
  new boot tests pass (domain layer starts after boot's own services and before
  the job runner; its failure fails boot; it is stopped on shutdown).
- The step 1 set: oxlint, boundaries (5900 modules, 294 known, 189 deferred),
  typecheck, ESLint, DB-backed 7 files / 75 tests all pass. Full unit suite: the
  same 34 baseline failures and no others (11,602 passed).
- Real boot from source with the layer wired in and no domains: 3.24s and 3.55s
  warm (4.90s on the first run, which compiled the new files), against a
  baseline of 3.40s to 3.47s. No measurable cost with nothing to find.

### What the code showed

- **`defineService` did need extending for the domain layer, but not for
  recommendations.** `startAfter` and `blocking` exist so a root can declare the
  two things the rules allow. Recommendations has one root and its slow work
  became jobs, so it uses neither. They are exercised by tests and fixtures
  only. They are non-enumerable on the root: an existing test pins a root's
  visible members to `init`, `stop`, `service`, `extras`.
- **Listeners cannot be loaded on first use.** To subscribe a listener the
  runner must know its event, and the event is declared in the file. So
  listener files are loaded when their domain starts. Service roots are loaded
  at start by definition. Routes files and fragments are loaded when the web
  layer or a registry asks. Job files are loaded in `ready()`, after Ghost is
  serving. Only route handlers, actions, events and everything they import are
  truly loaded on first use.
- **The event bus cannot unsubscribe.** `@tryghost/domain-events` has
  `subscribe` and no way back, and tests boot Ghost repeatedly in one process.
  The runner subscribes each listener once per process and ignores events while
  stopped.
- **The event bus keys events by class name.** `subscribe(Event, …)` uses
  `Event.name` and `dispatch` uses `event.constructor.name`. So event names must
  be unique across Ghost (the manifest test checks this), and a listener can
  subscribe to an event by name without importing its class. `defineListener`
  accepts a name for exactly that case: an event still published by code a
  reshaped listener may not import.
- **Cron jobs fit the jobs service only in its shared lane.** The jobs service
  takes queue declarations at `start()`, and domain job files load after that. A
  domain job with its own queue would have to be loaded during boot. Cron
  scheduling through the foundation is written but was **not run**; only
  "once at boot" is exercised (step 7).
- **Jobs are not scheduled under test**, matching the jobs guide ("Boot starts
  no schedules under test"). Non-blocking roots are still started.
- **A build leaves `x.js` beside `x.ts`.** Discovery names each module once,
  without an extension, and lets the running loader choose. That matches what
  `require('./x')` already does everywhere else in Ghost.
- **`ghost/bin` is a pinned downstream contract.** Adding the listing command
  there failed `test/unit/bin/entrypoints.test.ts`, which says to add new
  entry points to its list. Done, since the command is useful against an
  installed tree.
- **The boot test for `initServices` stubs every `require`.** Any new line in
  boot needs a stub there, which is the intended tripwire.

### Deviations and unsettled points

- `defineDomain({ dependencies })` in `boot.ts` is this spike's answer to "what
  is boot.ts for": it is the one place that may build what a domain's roots need
  from outside the domain, and the runner passes the result to each root's
  `create`. `boot.ts` is optional; a domain without one supplies nothing. See
  steps 4 and 7 for whether real code needed it.
- Foundation lives in a new `ghost/core/foundation/` folder that holds only
  what the spike added. Config, logging, the database, the event bus and the
  job runner were used from where they are.

## Step 4: fixture domains

Cost: 37 files, 764 lines added, all under `ghost/test`. Nothing shipped
and nothing booted in production: `files` in `ghost/package.json` does not list
`test/`, and the foundation's manifest reads `ghost/domains` only.

Two fixture domains live in `ghost/test/utils/fixtures/domains/`:

- **library** has every kind of file: `CONTEXT.md`, `boot.ts`, `actions/`,
  `data/`, `events/`, `http/` (routes, controller, validator, serializer),
  three service roots (one declares `startAfter`, one `blocking: false`),
  `repositories/`, `entities/`, `jobs/`, the three fragments (settings has a
  calculated setting), `transition/` (a service root, a model, a command-style
  event) and `test/`.
- **notices** has no `boot.ts`. Its listener subscribes to library's `BookLent`
  event, its service calls library's `describeBook` action at the moment of use,
  and it has `emails/` and its own event and action.

`test/utils/fixtures/domain-foundation/` stands in for the foundation (an event
bus keyed by class name, like the real one) and holds one scenario that starts
both domains and reports what happened as plain data.

### Does finding files at start work? Yes, in every way tried

`test/unit/kernel/domains/fixture-domains.test.ts` holds the scenario to one set
of expectations three ways, all **verified by running**:

| How the files were loaded                                                                  | Result |
| ------------------------------------------------------------------------------------------ | ------ |
| Under the unit test runner (vitest, with its `tsx/cjs` require hook)                       | passes |
| Plain `node`, tsc-built JavaScript beside its TypeScript (built checkout, release archive) | passes |
| Plain `node`, JavaScript alone with every `.ts` removed (what the image prune leaves)      | passes |

It was also run from source with `node --conditions=source --import=tsx`, the
development loader. The built cases compile the kernel and fixtures in place in
a temporary copy with the compiler `pnpm build:tsc` uses, then run with no
TypeScript loader and no `source` condition.

**The generated-index fallback was not needed.** Discovery uses `readdirSync`
and `require` of an extensionless path, which every loader Ghost runs under
already supports.

### What each kind of file costs at start, measured on the fixtures

| When              | Files loaded                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Discovery         | none                                                                                                                               |
| `start()`         | `boot.ts`, every service root, every listener, and whatever those import (entities, repositories, events, another domain's action) |
| Mounting routes   | `http/routes.ts` only                                                                                                              |
| First request     | the handler's controller and what it imports (validator, serializer)                                                               |
| `ready()`         | job files; the root that does not block boot starts                                                                                |
| A registry asking | `settings.ts`, `permissions.ts`, `schema.ts`                                                                                       |
| Never             | anything in `transition/` or `test/`                                                                                               |

### What the fixtures showed

- **`boot.ts` does not need to exist.** Notices has none and works: its root
  imports the foundation stand-in and library's action itself. Library has one
  that supplies `publish`, `now` and `record` to all three roots, and with it
  **no library root imports anything outside the domain except the kernel**.
  Both shapes run side by side. The cost of the second shape is one type import
  per root (`LibraryDependencies` from `../../boot`).
- **An action is a plain function.** `describeBook(id)` and `lendBook(input)`
  import their own service root and read `.service` inside the function body.
  That satisfies "finds its service when called, not when imported" with no
  utility. Importing the action does load the service root module, but loading
  a root has no effect by the `defineService` contract.
- **A listener in one domain importing another domain's event class works**,
  and is the only way to get a typed payload. The event file is in the public
  `events/` folder, so this is within the rules.
- **Cross-domain start order cannot be relied on, by construction.** Domains
  start together; in the scenario notices finished starting between library's
  two blocking roots.
- **Data needs a role name.** The rules give no role for files in `data/`. The
  fixtures use `book.data.ts`. The email renderer needed one too
  (`loan-notice.renderer.ts`).
- **The compiler is not `typescript/bin/tsc`.** `ghost` resolves `typescript`
  to an aliased package and `tsc` to a shim, so the test runs
  `node_modules/.bin/tsc`, the same thing `pnpm build:tsc` runs.

### Not verified

- The fixtures prove discovery and the runner. They do not go through
  `boot.js`, Express or the real event bus; step 7 does that with real code.
- `pnpm archive` and the production Docker image were not built. The two built
  cases reproduce their file layouts, not the artefacts themselves.

## Step 5: enforcement

Cost: 10 files, about 1,500 lines added (about 620 of checks, 760 of tests, 110
of rules in `.dependency-cruiser.cjs`).

### The checks

| Check                                                                                                                                                              | Where                                                         | Fails lint? | Tests |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------- | ----- |
| Domain root shape: `CONTEXT.md` required, nothing unnamed at the root, `services/` is one folder per root, `transition/` and `test/` hold only their named folders | `tools/scripts/lib/domain-shape.ts`, `pnpm lint:domain-rules` | yes         | 6     |
| Dotted-role names outside `transition/` and `test/`: lower case, a role, the role belongs to the folder, TypeScript, fixed names only in their place               | same                                                          | yes         | 6     |
| Cross-domain imports only through `actions/`, `data/`, `events/` (`domain-public-surface`, `domain-transition-private`)                                            | `.dependency-cruiser.cjs`, `pnpm lint:boundaries`             | yes         | 6     |
| Implementation import rule (`domain-implementation-imports`, `domain-own-root`)                                                                                    | same                                                          | yes         | 2     |
| Fragment import rule (`domain-fragment-imports`)                                                                                                                   | same                                                          | yes         | 4     |
| No Express, auth middleware, endpoint registry or frontend in a domain (`domain-no-web-layer`)                                                                     | same                                                          | yes         | 2     |
| Nothing applies to `transition/`                                                                                                                                   | same                                                          | n/a         | 1     |
| Count of files in each `transition/`                                                                                                                               | `pnpm lint:domain-rules --report`                             | no          | 1     |
| Count of legacy and transition imports from service roots and domain files (`domain-legacy-imports`, `domain-transition-imports`, severity `info`)                 | `.dependency-cruiser.cjs`, printed by the report              | no          | 1     |
| Bookshelf relations, foreign keys and `withRelated` that cross a domain                                                                                            | `crossDomainRelations`, printed by the report                 | no          | 1     |

The import-rule tests copy the fixture domains into a temporary repository at
`ghost/domains/` (rewriting their relative imports), run the real config, then
add one violating file at a time. The fixtures pass every check unchanged.

Verified: `tools/scripts` tests 414 pass with the same 20 baseline failures;
`tools/scripts` typecheck and ESLint pass; `lint:oxlint`, `lint:boundaries` and
`lint:domain-rules` pass on the real tree.

### What had to be decided to write the rules

- **Listeners must import another domain's event class.** The rule says
  implementation files import only their own domain, kernel, types and
  allowlisted libraries. A listener that reacts to another domain's event needs
  that event's class as a value, to subscribe. The check therefore lets any
  reshaped file import other domains' `data/` and `events/`, and keeps other
  domains' `actions/` for the service root and `boot.ts` to import and inject.
- **Files across a domain read its service roots.** Controllers, listeners,
  actions and jobs reach the ready service through `services/<name>/index.ts`.
  Only a service's own implementation files are barred from their own root.
- **"Foundation and shared" is a list in the config**
  (`domainFoundationAndShared`), because neither layer has a folder. A service
  root or `boot.ts` importing anything else in `ghost/core` is counted as a
  legacy import. The list is the spike's working answer to "what had to be
  treated as foundation"; step 7 tests it on recommendations.
- **Code outside the domains is held to the same surface.** `ghost/core` may
  import a domain's `actions/`, `data/`, `events/` and `transition/` and nothing
  else. The rules do not say this in so many words.
- **The role list had to be invented for some folders.** See the open question
  on roles, updated after step 7.
- **Reshaped code must be TypeScript.** The naming check accepts `.ts` only
  (and `.hbs`, `.html`, `.txt` under `emails/`).

### Limits found

- **Type-only imports are invisible to the boundary scan.** The scan compiles
  TypeScript first and no edge remains for `import type`. So "never imports
  Express" and "only the public folders" are enforced for value imports only. A
  type taken from another domain's internals, or `import type { Request } from
  'express'`, passes. A test records this. Seeing them needs dependency-cruiser's
  `tsPreCompilationDeps`, which changes what every existing rule sees and was
  not turned on here.
- **The scan gives different answers under different Node versions in this
  container.** Under the shell's Node 22.23.4 type-only imports stay in the
  graph and the real tree shows 677 violations; under the Node pnpm runs
  scripts with (22.23.5) it shows the expected 483. Every result in this log
  was produced through `pnpm`. Running a check with bare `node` here misleads.
- **"Only the owning domain publishes an event" is not enforced.** A listener
  must import the event class, and anything holding the class can construct and
  dispatch it. Nothing in an import graph tells subscribing from publishing.
- **Past-tense event names are not checked.**
- **The relations report is text matching.** It finds `this.hasMany('Model')`
  style relations and `references: 'table.column'` in a schema fragment and
  attributes each side to a domain by where its model file lives. `withRelated`
  names relations, not models, so its target is reported as unknown. It is a
  list to review, as asked, and no more.
- **The test tree is not checked to mirror the code tree.**

### Tooling added along the way

`tools/scripts/relocate.ts` moves files or folders with `git mv` and rewrites
every relative specifier the move changes: in the moved files and in everything
that points at them (`require`, `import`, `export from`, `import()`,
`typeof import()`, `require.resolve`, `mock()`-style calls). It reports paths
built from strings (`path.join(__dirname, …)`) for a hand edit. Step 6 uses it.

## Step 6: recommendations moved whole

Cost: 63 files changed, of which 49 are renames; 156 lines added and 97
removed. 32 of the added lines are the new `CONTEXT.md`. Leaving that aside,
the move changed about 124 lines in 37 files.

| What changed                                                               | Files | How                                                                     |
| -------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| Service root and its 21 files, three models, 20 test files, four snapshots | 49    | `git mv` by `tools/scripts/relocate.ts`                                 |
| Relative specifiers in moved files and in files pointing at them           | 33    | rewritten by the same tool                                              |
| `boot.js`, `site.js`, three API endpoint files, `models/index.js`          | 6     | by the tool: these are the only untouched-location files it had to edit |
| Boot test stub keyed by the old `require` string                           | 1     | by hand                                                                 |
| Legacy inventory: evidence paths cited by the oembed entry                 | 1     | by hand (9 lines)                                                       |
| Inventory test: a cited test may live in a domain                          | 1     | by hand                                                                 |
| Standard-services boot test: tolerate a wrapped binding                    | 1     | by hand                                                                 |
| ESLint config: domain tests get test rules only                            | 1     | by hand (a step 2 mistake, found here)                                  |
| `ghost/domains/network/CONTEXT.md`                                         | 1     | written                                                                 |

The relocate tool reported no string-built paths needing a hand edit. The three
hand edits it could not have found are a `require` string used as an object key
in a test, YAML and a regular expression.

Where things went:

- `ghost/domains/network/transition/services/recommendations/` (root unchanged,
  still initialized by its line in `boot.js`)
- `ghost/domains/network/transition/models/` (three models; `models/index.js`
  requires them from there)
- `ghost/domains/network/test/unit/transition/services/recommendations/`
- `ghost/domains/network/test/e2e/api/{admin,content,members}/`,
  `test/e2e/server/services/`, `test/e2e/frontend/`, each with its
  `__snapshots__/` beside it

### Verified

Everything from step 1, at the new paths:

- Unit suite: 11,606 passed; the same 34 baseline failures and no others. The
  moved unit tests (21 files) run from `domains/network/test/unit/`.
- DB-backed: 7 files, 75 tests pass against MySQL, five of them from
  `domains/network/test/e2e/`. **The four snapshot files moved as pure renames
  and matched without being rewritten**, so snapshots do follow the test file.
- oxlint, boundaries (5900 modules, 294 known, 189 deferred), typecheck, ESLint,
  `lint:domain-rules`, doc links: pass.
- Real boot from source: 3.62s, 3.62s, 3.55s.
- `lint:domain-rules --report`: network has 24 files under `transition/`
  (21 in services, 3 models).

### The service checks still apply to the moved root (verified)

Each violation was introduced, the check was run, and the file was restored.

| Violation introduced in the moved service                | Check that failed                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| An implementation file requires `core/shared/config`     | `lint:boundaries`: `error service-dependencies: …/recommendations/service/well-known-service.ts → ghost/core/shared/config/index.ts`      |
| An implementation file requires its own root             | `lint:boundaries`: `error service-own-root: … → …/recommendations/index.ts`                                                               |
| The root gains a named runtime export                    | `lint:oxlint`: `ghost(service-root-shape): Named runtime exports belong in extras`                                                        |
| A service file exports a type containing `any`           | `lint:oxlint`: `ghost(no-any-in-exported-types)`                                                                                          |
| `boot.js` stops awaiting `recommendationsService.init()` | `lint:oxlint`: `ghost(boot-awaits-service-init): Boot never initializes recommendations`; and 2 tests in `standard-services.test.ts` fail |

### What the move showed

- **"Moved unchanged" is not literally unchanged.** Every relative import that
  leaves the moved folder changes (24 lines in the root alone), because the
  folder is five levels from `ghost/core` instead of three. The service-root
  lint also pins the exact relative path to the kernel helper, so each home
  needs its own lint override.
- **The formatter can break a check.** The longer `require` path made the
  formatter wrap the binding in `boot.js` after its `=`. The oxlint rule reads
  the syntax tree and did not care; the `standard-services` test and
  `gx services verify` match source text with a regular expression and did.
  The test is fixed; `gx` is not.
- **Evidence paths in the legacy inventory are another place that names
  folders.** The oembed entry cites recommendations source and test files, and
  the inventory test required every cited test to be under `ghost/test`.
- **The `boot-awaits-service-init` message still suggests
  `require('./server/services/<name>')`** for a root that lives in a domain.
  The rule is right; its hint is not.
- **Three test files could not move with the code** because they test code that
  has not moved: `test/unit/api/endpoints/recommendations.test.ts` (the endpoint
  files in `core/server/api`), `test/unit/frontend/helpers/recommendations.test.ts`
  (the theme helper) and `test/e2e-server/well-known.test.ts` (unrelated
  well-known routes). The first follows in step 7.
- **Mirroring holds for unit tests and has no meaning for e2e tests.** A unit
  test at `test/unit/transition/services/recommendations/service/x.test.ts`
  mirrors `transition/services/recommendations/service/x.ts`. An e2e test
  exercises a route, not a file, so the e2e tree is organised by suite and API
  surface instead.

## Step 7: recommendations reshaped

Cost: 95 files changed; 1,464 lines added and 690 removed. 37 renames, 21 new
files, 4 deletions, 33 other edits.

| Part                                                                   | Files | Added     | Removed  |
| ---------------------------------------------------------------------- | ----- | --------- | -------- |
| Domain code (`ghost/domains/network` outside `test/`)                  | 36    | 669       | 275      |
| Tests (the domain's and `ghost/test`)                                  | 34    | 504       | 218      |
| `ghost/core` (central registries, web layer, boot, kernel, foundation) | 21    | 392       | 362      |
| Tooling, inventory, docs                                               | 4     | about 100 | about 35 |

About 150 of the lines added to `ghost/core` are one-off machinery that the
next domain reuses: `foundation/domains/fragments.ts`, `api/domain-endpoints.ts`,
`web/api/mount-domain-routes.ts` and `default-settings/with-domain-settings.js`.

### Where everything went

```text
ghost/domains/network/
  CONTEXT.md
  settings.ts  permissions.ts  schema.ts
  actions/   list-well-known-recommendations.action.ts
  data/      well-known-recommendation.data.ts
  http/      routes.ts
             recommendations.endpoint.ts  recommendations-public.endpoint.ts
             incoming-recommendations.endpoint.ts
             recommendation.controller.ts  incoming-recommendation.controller.ts
  services/recommendations/
             index.ts
             recommendation.service.ts  incoming-recommendation.service.ts
             recommendation-metadata.service.ts  well-known.service.ts
             recommendation-enabler.service.ts
  repositories/  bookshelf.repository.ts  bookshelf-recommendation.repository.ts
             bookshelf-click-event.repository.ts  bookshelf-subscribe-event.repository.ts
             recommendation.repository.ts  libraries.d.ts
  entities/  recommendation.entity.ts  click-event.entity.ts  subscribe-event.entity.ts
             recommendation-url.value.ts  unsafe-data.value.ts
  listeners/ send-recommendation-received-alert.listener.ts
  jobs/      refresh-recommendation-metadata.job.ts  refresh-incoming-recommendations.job.ts
  emails/    incoming-recommendation-email.renderer.ts
  transition/models/   the three Bookshelf models
  test/unit/…          mirrors the tree above
  test/e2e/{api/{admin,content,members},server/services,frontend}/
```

Removed from central files in favour of what the domain declares:

| Central file                                                           | What left it                                                                    | What replaced it                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `boot.js`                                                              | the root's binding and its `init()` in `initServices`                           | the domain layer starts it                           |
| `web/api/endpoints/admin/routes.js`                                    | 7 routes                                                                        | `mountDomainRoutes(router, { surface: 'admin', … })` |
| `web/api/endpoints/content/routes.js`                                  | 1 route                                                                         | same, `surface: 'content'`                           |
| `web/members/app.js`                                                   | 2 routes                                                                        | same, `surface: 'members'`                           |
| `api/endpoints/index.js`                                               | `recommendations`, `incomingRecommendations`                                    | endpoint files in the domain's `http/`               |
| `api/endpoints/*.js`                                                   | 3 endpoint files                                                                | moved to the domain's `http/` as TypeScript          |
| `data/schema/schema.js`                                                | 3 table definitions (52 lines)                                                  | `schema.ts`, placed by name                          |
| `data/schema/default-settings/default-settings.json` and the test copy | the `recommendations_enabled` setting                                           | `settings.ts`                                        |
| `shared/settings-cache/public.js`                                      | `recommendations_enabled`                                                       | `settings.ts`, placed by name                        |
| `api/…/serializers/input/settings.js`                                  | `recommendations_enabled` in the editable list                                  | `settings.ts`                                        |
| `services/permissions/permissions-data.ts`                             | the `recommendation` object and 6 role grants                                   | `permissions.ts`                                     |
| `frontend/web/site.js`                                                 | the import of the root and its Express controller                               | the `listWellKnownRecommendations` action            |
| `models/index.js`                                                      | nothing: still hand-edited to require the three models from `transition/models` | —                                                    |

### Verified

- oxlint, boundaries (5911 modules, 294 known, 189 deferred), typecheck, ESLint,
  `lint:domain-rules`, `lint:legacy-services`, docs lint: pass.
- Unit suite: 11,630 passed; the same 34 baseline failures and no others. The
  domain's own unit tests: 26 files.
- DB-backed, the step 1 set: 7 files, 75 tests pass. Recommendations is now
  reached through `mountDomainRoutes`, started by the domain layer, and its
  staff alert is sent by the listener. **The four snapshot files are unchanged.**
- DB-backed, a wider set chosen because the reshape touched their registries
  (admin and content settings, roles, mentions, site, users, exporter, settings
  and migrations integration, frontend middleware): 17 files, 127 tests pass.
  The full DB-backed suites were **not** run.
- **Hashes unchanged.** The default-settings hash in the integrity test is still
  `793d09161208cf11d087fd0b145127bc`. `JSON.stringify` of the schema tables has
  the same md5 before and after (`5649fbd3…`, 106 tables). The public settings
  map serializes identically.
- Real boot from source: 3.30s, 3.31s, 3.21s (baseline 3.40s to 3.47s).
- Report: `transition/` went from 24 files to 3 (the models). The root has 4
  counted legacy imports: `models/index.js`, `services/mentions`,
  `services/oembed`, `services/staff`. Two foreign keys cross the domain:
  both event tables reference `members.id`.

### Answers this step gives

**What does discovery cost at boot?** Nothing measurable. With one domain of 9
found files, three boots took 3.21s to 3.31s against a baseline of 3.40s to
3.47s and an empty-layer figure of 3.24s to 3.55s. The differences are inside
run-to-run noise on this machine, and three runs is a small sample.

**Which "events" turned out to be commands?** Recommendations publishes no
events at all. It had two commands disguised as initialization:
`RecommendationService.init()` and `IncomingRecommendationService.init()` each
set a timer to do slow work some minutes after boot. Both are now jobs with a
"once at boot" schedule and a delay. `MentionCreatedEvent`, which it listens
to, is a real past-tense event.

**Did "no say over start order" hold?** Mostly. Two of its three uses of
Mentions became calls at the moment of use (sending mentions, listing and
refreshing mentions). The third cannot: the root registers a URL mapper on the
Mentions metadata service, and registering is something done at start. It
works because the whole domain layer starts after every line in `boot.js`, so
"everything legacy is up before any domain" is the one ordering a domain gets.
No before or after slot was needed. Once Mentions is in the same domain this is
exactly the declared case: `startAfter: ['mentions']`.

**How were the staff alert, cross-domain model reads and relations handled?**

- _Staff alert._ The content is the domain's: the subject line and the
  renderer are in `emails/`. The template is **not**: it stays in
  `core/server/services/staff/email-templates/`, because Staff's renderer reads
  only its own fixed set of files and owns the shared layout, partials, helpers
  and the per-recipient data every staff email uses. Moving the template needs a
  shared mail module that can render a caller's template inside that layout,
  which does not exist. Recipients come from `models.User.getEmailAlertUsers`,
  wired in the root with a comment that it belongs to identity. Sending goes
  through `GhostMailer`, treated as shared mail. Deviation from "the raising
  domain owns content and template": the domain owns the content only.
- _`models.User`._ Read in the service root only, through the models registry,
  and counted as a legacy import.
- _Bookshelf relations._ The three models define none. The cross-domain link is
  in the schema: two foreign keys to `members.id`, which the report lists.

**Does `boot.ts` need to exist?** No. Network has none. Its one root does its
own wiring, as roots do today.

**How far is the code from "the domain file hands each root its dependencies"?**
The root's `create` makes 11 `require` calls for things outside the domain: 7
that count as foundation or shared (config, logging, Sentry, URL utils, mail,
outbound HTTP, settings) and 4 legacy. Moving those 11 lines into a
`boot.ts` `dependencies()` function and typing the argument to `create` would
leave the root importing only its own domain and the kernel. The fixture
`library` domain is built that way and passes. It was not done for network:
the root's test loads the root and stubs each of those modules, so it would
need rewriting a second time for no new evidence.

### How `test/e2e` is organised

Today there are three e2e suites with their own runner projects:

| Suite                                        | Project        | What differs                                             |
| -------------------------------------------- | -------------- | -------------------------------------------------------- |
| `e2e-api`                                    | `e2e-api`      | nothing in settings: same pool, isolation, timeout (15s) |
| `e2e-server`, `e2e-frontend`, `e2e-webhooks` | `e2e`          | the same                                                 |
| `*.isolated.test` under `e2e-server`         | `e2e-isolated` | `isolate: true`                                          |

The first two projects have identical settings. They are separate only so CI
can run and shard them separately. So the split is about **scheduling**, not
about how a test must be run.

What the spike did: a domain's `test/e2e/` keeps the old suite as its first
folder, and each existing project gained one include glob:

```text
test/e2e/api/{admin,content,members}/…   → project e2e-api
test/e2e/server/…  test/e2e/frontend/…   → project e2e
test/e2e/**/*.isolated.test.*            → project e2e-isolated
```

That keeps every runner setting and every CI lane as it is. A domain's e2e tree
is organised by **how the test reaches Ghost** (an API surface, the server, the
theme front end), not by mirroring code, because an e2e test exercises a route
or a flow and not a file.

**Snapshots** stay beside the test file in `__snapshots__/`. Nothing names that
folder in configuration; `@tryghost/jest-snapshot` derives it from the path of
the running test. Moving a test and its snapshot file together needs no other
change, as the unchanged snapshot files show.

**Multi-domain test files** stay in `ghost/test`. Three cases came up:

- `test/unit/frontend/helpers/recommendations.test.ts` tests a theme helper in
  the front end that renders recommendations. It belongs to whoever owns the
  helper.
- `test/e2e-frontend/middleware.test.js` and the exporter and seeder tests
  mention recommendations among many domains.
- `test/integration/exporter` lists every table.

Suggested rule: a test moves into a domain when everything it exercises is in
that domain. A test that boots Ghost and checks several domains, or checks a
central list, stays in `ghost/test` until there is a home for cross-domain
tests.

### Deviations in this step

1. **`recommendationsPublic` is still in the endpoint registry**, as a one-line
   delegate to the domain's endpoint file. The `{{recommendations}}` theme
   helper reads the Content API in process through
   `frontend/services/proxy`, which is the front end's sanctioned way to get
   content. An action returning plain data could not replace it without
   reproducing the API pipeline's validation, permissions and serialization
   inside the domain. The two admin entries are gone.
2. **Order had to be pinned.** Tables are created in the order `schema.js`
   lists them, and the settings hash and the public settings output depend on
   order. A table, a settings group and a public setting that used to be
   written out centrally keep their place by being **named** where they were
   (`...fromDomains.place('recommendations', …)`, an empty
   `"recommendations": {}` group in the JSON). Anything new that a domain
   declares is appended with no central edit. So "creating a file has its
   effect" holds for new things, and moving an existing thing leaves a one-line
   placeholder behind.
3. **Central lists that were not aggregated:** `models/index.js` (by rule),
   `data/exporter/table-lists.js` and the data seeders still name the three
   tables.
4. **`permissions-data.ts` lost static typing for domain permissions.**
   `ObjectType` is derived from a `const` object. Merged fragments are not
   known to the compiler, so `recommendation` is no longer in that union.
   Nothing in the codebase used it as a literal type, so nothing broke.
5. **The central registries import a foundation file.** `permissions-data.ts`
   is a service implementation file, which may only import allowlisted code, so
   `foundation/domains/fragments.ts` was added to the service allowlist.
6. **`.d.ts` files are exempt from the naming rule** (`repositories/libraries.d.ts`
   declares two untyped libraries).
7. **Three behaviours moved to a different owner and their tests moved with
   them.** "Nothing is scheduled under test" was a `NODE_ENV` check inside each
   service and is now the foundation's (`ready({ jobs: false })`), tested in
   the boot tests. "Boot waits for Mentions before Recommendations" and "a
   Recommendations init failure fails boot" are now "boot starts the domain
   layer after its own services" and "a domain layer failure fails boot".

### Rules that were ambiguous, wrong or missing on real code

| Rule as written                                                              | What exposed it                                                         | Problem                                                                                                                                                       | Suggested wording                                                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http/` holds "routes.ts, controllers, validators, serializers"              | `http/recommendations.endpoint.ts`                                      | Ghost's API has two things called a controller: the API framework's endpoint definition and the class that turns a frame into service calls. Both are needed. | Add the role `endpoint`: "an API framework controller definition that a route names as its handler".                                               |
| "A route names its handler without loading it"                               | `http/routes.ts`, `web/api/mount-domain-routes.ts`                      | The handler cannot be a function: the web layer must wrap the whole endpoint definition in the API pipeline. The route names a file and a member as a string. | "A route names its handler as `<file>#<member>`. The web layer loads the file on the first request."                                               |
| A listener imports only its own domain, kernel, types, allowlisted libraries | `listeners/send-recommendation-received-alert.listener.ts`              | The event is published by legacy code the listener may not import.                                                                                            | "A listener names an event that legacy code still publishes by its class name, as a string, until that code is in a domain."                       |
| "Fragments are aggregated"                                                   | `schema.js`, `default-settings.json`, `settings-cache/public.js`        | Order matters in all three and a moved entry must keep its place.                                                                                             | "An entry that moves out of a central list keeps its position by being named there. Entries a domain adds are appended."                           |
| "A domain never imports … the API registry"                                  | `frontend/helpers/recommendations.js`                                   | The front end reads domain data through the registry.                                                                                                         | Say what the front end uses instead, or allow a registry entry that delegates to a domain's endpoint file.                                         |
| "The raising domain owns content and template"                               | `emails/incoming-recommendation-email.renderer.ts`                      | The template depends on Staff's layout, partials and per-recipient data.                                                                                      | "Until shared mail exists, the raising domain owns the content and the data it passes; the template stays with the renderer that owns the layout." |
| Entities folder holds "core objects and value objects"                       | `entities/recommendation-url.value.ts`, `entities/unsafe-data.value.ts` | No role name for a value object or a pure helper.                                                                                                             | Add the role `value`.                                                                                                                              |
| `data/` holds plain types                                                    | `data/well-known-recommendation.data.ts`                                | No role name.                                                                                                                                                 | Add the role `data`.                                                                                                                               |
| `emails/` holds "templates and renderers"                                    | `emails/incoming-recommendation-email.renderer.ts`                      | No role names.                                                                                                                                                | Add the roles `renderer` and `template`.                                                                                                           |
| Nothing about tests of a file that changed owner                             | the removed `NODE_ENV` test, two boot tests                             | A reshape moves behaviour, and the test must follow it to the new owner rather than be kept or deleted.                                                       | "When reshaping moves a behaviour to the framework, the test moves to the framework's tests in the same change."                                   |

### The full list of roles

Used by real code in this step: `action`, `data`, `endpoint`, `controller`,
`service`, `repository`, `entity`, `value`, `listener`, `job`, `renderer`.

Used by the fixtures only: `event`, `validator`, `serializer`.

Allowed by the check but not yet used by anything: `template`.

Fixed names: `index.ts` in a service folder, `routes.ts` in `http/`, `boot.ts`,
`settings.ts`, `permissions.ts`, `schema.ts`, `CONTEXT.md`. Exempt: `*.d.ts`
and `*.md`.

### Not verified

- The full DB-backed suites (only the 24 files named above were run).
- Admin against this backend. Routes, paths and response shapes are unchanged
  and the e2e-api snapshots pass, but no browser test was run.
- Behaviour of the two jobs in production: they run on timers of 15 seconds to
  7 minutes after boot and were exercised only through unit tests.

## Step 8: oembed

Four commits.

| Commit                                                                      | Files | Added | Removed |
| --------------------------------------------------------------------------- | ----- | ----- | ------- |
| `b4a6ee8` Migrated oEmbed to `defineService`, in place                      | 19    | 253   | 419     |
| `0490ddc` Fixed fragments being changed by the registries (a step 7 defect) | 4     | 107   | 6       |
| `75a0eda` Moved oEmbed into `ghost/domains/publishing/transition/`          | 24    | 72    | 43      |
| `a5c7786` Added publishing's public actions; network uses them              | 8     | 189   | 27      |

273 of the 419 lines removed by the migration are oEmbed's legacy inventory
entry. The move is 14 renames and 10 edited files.

### Migrating to `defineService`

- oEmbed was a legacy root that built its instance **while it was imported**
  (`index.js` forwarding `service.js`). It is now `index.ts` with a
  `defineService` root. Boot binds it and awaits `init()` after the adapter
  manager and before Mentions. NFT is still registered before Twitter, and the
  images adapter and provider credentials are still read once.
- A service that is not legacy may have no known violations, and oEmbed had
  eight. Three were in `service.js` and went away with it. The other five had to
  be fixed first: the logger and the image transform are now passed in to the
  service and the Twitter provider, lodash is imported per function, and the
  provider lookup goes through `extract-oembed.ts`, the one file allowed to
  import the extractor.
- Consumers now read `.service` when they use it: the Admin API endpoint, the
  Mentions root and the network root.
- Its inventory entry and all eight known violations are deleted. Known
  violations went from 294 to 286.

Deviation from the migrate-service guidance: it asks for dependency preparation
and the initializer change as separate commits, with characterization tests
merged first. They are one commit here. The intermediate state does not lint:
the new injected dependencies have to be required somewhere, and until the root
exists the only place is `service.js`, which is not a root and so may not
import them. The existing tests (the root test's 24 cases, the service's 150,
Mentions' tests and the e2e-api oembed test) were run green before the change
and adapted mechanically: constructors gained two arguments, and import-time
composition became `init()`.

`gx services verify oembed` was **not run to completion**: it stops at
`base-current` because `origin/main` has moved on since the spike's base
commit, and the spike was told not to rebase.

### Moving it

Done with the relocate tool. One string-built path needed a hand edit and the
tool reported it. Three inventory evidence paths were edited by hand.

### Publishing's public surface

- `data/external-page.data.ts`: `ExternalPageDescription`,
  `DescribeExternalPageOptions`, `ExternalPageHtml`,
  `FetchExternalPageHtmlOptions`.
- `actions/describe-external-page.action.ts` and
  `actions/fetch-external-page-html.action.ts`. Each is a plain function that
  reads the oEmbed root's `.service` in its body and returns plain data.
- Network's root now passes `describeExternalPage` to its metadata service and
  no longer imports oEmbed. Mentions, still legacy, imports
  `domains/publishing/transition/services/oembed` directly, as allowed.

`fetchExternalPageHtml` has no caller in a domain yet. Its only user is
Mentions, which is legacy.

### The boundary check rejects direct imports (verified)

Each import was added, the check was run, and the file was restored.

| Import added to network                                                                                    | Result                                                                      |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| An implementation file requires `publishing/transition/services/oembed/oembed-service` and the oEmbed root | `lint:boundaries` fails: `domain-transition-private`, once for each         |
| The **service root** requires the same service class                                                       | passes, and the report counts it under "Imports of a transition/ folder": 1 |
| The root requires a publishing file outside `actions/`, `data/`, `events/` and `transition/`               | `lint:boundaries` fails: `domain-public-surface`                            |

The second row is the rule as written ("a service's index.ts may import another
domain's transition/; these are counted, not blocked"). It means that once a
public action exists, nothing stops a root from going round it. The count is
the only signal.

### Verified at the end of step 8

- oxlint, boundaries (5914 modules, 286 known, 189 deferred), typecheck, ESLint,
  `lint:domain-rules`, `lint:legacy-services`, `lint:dependencies` (knip),
  `format:check`, docs lint: pass.
- Unit suite: 11,642 passed; the same 34 baseline failures and no others.
- DB-backed: 8 files, 76 tests pass (the step 1 set plus Mentions).
- `tools/scripts` tests: 416 pass, the same 20 baseline failures. `tools/gx`
  tests: 155 pass.
- Real boot from source: 3.18s, 3.01s, 2.94s.
- Report: `transition/` holds 11 files (network 3 models, publishing 8). The
  network root has 3 legacy imports (models, mentions, staff) and none of a
  `transition/` folder.

### What step 8 showed

- **An action needs no kernel utility.** Both actions are plain functions. What
  made them work was a typed service root to import and a `data/` type to
  return.
- **Typing the action exposed a contract mismatch.** While network required
  oEmbed with `require()`, everything was `any`. Once it called a typed action,
  its own metadata service turned out to declare a stricter return type than
  oEmbed gives (it can return `undefined`). Network's service now uses
  publishing's `ExternalPageDescription`. A reshaped file importing another
  domain's `data/` type is exactly the allowed case.
- **A defect from step 7 surfaced only here.** `Settings.parseDefaultSettings`
  adds `group`, `key` and a function to every default setting it reads. The
  merge had handed it the objects the domain declared, so a fragment was
  different after first use and the settings hash in the integrity test
  depended on test order. It passed in three full runs and failed in the
  fourth. Fragments are now deep-frozen where declared and copied where merged,
  with tests for both.
- **A test in one domain reaches into another.** oEmbed's root test builds
  network's `RecommendationMetadataService` and Mentions' `WebmentionMetadata`
  to check they call the shared instance. Tests are outside the boundary scan,
  so nothing objects. It is a multi-domain test that moved with oEmbed because
  its subject is oEmbed.
- **Which of oEmbed's "events" were commands?** oEmbed publishes and listens
  to no events.

## Final summary

Eleven commits on `claude/ghost-modular-architecture-bqbbrw` from base `3dca1a3`, plus the commit that adds this summary. Before that last commit: 215 files changed, 6,989 lines added, 1,204 removed.

### What each step cost

Whole-commit figures. Each commit also adds its section of this log, so the
last column gives the change without it.

| Step                                 | Commit    | Files | Added | Removed | Without this log (added / removed) | Notes                                              |
| ------------------------------------ | --------- | ----- | ----- | ------- | ---------------------------------- | -------------------------------------------------- |
| 1 Baseline                           | `11208df` | 1     | 55    | 0       | 0 / 0                              | this log only                                      |
| 2 `ghost/domains` first-class        | `8b43ad4` | 31    | 431   | 91      | 333 / 90                           | one-off                                            |
| 3 Kernel utilities and discovery     | `2e1060e` | 21    | 1,690 | 21      | 1,603 / 21                         | one-off; about half is tests                       |
| 4 Fixture domains                    | `5368290` | 38    | 853   | 2       | 764 / 0                            | one-off                                            |
| 5 Enforcement                        | `ecdbfee` | 12    | 1,569 | 7       | 1,483 / 6                          | one-off; about half is tests                       |
| 6 Move recommendations whole         | `c906358` | 64    | 245   | 97      | 156 / 97                           | 49 renames; 32 of the added lines are `CONTEXT.md` |
| 7 Reshape recommendations            | `e219dd7` | 96    | 1,725 | 691     | 1,464 / 690                        | 37 renames, 21 new files; about 150 lines one-off  |
| 8a Migrate oembed to `defineService` | `b4a6ee8` | 19    | 253   | 419     | 253 / 419                          | 273 removed lines are its inventory entry          |
| 8 Fix: fragments frozen and copied   | `0490ddc` | 4     | 107   | 6       | 107 / 6                            | a defect from step 7                               |
| 8b Move oembed whole                 | `75a0eda` | 24    | 72    | 43      | 72 / 43                            | 14 renames; 28 added lines are `CONTEXT.md`        |
| 8c Publishing's public surface       | `a5c7786` | 8     | 189   | 27      | 189 / 27                           |                                                    |

**Estimating other roots, from two data points each, so treat as a range:**

- _Moving a standard root whole_: leaving out each new `CONTEXT.md`,
  recommendations (49 files moved: 22 source, 3 models, 20 tests, 4 snapshots)
  added 124 lines and removed 97; oembed (14 files moved) added 44 and removed 43. In both, almost every changed line is a relative import rewritten by the
  tool. Hand edits were 4 and 2 files. Expect two to three rewritten lines per
  moved file and under an hour of hand work per root, **provided the root is
  already standard**.
- _Migrating a legacy root first_: oembed, rated "straightforward" overall and
  "complex" for dependencies, took 19 files and about 250 added lines, most of
  it test adaptation for two injected dependencies. This is the step whose cost
  varies most by root.
- _Reshaping_: recommendations took about 670 lines added and 275 removed in
  domain code and about 500 added in tests, for 22 source files. Roughly a
  third of the test change was rewriting the root's test, because the root's
  behaviour (subscribing, scheduling) moved to a listener and jobs. A root with
  routes, settings, permissions, tables, a listener and start-up work is close
  to the worst case; a root with none of those is mostly renames.

### Answers to the open questions

| Question                                                                                  | Answer                                                                                                                                                                                                                                                                                                                                                              | Evidence         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Does finding files at start work under the unit test runner and in the tsc-built package? | Yes to both. One scenario passes under vitest, under plain `node` on tsc-built JavaScript beside its source, and on JavaScript alone. No generated index was needed.                                                                                                                                                                                                | step 4           |
| What does it cost at boot?                                                                | Not measurable here. Baseline 3.40s to 3.47s; final state with two domains 2.94s to 3.18s. Three runs each on one machine, so this shows "no visible cost", not a saving.                                                                                                                                                                                           | steps 1, 3, 7, 8 |
| Does `boot.ts` need to exist before it supplies dependencies? What ended up in it?        | No. Neither real domain has one. The only `boot.ts` is in the `library` fixture, where `defineDomain({ dependencies })` supplies three things to three roots.                                                                                                                                                                                                       | steps 4, 7       |
| How far is the code from "the domain file hands each root its dependencies"?              | For recommendations: 10 `require` lines in the root would move to `boot.ts` (7 foundation or shared, 3 legacy). The mechanism exists and is tested on the fixture. It was not applied to real code.                                                                                                                                                                 | step 7           |
| What is the full list of roles?                                                           | `action`, `data`, `event`, `endpoint`, `controller`, `validator`, `serializer`, `service`, `repository`, `entity`, `value`, `listener`, `job`, `renderer`, `template`. `endpoint`, `value`, `data`, `renderer` and `template` are not in the rules as given.                                                                                                        | steps 5, 7       |
| Does an action need a kernel utility?                                                     | No. A plain function that imports its own service root and reads `.service` in its body. Three real actions and three fixture actions are written that way.                                                                                                                                                                                                         | steps 4, 7, 8    |
| How should `test/e2e` be organised, where do snapshots go, what about multi-domain tests? | Keep the old suite as the first folder (`test/e2e/api`, `server`, `frontend`), so each existing runner project gains one glob and CI is unchanged. Snapshots stay beside the test. Multi-domain tests stay in `ghost/test`.                                                                                                                                         | step 7           |
| Where should foundation's code live, and what had to be treated as foundation?            | The spike put only its own additions in `ghost/core/foundation/`. Treated as foundation or shared, by a list in the boundary config: config, Sentry, URL utils, settings cache, labs, the database, the jobs service, the settings service, permissions, limits, mail, outbound HTTP. Logging and the event bus are npm packages and are not restricted for a root. | steps 3, 5       |
| Which "events" turned out to be commands?                                                 | Neither root publishes any event. Recommendations had two commands disguised as `init()` timers, now jobs. oEmbed has none.                                                                                                                                                                                                                                         | steps 7, 8       |
| Did "no say over start order" hold for recommendations? Was a slot needed?                | Two of three uses of Mentions became calls at the moment of use. Registering a URL mapper on Mentions cannot. No slot was needed, because the domain layer as a whole starts after everything in `boot.js`.                                                                                                                                                         | step 7           |
| How were the staff alert, cross-domain model reads and relations handled?                 | Alert: the domain owns the content, not the template (it needs Staff's layout). Recipients from `models.User` in the root, counted as legacy. No Bookshelf relations; two foreign keys to `members.id`, listed by the report.                                                                                                                                       | step 7           |
| Which rules were ambiguous, wrong or missing?                                             | See the table in step 7 (10 rows) and the list in step 5 (5 decisions).                                                                                                                                                                                                                                                                                             | steps 5, 7       |

### The findings that matter most

1. **Discovery works everywhere and costs nothing visible.** This was the
   biggest risk and it did not materialise.
2. **Moving is cheap and mechanical once a root is standard; migrating a legacy
   root is where the cost is.** A legacy root also cannot move at all as the
   tooling stands.
3. **"Creating a file has its effect" holds for new things. Moving an existing
   thing out of an ordered central list leaves a one-line placeholder**, because
   table creation, the settings hash and the public settings output all depend
   on order.
4. **Fragments must be frozen.** The first registry that read one changed it.
5. **Type-only imports are invisible to the boundary scan**, so the public
   surface is enforced for values and not for types.
6. **Listeners cannot be lazy and must import (or name) another domain's
   event.** The implementation import rule needs a carve-out for `events/` and
   `data/`.
7. **The staff alert rule cannot be met until a shared mail module exists.**
8. **Every place that names `ghost/core/server/services` or `ghost/test` is a
   place a moved root silently drops out of.** The spike found them in lint
   config, two oxlint rules, the boundary scanner, three tests, the legacy
   inventory, the CI filters, the build and the package manifest. `gx` is still
   unconverted.

### Not verified, in one place

- The full DB-backed suites. 25 files were run, chosen for relevance.
- The full unit suite has 34 failures in 3 Mailgun and mailer files on
  untouched main in this container; their cause is only partly established.
- `pnpm archive`, the production Docker image and a browser run of Admin.
- `gx services verify`, which needs the branch rebased onto current main.
- Cron scheduling of a domain job through the jobs service: written, not run.
- The two recommendation jobs on their real timers.
- MySQL was 8.4 from a registry mirror, not the pinned `8.4.11` image.
- Timing figures are three runs each on one shared machine.

## Part 2: kernel and foundation

Status: in progress. Same conventions as part 1: **verified** means run in this
spike and quoted; **inferred** means read from source.

The question: can this rule be reached, and what is "foundation" if it is?

> Anything in kernel can be imported directly, by any code, without thinking
> about whether the import is allowed. Things that are importable hold no state.

Head of the branch at the start of part 2: `e8f4258`.

### Part 2 baseline (verified)

Node v22.23.4 in the shell. MySQL 8.4 from `mirror.gcr.io/library/mysql:8.4`.
A real boot needs `pnpm build:assets` first in a fresh checkout (the card asset
manifest is a build output); part 1 did not record that.

Boot from source, six warm runs,
`NODE_ENV=testing-mysql GHOST_CI_SHUTDOWN_AFTER_BOOT=1 node --conditions=source --import=tsx index.js`
with logging sent to stdout:

| Line                      | Range over six runs |
| ------------------------- | ------------------- |
| "Ghost server started in" | 1.095s to 1.290s    |
| "Ghost database ready in" | 1.217s to 1.436s    |
| "Ghost booted in"         | 3.290s to 3.532s    |

## Part 2, step 1: inventory

Counts are files under `ghost/core` and `ghost/domains` that import the thing,
tests excluded, found with `grep` on the import specifier (verified by running;
a grep can miss a re-export or an unusual specifier, so read each count as
"about"). "Roots" is how many of those are a service root `index.{ts,js}`,
where the Service Standard says an instance may be imported so it can be
passed on. Everything that is not a root imports the instance directly.

### Things that hold state, read the environment, or are built once per process

| Thing                             | Where it lives                                                                  | How it is built and configured                                                                                                                                                            | Importers (roots)               | Can a stateless mechanism be split from the instance?                                                                                                                            | What blocks it                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logging                           | `@tryghost/logging` 6.0.7 (TryGhost/framework)                                  | Built when the package is first required; cached on `globalThis[Symbol.for('@tryghost/logging@6')]`; options come from `require(<process root>/loggingrc)`, which requires Ghost's config | 352 (27)                        | Yes. The class `GhostLogger` takes an options bag and reads nothing itself. It can be required as `@tryghost/logging/lib/GhostLogger` without building the singleton             | The package's entry point always builds the instance. There is no supported factory export and no supported way to hand the package an instance. Two loggers on one rotating file corrupt it |
| Config                            | `ghost/core/shared/config/`                                                     | `index.ts` runs `loadNconf()` when imported: nconf layers argv, env, secret files and JSON files, then a Zod schema validates and the tree is frozen (or proxied)                         | 149 (24)                        | Yes. Layering, validation, guard, lenient parse and report are generic. Values are `defaults.json`, `env/*.json`, `overrides.json`; the schema and the bound helpers are Ghost's | `validated.ts` imports Ghost's schema and binds Ghost's URL helpers; `guard.ts` and `validated.ts` read `process.env` in exported functions; the loader calls two Ghost-specific path fixes  |
| Database (Knex)                   | `server/data/db/{index.js,connection.ts,configure-knex.ts}`                     | `connection.ts` builds Knex from `config.get('database')` when first required; `index.js` requires it lazily behind a getter                                                              | 32 (9)                          | Yes. `knex(options)` is the mechanism; `configure()` derives the options                                                                                                         | `configure()` imports the config and logging singletons and reads `process.env` (`REQUIRE_INFILE_STREAM`, `NODE_ENV`, `ALLOW_INFILE_STREAM`)                                                 |
| Bookshelf and the models registry | `server/models/base/bookshelf.js`, `server/models/index.js`                     | `bookshelf(db.knex)` at module scope; every model file calls `ghostBookshelf.Model.extend` and registers itself while it is imported                                                      | 117 (29)                        | **No**, not without rewriting every model as a factory                                                                                                                           | About 100 model files close over the one Bookshelf instance at import. Direction says no new Bookshelf models, so this is legacy to inject until it is gone                                  |
| Event bus                         | `@tryghost/domain-events` 3.4.1 (TryGhost/framework)                            | A class with a static `EventEmitter`; no instance, no configuration; imports the logging singleton                                                                                        | 29 (10)                         | Not in the package as published                                                                                                                                                  | Everything is `static`. It needs an instance export (`createEventBus()`), an `unsubscribe`, and an injected logger                                                                           |
| Legacy event registry             | `server/lib/common/events.js`                                                   | One `EventEmitter` subclass instance built at import                                                                                                                                      | about 24 to 37 (9 to 13)        | Trivially (it is `new EventEmitter()`)                                                                                                                                           | Its own header says it is overused and should be removed, not promoted                                                                                                                       |
| Job runner                        | `server/services/jobs-service/`                                                 | `init({ knex, config })` called from `boot.js`; module-level `instance`; needs the adapter manager, logging, Sentry                                                                       | 34 (5)                          | Yes: `JobsService` is a class given its backend                                                                                                                                  | Queue declarations must be known before `start()`; the instance is deliberately kept for the life of the process because Mentions captures it                                                |
| Sentry                            | `shared/sentry.js`                                                              | Reads `config.get('sentry')` at import and initializes `@sentry/node` at module scope when a DSN is set                                                                                   | 27 (5)                          | Partly: `beforeSend` and the integrations are pure; `Sentry.init` is process-global in the SDK itself                                                                            | The SDK is a process singleton by design                                                                                                                                                     |
| Metrics                           | `@tryghost/metrics` 3.7.7 (TryGhost/framework)                                  | `new GhostMetrics(require(<process root>/loggingrc))` at import                                                                                                                           | 13 (1)                          | Yes: `GhostMetrics` class is exported                                                                                                                                            | Same as logging: the entry point builds the instance, and it reads the logging options file                                                                                                  |
| Tracing and metering              | `server/lib/tracing/index.ts`                                                   | `createTracer({ transport: ghostMetrics, logging })` and `createMeter(...)` at module scope                                                                                               | few; not counted                | Already split: `create-tracer.ts` and `create-meter.ts` are factories                                                                                                            | Only `index.ts` (the instance) needs to move behind injection                                                                                                                                |
| Prometheus client                 | `shared/prometheus-client.js`                                                   | Built at import when boot requires it and `prometheus:enabled`                                                                                                                            | 1                               | Not looked at further                                                                                                                                                            |                                                                                                                                                                                              |
| URL utils                         | `shared/url-utils.ts`                                                           | `new UrlUtils({...})` at import, given config's getters and several config values read once                                                                                               | 131 (23); 42 in `core/frontend` | Yes: `@tryghost/url-utils` exports the class                                                                                                                                     | Volume, and the front end uses it everywhere. It is a site fact, so it belongs to shared, not foundation                                                                                     |
| Outbound HTTP                     | `server/lib/request-external.js`                                                | Two keep-alive agents built at import from four config values; SSRF checks are pure functions in the same file                                                                            | 12 (7)                          | Yes: a factory taking the agent options                                                                                                                                          | Nothing but the module-scope `config.get` calls                                                                                                                                              |
| Settings cache                    | `shared/settings-cache/`                                                        | `new CacheManager({ publicSettings })` at import; filled by the settings service at boot                                                                                                  | 87 (22); 19 in `core/frontend`  | Yes: `CacheManager` is a class                                                                                                                                                   | It is state by definition (a cache of the settings table). Shared, not foundation: another application has no settings table                                                                 |
| Labs                              | `shared/labs.js`                                                                | Module functions over the settings cache, config and logging singletons                                                                                                                   | 40 (8)                          | Yes: the flag lists are data; `isSet` needs the settings cache and config                                                                                                        | Shared, Ghost-specific                                                                                                                                                                       |
| i18n                              | `shared/i18n/index.js`                                                          | Module-level `i18nInstance`, set by `init({ events })` from boot                                                                                                                          | 15 (3)                          | Yes: `@tryghost/i18n` builds an instance per locale                                                                                                                              | Shared, Ghost-specific                                                                                                                                                                       |
| Adapter manager                   | `kernel/adapter-manager/` (class), `server/services/adapter-manager` (instance) | `new AdapterManager({...})` at import of the service file, given Ghost's registry, paths and a config getter                                                                              | 31 (12)                         | **Already split**, and the only one that is                                                                                                                                      | The kernel half reads the filesystem (see below)                                                                                                                                             |
| Clock                             | `kernel/clock.ts`                                                               | `getUnixTime()` reads the system clock; `moment` re-exports the `moment-timezone` library object, whose default zone `server/overrides.js` sets to UTC at boot                            | 10 (0); raw `moment` in 43 more | Yes: a `Clock` type and a system clock instance                                                                                                                                  | `moment` is a mutable process-global library object. 43 files still import it directly                                                                                                       |
| Limits                            | `server/services/limits.ts`                                                     | Module-level instance, `init()` from boot                                                                                                                                                 | 8 (4)                           | Yes (`@tryghost/limit-service` is a class)                                                                                                                                       | Shared, Ghost-specific                                                                                                                                                                       |
| Mail                              | `server/lib/mail` (`GhostMailer`)                                               | A class; each caller does `new GhostMailer()`, which reads config and settings itself                                                                                                     | 19 (9)                          | Already a class, but its constructor reaches for singletons                                                                                                                      | Shared                                                                                                                                                                                       |
| `process.env`                     | read directly                                                                   | n/a                                                                                                                                                                                       | 39 (1)                          | n/a                                                                                                                                                                              | Each is an ambient read. `NODE_ENV` is the common one                                                                                                                                        |
| `@tryghost/debug`                 | npm package                                                                     | Reads `DEBUG` from the environment when a namespace is created at module scope                                                                                                            | 128 (0)                         | Not attempted                                                                                                                                                                    | A diagnostic that is meant to be ambient. Left alone                                                                                                                                         |
| Errors, `tpl`, validator          | `@tryghost/errors` (387), `@tryghost/tpl` (179)                                 | Stateless                                                                                                                                                                                 | n/a                             | Nothing to split: these are what "import it directly" already looks like                                                                                                         |                                                                                                                                                                                              |

Two things the table shows:

- **"Inject" is the rule and direct import is the practice.** For logging, 325
  of 352 importers are not service roots; for config, 125 of 149. The Service
  Standard is being met by new code only.
- **Only three of these are things another application would need**: config,
  logging, the database, plus an event bus, a job runner and a clock if it has
  domains. Everything else in the table exists because of what Ghost is
  (settings, labs, URL shapes, mail, limits, Sentry wiring). That is the line
  between foundation and shared, and it matches the owner's test.

### Existing kernel files against the kernel rules (inferred from reading; step 7 turns this into a check)

Rules: no module-level mutable state; no ambient reads (process.env, config,
filesystem, clock) at module scope or in exported functions; exports are
mechanisms, never instances.

| File                                 | Breaks                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clock.ts`                           | `getUnixTime()` reads the system clock in an exported function. `moment` exports a library object that holds process-wide mutable state (its default timezone) and is not a mechanism |
| `adapter-manager/loader.ts`          | `loadAdapterClass` reads the filesystem (`fs.readFileSync` of a `package.json`) and builds a `require` with `createRequire` inside an exported function                               |
| `adapter-manager/adapter-manager.ts` | Passes: a class; its cache is instance state. But it is a once-per-process class, which matters for where it belongs (step 2)                                                         |
| `domains/discover.ts`                | Reads the filesystem (`readdirSync`, `existsSync`) and defaults to the ambient `require`                                                                                              |
| `domains/definitions.ts`             | `defineEvent`'s class defaults `timestamp` to `new Date()`: a clock read in an exported class                                                                                         |
| `domains/domain-layer.ts`            | Passes: state is inside the object `createDomainLayer` returns                                                                                                                        |
| `define-service.ts`                  | Passes: state is inside the root it returns. Note that a root **is** an exported instance holder, exported from application code, not from kernel                                     |

## Part 2, step 2: design

### What foundation is

Three shapes were on the table. Stated plainly first, then argued.

**Chosen: (b), with one sharpening.** Foundation is framework code beside
kernel. It **builds** the once-per-process instances from an application's
values and assembles them into an application object. Ghost supplies the
values and one bootstrap file. "Foundation" is also the name of the first
layer of instances that object holds. Three places, three rules:

| Place                    | Holds                                                                                                                                                                         | Who may import it                                             | State                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ghost/core/kernel/`     | What any code may import **and use**: types (`Logger`, `Config`, `Database`, `EventBus`, `Foundation`), `define*` helpers, pure functions, the domain runner                  | Anything, always                                              | None                                                                    |
| `ghost/core/foundation/` | Framework code that **builds** what exists once per process: `createLogger`, config loading and `createConfig`, `createDatabase`, reading domain folders, `createApplication` | An application's bootstrap, and tests                         | None in the modules; calling them makes state and reads the environment |
| `ghost/core/bootstrap/`  | Ghost's side: the values, and the one module that holds the application object                                                                                                | `boot.js`, and the legacy singleton modules that now alias it | **This is where the instances live**                                    |

The sharpening is the middle row. The brief's rule for kernel is about
importing. The code shows a second property that matters just as much:
**whether it is safe to call**. `new GhostLogger(options)` holds no state as a
module and reads nothing ambient, so by the three kernel rules it could sit in
kernel. But the logging package itself documents that two loggers on one
rotating file corrupt it, and two Knex instances are two connection pools. If
those factories are in kernel, "import anything from kernel without thinking"
becomes "import anything, but think before you call these four". Putting the
once-per-process factories in a folder only bootstrap may import keeps the
kernel rule honest, and keeps "who builds instances" visible in the import
graph, which is the constraint behind "no service locators".

So for the three named cases the kernel half is small: a type and, for config,
a pure function that parses a slice. That is the honest result, not a
shortfall: what a domain needs from logging is the `Logger` type, never the
means of making one.

### Why the others lost

**(a) Foundation is only a layer and a name; mechanisms in kernel,
construction in Ghost's bootstrap.** Cheapest: no new folder. It fails twice.
First, the once-per-process factories would be in kernel, as above. Second, it
fails the owner's test. The order (config, then a logger built from config,
then the database, then the event bus, then discovery and the domain runner
given all four), build-once-on-first-use, and the shape of what a domain is
handed are the same for any application. Under (a) a second application copies
that file. Step 5 measures what it would have had to copy.

**(c) Foundation is a folder of Ghost-specific wiring.** This is what part 1
built (`foundation/domains/` imports Ghost's jobs service and the path of
`ghost/domains`). It cannot pass the owner's test by definition: nothing in it
is usable by another application. The Ghost-specific wiring is real and needs
a home, but in Laravel's terms that home is `bootstrap/`, not the framework.
Part 1's `foundation/domains/` moves to `bootstrap/`.

### What (b) costs

- A third name to learn (kernel, foundation, bootstrap), and a rule for the
  middle one that is about calling, not importing. Step 9 returns to the names.
- For a long time the legacy singleton modules stay, as one-line aliases of
  the application object. Both spellings work and reach one instance.
- Config machinery moves out of `shared/config/` and has to be made generic
  over a schema. That is the largest single change (step 3).

### How old and new share one instance

The application object in `bootstrap/` owns each instance. Each legacy module
keeps its path and its export shape and becomes an alias:

| Legacy module                        | Becomes                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/config/index.ts`             | `export = application.config`                                                                                                                                                                                                                                                                   |
| `server/data/db/connection.ts`       | `export = application.database?.knex`                                                                                                                                                                                                                                                           |
| `@tryghost/logging` (not ours)       | Bootstrap builds the logger and places it where the package looks for its cached instance, before the package is first required. If legacy code required the package first (a unit test that never boots), bootstrap adopts that instance instead of building a second. Either way there is one |
| `@tryghost/domain-events` (not ours) | The foundation's event bus is an adapter over the package's static emitter                                                                                                                                                                                                                      |

### How a domain gets them

- The domain layer hands the **foundation** (`{ config, logging, database,
  events }`) to the domain's `boot.ts`. `boot.ts` returns what the domain's
  roots receive in `create`. A domain with no `boot.ts` hands its roots the
  foundation unchanged.
- `boot.ts` **imports** what the domain needs from shared, legacy and other
  domains' actions, inside `dependencies()`. Those imports stay visible in the
  import graph and stay counted. Only the foundation is injected, because only
  the foundation is guaranteed to exist before any domain.
- **Config reaches a domain as a typed slice it declares**, not as the whole
  instance: `config.slice('services:recommendations', Schema)` in `boot.ts`,
  parsed once when the domain starts, so a bad value fails boot. This is the
  `AppsConfig` pattern in `app-installations` made a method. The cost: the
  slice is read once, so a test that calls `config.set` after boot does not
  reach a reshaped domain. `app-installations` re-reads per use for exactly
  that reason. Reshaped code is tested by passing the slice in, so it does not
  need `config.set`.

### What cannot follow "kernel is always importable and stateless"

Predicted here, confirmed or corrected in the report at the end:

1. **The models registry**: defined against one Bookshelf instance at import.
   Injected as an instance for as long as Bookshelf exists.
2. **The event bus as published**: static state in a package. An adapter makes
   it injectable; it stays one process-wide emitter until the package changes.
3. **Sentry and `@tryghost/debug`**: process-global by design of the SDK and
   of the diagnostic.
4. **`moment`**: a mutable library object. It can be imported, but it is not
   stateless, so it cannot be a kernel export under the rule.
5. **The config loader**: it must read `process.env`, argv and files. It is in
   foundation, not kernel, so it needs no exception to the kernel rule. The
   kernel plan's "one named exception" becomes unnecessary.

## Part 2, step 3: config, logging and the database, split and shared

One commit holds steps 3 and 5 and the first half of step 6, because the code
would not come apart: the second application is what shows the framework half
is not Ghost's, and "boot builds the foundation first" is two lines once the
application object exists.

### What is where now

| Case     | Kernel (importable by anything)              | Foundation (framework; only bootstrap imports it)                                                      | Ghost's values and bootstrap                                                                                                                                        |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config   | `Config` type, `parseConfigSlice` (40 lines) | `config/`: `loadConfigSources`, `createConfig`, guard, lenient parse, report, secret files (849 lines) | `shared/config/`: `defaults.json`, `env/`, `overrides.json`, the schema, six helper methods, when a violation is fatal, when writes throw (629 lines of TypeScript) |
| Logging  | `Logger`, `LoggerOptions` types (15 lines)   | `logging.ts`: `createLogger(options)` (18 lines)                                                       | `bootstrap/logging-options.ts` (what `loggingrc.js` used to compute), `bootstrap/legacy-logging.ts` (the seam to the package's instance)                            |
| Database | `Database` type (11 lines)                   | `database.ts`: `createDatabase(knexOptions)` (13 lines)                                                | `server/data/db/configure-knex.ts` (Ghost's Knex options), now given the environment name and a logger instead of importing them                                    |
| Events   | `EventBus` type (10 lines)                   | `events.ts`: `createEventBus({ logging })` (32 lines)                                                  | `bootstrap/legacy-events.ts`: an adapter over `@tryghost/domain-events`                                                                                             |
| Assembly | `Foundation` type (19 lines)                 | `application.ts`: `createApplication` (141 lines); `domains.ts`: `readDomains` (30 lines)              | `bootstrap/app.ts` (62 lines): the one module that holds instances                                                                                                  |

**Config, in detail.** Before, `shared/config/` held 1,257 lines of TypeScript
with machinery and Ghost's decisions interleaved. After, 849 lines are generic
and in `foundation/config/`, and 629 stay with Ghost. What made it generic:

- `createConfig(sources, policy)` takes the schema, the config's name for
  messages, and two functions of the tree: `strict` and `guard`. Ghost's
  `isStrict` and `shouldGuard` read `GHOST_CONFIG_SCHEMA_STRICT` and
  `GHOST_CONFIG_GUARD` and stay Ghost's.
- `loadConfigSources(options)` takes the two folders, the environment name,
  whether local files are read, extra environment files (Ghost's Docker file)
  and a hook called with each bundled store (Ghost's sqlite path fix).
- Ghost binds its URL helpers and six methods onto the result, as before.
- `shared/config/{guard,lenient,report,secrets,utils,validated,loader}.ts` keep
  their exports, so **the nine existing config test files (173 tests) pass
  without a change** (verified).

**Config for a domain: a typed slice, parsed once.** `config.slice(path,
schema)` is on every config `createConfig` builds. It is `app-installations`'
`AppsConfig` pattern as a method: `safeParse(config.get(path) ?? {})`, and an
`InternalServerError` with `code: 'CONFIG_SLICE_INVALID'` and Zod's report as
context. A domain's `boot.ts` calls it, so a bad value fails boot.

### One instance, not two (verified)

`test/unit/bootstrap/app.test.ts` starts a process of its own, builds the
foundation as boot does, and compares:

| Legacy path                                                                                                | Same object as the foundation's? |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `require('core/shared/config')`                                                                            | yes                              |
| `require('@tryghost/logging')`                                                                             | yes; built by the application    |
| `require('core/server/data/db').knex`                                                                      | yes                              |
| `require('core/server/data/db/connection')`                                                                | yes                              |
| A subscriber added through `@tryghost/domain-events` sees an event dispatched through the foundation's bus | yes                              |

It also checks that importing `bootstrap/app` builds nothing, and that the
build order is config, logging, database, events.

When legacy code loads `@tryghost/logging` before the application exists (any
unit test that never boots), the application **adopts** that logger instead of
building a second. That path is tested in the same file. In a real boot the
application builds it: `boot.js` builds the foundation before it requires
anything that logs.

### Logging: what the package needs

The smallest change that works **without** touching the package, which is what
was built: `createLogger` requires the class from
`@tryghost/logging/lib/GhostLogger` (the entry point would build the
singleton), and Ghost's bootstrap places the logger it built at
`globalThis[Symbol.for('@tryghost/logging@6')]`, where the package looks before
building its own. Both rely on things the package does not promise: a file
path inside it, and the name of its cache key.

What `@tryghost/logging` should offer instead (TryGhost/framework is not
attached to this session, so this is specified, not made):

1. **A factory that builds nothing on import**, as a subpath export:
   `require('@tryghost/logging/logger')` returning `{ GhostLogger,
   createLogger(options) }`. Today the only supported import builds the
   singleton and reads `loggingrc`.
2. **A supported way to give the package its instance**:
   `logging.setInstance(logger)` (or `adopt`), documented as "call before
   anything else requires the package". It replaces writing to the
   `globalThis` key. It should throw if an instance already exists and is not
   the one given, so two loggers cannot happen silently.
3. Optional, later: **the entry point resolves lazily**, so that requiring the
   package before the application exists does not build a logger from
   `loggingrc`. Without this the "adopt" path above has to stay.

`@tryghost/metrics` has the same shape (it builds `new GhostMetrics(require(
'loggingrc'))` on import) and needs the same two exports. It was not
changed; it still reads `loggingrc.js`, which now returns
`loggingOptions(config)`.

`@tryghost/domain-events` needs `createEventBus()` returning an instance with
`subscribe`, `dispatch` and `unsubscribe`, and to be given its logger. The
foundation has a 32-line bus of that shape, used by the second application;
Ghost stays on the package's static emitter through the adapter, so legacy
subscribers and domain listeners share it.

### The database and what sits on it

- The handle is built by the application from `configure(database, { env,
  logging })`. `configure` no longer imports config or the logging package at
  module scope; called without the second argument (the migrator config, its
  own test) it looks them up as before.
- **Bookshelf and the models registry sit on the same handle unchanged**:
  `models/base/bookshelf.js` calls `bookshelf(db.knex)`, and `db.knex` is the
  application's. Nothing about models was changed. A reshaped repository is
  still handed a model by its domain's `boot.ts`.
- Not changed, and on the same handle: the jobs service (`init({ knex })`),
  Sentry query tracing and the Prometheus instrumentation in `boot.js`, and
  `DatabaseStateManager`, which gives knex-migrator Ghost's database config to
  open connections of its own.

### Discovery no longer reads from kernel

`kernel/domains/discover.ts` now takes `{ list, load }`: how a folder is
listed and how a file is loaded. It imports no `fs` and uses no ambient
`require`. `foundation/domains.ts` (`readDomains`) supplies both. The kernel's
discovery tests no longer touch the disk; four tests of real folders moved to
`test/unit/foundation/domains.test.ts`.

**Capability subfolders, one level deep.** `actions/`, `events/`,
`listeners/` and `jobs/` may each hold subfolders: `jobs/gifts/x.job.ts` is
found as the job `gifts/x`, with the capability in its name so two
capabilities can each have a `send`. A second level is not read. Tests:
`discover.test.ts` (found one level deep, not two, wrong role ignored) and
`foundation/domains.test.ts` (on a real folder). The naming and shape checks
follow in step 7.

Decision the rule did not make: `services/` is not given capability
subfolders. `services/<name>/` is already one folder per root, and
`services/<capability>/<name>/index.ts` would change every service location
rule from part 1.

### Verified

- Typecheck (`nx run ghost:test:types`), oxlint, ESLint, boundaries (5938
  modules, 286 known, 189 deferred), `lint:domain-rules`, knip, `format:check`:
  pass.
- Unit suite: 11,648 passed plus the new tests; the same 34 baseline failures
  in the same 3 files and no others.
- New unit tests: `foundation/` 4 files and `bootstrap/app.test.ts`, 38 tests
  with the moved bootstrap tests; kernel 101 tests.
- DB-backed, the part 1 set: 8 files, 76 tests pass against MySQL.
- `tools/scripts` tests: 438 tests, the same 20 baseline failures and no
  others, when run through `pnpm`.
- Real boot from source, six runs: "Ghost booted in" 3.26s to 3.66s (baseline
  3.29s to 3.53s). "Ghost server started in" 1.07s to 1.47s (baseline 1.10s to
  1.29s). No change that six runs can show.

### Cost

45 files changed in tracked code (254 lines added and 561 removed under
`ghost/core`, which is mostly the config machinery leaving `shared/config`),
plus about 1,570 lines in new files, of which about 620 are tests and 250 are
`create-config.ts`, which is `validated.ts` made generic rather than new code.

### What this step showed

- **The config split was already half made.** `loadNconf` took
  `baseConfigPath` and `customConfigPath`; `validated.ts` separated building
  from binding helpers. The Ghost-specific parts were five: the schema, the two
  environment switches, the Docker file, the sqlite path fix and the helpers.
- **Three messages name Ghost** and are pinned by tests ("Ghost config failed
  validation", "Ghost expects an object there", the guard's pointer to
  `SCHEMA.md`). They became parameters. A framework message cannot say "Ghost".
- **`configure-knex.ts` was the one place where importing a pure function
  built the logger**: its module-scope `import logging from
  '@tryghost/logging'` would have made the application's own database setup
  build the package's logger before the application's. Any file the bootstrap
  imports has to be free of singleton imports all the way down. That is a
  constraint on what bootstrap can reuse, and it is not visible until it bites.
- **The formatter reflows files it has not seen**, so new files need
  `pnpm exec oxfmt` before `format:check` passes; `npx oxfmt` fails on the
  engine check.

## Part 2, step 4: the domain end

### Network

`ghost/domains/network/boot.ts` now exists, and
`services/recommendations/index.ts` imports its own domain and
`core/kernel/define-service`, and nothing else. It makes no `require` of
config, logging, Sentry, url-utils, mail, outbound HTTP, settings, models,
Mentions or Staff, and no longer reads `process.env`.

What `boot.ts` holds (143 lines):

| Part                                | What                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RecommendationsConfig`             | The Zod schema of the one config section the domain reads                                                                                                                                                     |
| `NetworkDependencies`               | An interface of 13 members: everything the domain takes from outside itself, each typed from the constructor of the class that uses it                                                                        |
| `dependencies({ config, logging })` | Receives the foundation. Requires 5 shared modules (Sentry, url-utils, mail, outbound HTTP, settings), 1 action of another domain, and 3 legacy modules (models, Mentions, Staff), and returns the 13 members |

How each thing the root used to `require` is supplied now:

| Was required in the root                    | Now                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@tryghost/logging`                         | **Injected**: `foundation.logging`, passed through                                                                                     |
| `shared/config`                             | **Injected**: `config.slice('services:recommendations', schema)` becomes `refreshesEnabled`; `config.get('env')` becomes `environment` |
| `process.env.NODE_ENV` (an ambient read)    | **Injected**: `environment`                                                                                                            |
| Sentry, url-utils, outbound HTTP, settings  | Imported in `boot.ts`, passed through as they are                                                                                      |
| `lib/mail` (`new GhostMailer()`)            | Imported in `boot.ts`; the root is handed `sendEmail(to, subject, html, text)`                                                         |
| `publishing/actions/describe-external-page` | Imported in `boot.ts`, passed through                                                                                                  |
| `models`                                    | Imported in `boot.ts`; the root is handed the three models and `getStaffAlertRecipients()`                                             |
| Mentions root                               | Imported in `boot.ts`; the root is handed four functions that each ask Mentions when called                                            |
| Staff root                                  | Imported in `boot.ts`; the root is handed an object that reads the ready Staff service per email                                       |

**Whatever cannot be supplied by injection, and why.** Only two of the eleven
are foundation (config, logging), so only those two are injected. The other
nine are imported by `boot.ts`. They cannot be injected by the framework
because the framework does not know they exist: they are Ghost's, and a
"shared" bag handed to every domain would hide which domain uses mail and
which uses settings from the import graph. So they stay as imports, in one
file per domain. The report still counts the three legacy ones.

**The database did not reach the domain as `foundation.database`.** The
domain's repositories are written against Bookshelf models, so what it is
handed is three models. The database handle is there for a repository written
against Knex; network has none.

### Publishing

Both of publishing's actions already meet the rule (verified by reading and by
the boundary scan): each imports its own domain's `data/` types and its own
domain's `transition/services/oembed` root, and nothing outside the domain.
Publishing has no reshaped service root, so it needs no `boot.ts`. The oEmbed
root under `transition/` still requires config, logging and four other
modules; `transition/` is exempt by rule.

### What `boot.ts` ends up holding, and whether the name fits

In both real code and the fixtures it holds the same three things: a config
slice schema, an interface listing what the domain needs from outside, and
one function that builds it from the foundation. **It boots nothing.** It
starts no service, registers no listener and runs at no particular moment
that a reader could call "boot": the domain layer calls it once, before the
first root.

The name does not fit. What the file is, on the evidence of two fixture
domains and one real one, is the domain's list of dependencies on the outside
world. `dependencies.ts` says that, and matches the key it exports
(`defineDomain({ dependencies })`). The spike kept `boot.ts` so that part 1's
tooling and manifest did not have to change twice.

**It is now needed by any domain whose roots use something outside the
domain.** Part 1 found `boot.ts` optional because a root could import what it
needed. With the rule that a root imports only its domain and the kernel, a
domain without `boot.ts` gets the foundation and nothing else. That is enough
for a domain that only logs, reads config and publishes events. Both fixture
domains and network need more.

### Verified

- Network unit tests: 22 files pass. The root's existing 568-line test passes
  with three kinds of edit: it starts the root with what `boot.ts` builds from
  the application's foundation; two config stubs name the section instead of
  the leaf; and the development case sets `env` in config instead of
  `process.env.NODE_ENV`. Every other assertion is untouched, and its stubs on
  the legacy logger still work because that logger **is** the foundation's.
- DB-backed, the part 1 set (network and publishing e2e, well-known, Mentions):
  8 files, 76 tests pass, with network started through `boot.ts`.
- Typecheck, oxlint, ESLint, boundaries (5940 modules, 286 known, 189
  deferred), domain rules, knip, format: pass. Full unit suite: 11,678 passed;
  the same 34 baseline failures and no others.
- Report: network's legacy imports are the same three as at the end of part 1
  (models, Mentions, Staff), now from `boot.ts` instead of the root.

### What this step showed

- **Typing `boot.ts` from the constructors found a habit worth keeping.**
  `Needs<typeof WellknownService>['urlUtils']` asks for exactly what the class
  uses (`relativeToAbsolute`), not for Ghost's `UrlUtils`. The interface is a
  list of ports in the domain's own terms, and a fake of it is 30 lines.
- **Ambient reads surface when the root can import nothing.** The root read
  `process.env.NODE_ENV` directly. Nothing flagged it until the root's only
  way to learn the environment was to be told.
- **A config slice cannot be stricter than the code it replaces.** The root
  treated anything but `false` as enabled, so the slice's schema is
  `enabled: z.unknown().optional()`. A stricter schema would turn a mistyped
  value from "ignored" into "Ghost does not start". Tightening is a separate,
  announced change, as `shared/config/SCHEMA.md` already says for the central
  schema.

## Part 2, step 5: the "another application" test

`ghost/test/utils/fixtures/second-application/` is a lending desk. It is not
Ghost and shares no values with it.

| It supplies                                                                                                 | Lines |
| ----------------------------------------------------------------------------------------------------------- | ----- |
| `config/defaults.json`, `config/env/config.testing.json`, `config/overrides.json`                           | 21    |
| `config/schema.ts`: its own Zod schema                                                                      | 15    |
| `bootstrap/app.ts`: `createApplication` with where its config is, its logger options and its domains folder | 57    |
| `shared.ts`: what its domains share that is not foundation (a journal and a clock)                          | 13    |

It gets its config and logger **through the same calls Ghost makes**:
`loadConfigSources` and `createConfig` with its schema, `createLogger` with
options read from its config, `createApplication` to order and hold them. Its
two domains (the fixture `library` and `notices`) each have a `boot.ts` that
is handed the foundation.

Verified, by `test/unit/kernel/domains/fixture-domains.test.ts`, three ways
(under vitest; plain `node` on tsc-built JavaScript beside its source; plain
`node` on JavaScript alone):

- Importing and discovering builds nothing; `startFoundation()` builds
  config, logging, database, events in that order.
- `desk:name` is "Test desk": `env/config.testing.json` over `defaults.json`.
- The logger is a `GhostLogger` named `lending-desk`, level `info`, transport
  `file`, and the line a service root logged through it is read back from the
  log file.
- It has no database and nothing fails for want of one.
- Events dispatched on the framework's own bus reach the other domain's
  listener; listeners are subscribed once across a stop and start.

**Did it need Ghost-specific code? No.** For the two built runs the test
copies `core/kernel`, `core/foundation` and the fixtures into an empty folder
and compiles only those. Nothing under `core/shared`, `core/server` or
`core/bootstrap` is present, and it runs.

Where the split is still not clean, found by doing this:

- **The framework depends on five npm packages an application gets whether it
  wants them or not**: `nconf`, `jsonc-parser`, `zod`, `lodash`,
  `@tryghost/logging` (for the class), and `knex` if it configures a database.
  All are Ghost's dependencies today.
- **`@tryghost/errors` is in the kernel** (`defineService`, the domain layer,
  `parseConfigSlice`). It is stateless, so it meets the rule.
- **The config loader's file names are Ghost's conventions**
  (`defaults.json`, `overrides.json`, `env/config.<env>.json`,
  `config.local.json`). They are parameters only as far as two folders. A
  second application has to like the layout.
- Under shape (a) the second application would have had to copy
  `application.ts` (141 lines: the order, build-once, what a domain is handed,
  wiring the domain layer to the bus and the scheduler) and `domains.ts` (30
  lines). That is the framework code shape (b) exists to hold.

## Part 2, step 6: boot order

### What moved

`boot.js` step 0 is now `application.startFoundation()`: config, logging, the
database handle and the event bus are built, in that order, before the
maintenance server, before the database is migrated and before any service.
Before, the database handle was built when `DatabaseStateManager` first
required the connection (step 3 of boot), and the event bus when a service
first required the package.

Building the handle opens no connection, so nothing that needs the database
to be reachable moved.

### Boot time (verified)

`NODE_ENV=testing-mysql`, from source, MySQL 8.4, one machine.

| State                                      | Runs | "Ghost booted in" | "Ghost server started in" |
| ------------------------------------------ | ---- | ----------------- | ------------------------- |
| Before part 2 (`e8f4258`)                  | 6    | 3.290s to 3.532s  | 1.095s to 1.290s          |
| Foundation built first (step 3)            | 6    | 3.260s to 3.660s  | 1.070s to 1.468s          |
| Network started through `boot.ts` (step 4) | 8    | 3.320s to 3.729s  | 1.158s to 1.356s          |

Three runs taken straight after the DB-backed suite read 3.556s to 4.094s and
are left out as a busy machine; they are recorded here so the choice is
visible. The ranges overlap. This shows no cost that this many runs can
resolve; it does not show there is none. A difference under about 0.2s would
not be seen.

### What stops shared and domains being strictly second and third

Today's order, read from `boot.js`:

1. **Foundation** (step 0). Strictly first now.
2. The maintenance HTTP server starts; the database is migrated.
3. `initCore`: adapters, **limits, settings**, signing keys, internal keys,
   **i18n**, Better Auth, then seven feature services (gift links, member
   metafields, app installations, export requests, invites, integrations,
   Stripe checkout config).
4. Front-end services, Express apps, routing, the jobs service.
5. `initServices`: about 35 services, including **permissions**, Mentions and
   Staff. The **domain layer starts last**.

**Shared is not a phase.** The shared services (settings, limits, i18n,
permissions; labs and mail have no start) are spread over steps 3 and 5 and
interleaved with feature services. Making shared strictly second means
hoisting `permissions.init()` out of the `Promise.all` in `initServices` and
moving the seven feature services out of `initCore`. Neither was attempted.
Whether anything in `initCore` depends on its feature services was not
checked.

**For domains, exactly one thing was found, by experiment (verified):**

| Experiment                                           | Result                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `domains.start()` moved to straight after `initCore` | Boot fails: `Mentions used before init()`, from `addUrlMapper` in network's root                              |
| The same, with that one registration removed         | **Ghost boots** (3.642s). Settings, models, mail, Sentry, url-utils and outbound HTTP were all usable by then |

So network needs nothing from step 5 except to register a URL mapper on
Mentions while it starts. Every other use of Mentions and Staff is already a
call at the moment of use. Both edits were reverted; the domain layer still
starts where part 1 put it.

The fix is to turn the registration round: network exposes the mapping as a
public action (it is a pure function of a URL), and the Mentions root adds it
to its own metadata service. Code outside the domains may import a domain's
`actions/`. Then no domain needs anything from `initServices` to start, and
`domains.start()` can follow the shared services. Not done: it moves about a
dozen assertions in network's root test to an action test and changes the
Mentions root, and the experiment already answers the question.

The general rule this suggests: **a domain may not register itself on another
service while it starts.** Registration is start order by another name. The
owner of the registry imports what it needs from the domain's public surface.

## Part 2, step 8: testing

Three levels, each shown on network:

| What is under test              | How it gets a logger, config and the database                                                                                                                                                                 | File                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A reshaped service root, alone  | It is handed a `NetworkDependencies` literal. Logger: `createLoggerFake()`. Config: **nothing to fake**, the root receives `refreshesEnabled: true`. Database: three stand-in model classes; nothing connects | `domains/network/test/unit/services/recommendations/root-with-fakes.test.ts` (3 tests) |
| The domain's `boot.ts`          | `createFoundationFake({ config: { ... } })`: a fake config holding the tree given, whose `slice` parses as the real one does                                                                                  | `domains/network/test/unit/boot.test.ts` (3 tests)                                     |
| The root and `boot.ts` together | Ghost's real application foundation, with the test's existing stubs on legacy modules                                                                                                                         | `domains/network/test/unit/services/recommendations/index.test.ts` (existing)          |

The first needs no stub of any module and loads nothing of Ghost outside the
domain. That is the test the rule was meant to make possible, and it is 101
lines including a complete fake of the outside world.

**Do the fakes belong in a `testing` subpath of the framework? Yes**, on this
evidence: they are written against kernel types only, they are the same for
any application, and three test files in two places already want them.
`ghost/core/kernel/testing/index.ts` (111 lines) has `createLoggerFake`,
`createConfigFake`, `createEventBusFake` and `createFoundationFake`.

Three things to settle before it is more than a spike:

- **It ships.** `core/` is in the package's `files`, so `kernel/testing/` is
  in the production tarball. It imports no test library, so it costs 111
  lines, but a real `testing` export should be excluded from the build or
  live in a package.
- **There are now two logger fakes.** `test/utils/logging-utils`'
  `createLoggingFake()` is a sinon stub of the `GhostLogger` class and is what
  the Service Standard tells class tests to use. The kernel one has no sinon,
  because kernel code cannot import a test library. Pick one. The sinon one
  cannot live in the framework.
- **No database fake was written**, because nothing reshaped takes a Knex
  handle yet. `createFoundationFake({ database })` takes whatever the test
  supplies. For a Knex-backed repository the honest options are an in-memory
  SQLite handle (going away with SQLite in 7.0) or a DB-backed test; a fake
  query builder would test nothing.

## Part 2, step 7: enforcement

### The checks added

| Check                                                                                                                     | Where                                                                                 | Fails lint? | Tests |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- | ----- |
| **Kernel purity**: no module-level state, no ambient reads, no exported instances, nothing done on import                 | `ghost/kernel-purity`, an oxlint rule on `ghost/core/kernel/**/*.ts` (255 lines)      | yes         | 5     |
| **Anything in kernel is importable from anywhere**                                                                        | `serviceDependencyAllowlist` and `domain-fragment-imports` now allow all of `kernel/` | n/a         | 13    |
| **Foundation is imported only by an application's bootstrap** (`foundation-only-from-bootstrap`)                          | `.dependency-cruiser.cjs`                                                             | yes         | 1     |
| **Foundation never imports the application** (`foundation-not-application`)                                               | same                                                                                  | yes         | 1     |
| **Foundation instances are injected, not imported, by reshaped code** (`domain-foundation-injected`)                      | same                                                                                  | yes         | 2     |
| **A service root imports its own domain and the kernel**: roots are no longer exempt from `domain-implementation-imports` | same                                                                                  | yes         | 2     |
| **Capability subfolders one level deep and no deeper** (two levels inside a service folder)                               | `tools/scripts/lib/domain-shape.ts`                                                   | yes         | 3     |

What `ghost/kernel-purity` reports:

- **State**: `let` or `var` at module scope; a module-scope `const` whose value
  is `new X()`, an array or object without `as const` or `Object.freeze`, a
  regular expression with the `g` or `y` flag, or the result of a call; a
  `static` class field holding any of those.
- **Instances**: `export default new X()`, `export const x = new X()` or a
  call, and `export const x = imported` (re-exporting a value lint cannot see
  into).
- **Effects**: any statement at module scope that is only an expression.
- **Ambient reads, anywhere in the file**: a value import or `require` of
  `fs`, `fs/promises`, `child_process`, `os`, `module`, `worker_threads`,
  `cluster`, `net`, `http`, `https`, `dns`, `nconf`, `moment`, `moment-timezone`, `@tryghost/logging`,
  `@tryghost/metrics`, `@tryghost/domain-events`, `@tryghost/debug`,
  `@tryghost/root-utils` or `@tryghost/version`; a computed `require()`;
  `process.env`, `.argv`, `.cwd`, `.platform`, `.pid`, `.execPath`;
  `Date.now()`, `new Date()` with no argument, `Math.random()`,
  `performance.now()`. Type-only imports are allowed.
- Allowed at module scope: functions, classes, literals, `as const`,
  `Object.freeze(...)`, `Symbol(...)`, and anything built from `z` (a Zod
  schema describes and is immutable).

### What fails on the real tree today (verified by running the rule before any suppression)

| File                               | Line | Finding                                                                         | What was done                                                                                                                         |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `kernel/clock.ts`                  | 1    | imports `moment-timezone`: a library object with process-wide state             | Suppressed inline with the reason. Not fixed: 10 service files import it and the Service Standard says they may                       |
| `kernel/clock.ts`                  | 4    | `export const moment = momentTimezone`: exports a value, not a mechanism        | Suppressed inline. `getUnixTime()` itself reads the clock; the rule sees that only through the import                                 |
| `kernel/adapter-manager/loader.ts` | 1    | imports `node:fs`                                                               | Suppressed inline. Not fixed: see below                                                                                               |
| `kernel/adapter-manager/loader.ts` | 3    | imports `node:module` (`createRequire`)                                         | Suppressed inline                                                                                                                     |
| `kernel/domains/definitions.ts`    | 75   | `new Date()` as the default timestamp of an event                               | **Fixed**: a timestamp is now required. Three fixture call sites and one test changed. Publishing an event means being handed a clock |
| `kernel/domains/discover.ts`       | n/a  | read the filesystem and used the ambient `require` (found by reading in step 1) | **Fixed in step 3**: the reader and loader are arguments. It passes the rule                                                          |

Passing without change: `define-service.ts`, `domains/domain-layer.ts`,
`adapter-manager/adapter-manager.ts`, `options.ts`, `types.ts`, and the new
`config.ts`, `logging.ts`, `database.ts`, `events.ts`, `foundation.ts` and
`testing/index.ts`.

The four suppressions are `oxlint-disable-next-line` comments naming the
reason, so lint stays green and a fifth break is caught. They are deviations
from the rule and are listed in the final report.

**The adapter manager belongs in foundation**, on the same reasoning as the
logger: it is a class instantiated once per process, and it reads the disk.
It was not moved because its one instance is built in
`server/services/adapter-manager/index.ts`, which is not bootstrap, and
`foundation-only-from-bootstrap` would then need that file to move too.

**The clock** needs the treatment config got: a `Clock` type in kernel, a
system clock built by the foundation and handed over, and the `moment`
re-export moved out of kernel to wherever the remaining Moment code lives.

### Each check fails when it should (verified on the real tree)

Each violation was introduced, the check was run, and the file was restored.

| Violation introduced                                                                                                                          | Check that failed                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Network's `boot.ts` requires `@tryghost/logging`, `@tryghost/domain-events`, `@tryghost/metrics`, `shared/config`, `data/db`, `bootstrap/app` | `lint:boundaries`: `domain-foundation-injected`, once for each of the six                                                   |
| Network's service root requires `@tryghost/logging`, `shared/sentry` and publishing's action                                                  | `lint:boundaries`: `domain-implementation-imports`, once for each; `lint:oxlint`: `service-root-shape` for the extra export |
| A file in `core/server/lib` imports `foundation/logging`                                                                                      | `lint:boundaries`: `foundation-only-from-bootstrap`                                                                         |
| A kernel file with `let cached` and `process.env.NODE_ENV`                                                                                    | `lint:oxlint`: `ghost(kernel-purity)`, twice                                                                                |
| `domains/network/jobs/a/b/x.job.ts`                                                                                                           | `lint:domain-rules`: `domain-root-shape`, "one level deep and no deeper"                                                    |

**The first run of the first row caught only two of six.** The rule matched
`shared/config` and `data/db` and missed all three packages. A package that is
installed resolves to a path under `node_modules`, and the pattern
`^@tryghost/logging$` matches only an import that could **not** be resolved,
which is what the rule's test, in a temporary repository with no
`node_modules`, had been checking. The patterns now match both forms, as the
older rules in the same file already did. A boundary rule about a package is
not tested until it has been run against the real tree.

### What had to be decided to write the rules

- **The kernel is on the service allowlist as a whole.** It was one file
  (`clock.ts`). Two existing tests pinned "a kernel file other than the clock
  is not allowed" and were changed to pin the new rule.
- **Service roots lose their exemption.** In part 1 a root and `boot.ts` were
  both "wiring" and could import anything, counted. Now only `boot.ts` is.
  Network's root and the fixture roots pass.
- **`shared/config/` may import the foundation.** It is Ghost's config
  composition (the schema, the policy, the loader call). It is bootstrap code
  that lives beside the values, as Laravel's `config/` sits beside
  `bootstrap/`.
- **Tests may import the foundation.** Tests are outside the scan anyway.
- **What counts as "shared"** is still a list in the boundary config
  (`domainShared`, ten entries), now without config, the database and the
  domain layer, which are foundation.

### Limits

- **One rule still restricts importing a kernel file.**
  `service-roots-in-services` forbids importing `kernel/define-service` outside
  a service root, because that is how "a root lives in `services/`" was
  written. It is about calling `defineService`, not importing it. A test
  records it as the one exception. To make the kernel rule hold without
  exception, replace it with a lint on the call.
- **Purity is checked per file, from syntax.** The rule cannot see state
  reached through a function in another file, a getter, or a closure created
  by an allowed call (`z.lazy(() => ...)` capturing a `let` elsewhere). It
  cannot tell that `momentTimezone()` reads the clock, only that the file
  imports Moment.
- **The ambient-module list is a list.** A new package that holds a singleton
  passes until it is added. The list is 20 names.
- **Type-only imports are still invisible to the boundary scan** (part 1), so
  `import type` from the foundation or from bootstrap passes. For these rules
  that is the intended behaviour: types are what reshaped code should import.
- **`kernel/testing/` is held to kernel purity** and passes, which is why its
  fakes use no test library.

### Verified at the end of step 7

- Typecheck, oxlint, ESLint, boundaries (5940 modules, 286 known, 189
  deferred), domain rules, knip, format, docs lint: pass.
- Unit suite: 11,678 passed; the same 34 baseline failures and no others.
- DB-backed set: 8 files, 76 tests pass.
- `tools/scripts` tests: 463 tests, the same 20 baseline failures and no
  others (441 pass), run through `pnpm`. `tools/gx` tests: 155 pass.

## Part 2, step 9: naming

Two words were given: kernel and foundation. The code ended with three
things, and the evidence is about which word fits which.

| What the code has                                                   | Its rule                                             | Word used      | Does it fit?                                                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| Types, `define*` helpers, pure functions, the domain runner         | Import and use anywhere. Stateless. Enforced by lint | **kernel**     | Yes. It is the part everything else rests on and nothing in it needs anything. No evidence for a change     |
| Factories for what exists once per process, and `createApplication` | Stateless as modules; only bootstrap imports them    | **foundation** | **Partly.** See below                                                                                       |
| The instances: config, logger, database handle, event bus           | Built first, injected, never imported                | **foundation** | Yes, and this is the meaning the brief started with ("framework instances any application needs")           |
| Ghost's values and the module that holds the application            | Imported by `boot.js` and by legacy aliases only     | **bootstrap**  | Yes: it is Laravel's `bootstrap/`, and the word was not in the brief because the thing was not yet separate |

**"Foundation" is doing two jobs.** In this code it names both the folder of
factories (`ghost/core/foundation/`) and the set of instances
(`application.foundation`, the `Foundation` type, "the foundation is handed to
`boot.ts`"). They are different things with different rules: the folder may be
imported only by bootstrap; the instances may be imported by no one. Sentences
in this log needed care to say which was meant, which is the evidence that
one of them wants another word.

The instances have the stronger claim. "Foundation, shared, domains" as three
layers of **running things** started in order is how the brief uses the word,
how `boot.js` now reads, and what a domain author sees. So if one of the two
is renamed, it is the folder.

What the folder holds is the framework's code for assembling an application:
`createApplication`, `createLogger`, `createConfig`, `createDatabase`,
`readDomains`. In Laravel this is `Illuminate\Foundation` (the `Application`
class and its bootstrappers), which is where the word came from, so the name
is defensible. But Laravel has the same double meaning and resolves it by
never calling the instances "foundation". Ghost wants to call the instances
that.

**Suggested, on this evidence, and no stronger than that:**

- Keep **kernel**.
- Keep **foundation** for the layer of instances and the `Foundation` type.
- Rename the folder `ghost/core/foundation/` to something that says "builds
  the application". `ghost/core/application/` fits what is in it
  (`createApplication` and the factories it orders) and reads correctly in the
  rule: "only bootstrap imports application code". Not done in the spike: it
  is a rename of 13 files and two boundary rules, and it should be the
  owner's decision.
- Rename `boot.ts` in a domain to `dependencies.ts` (step 4).

The alternative that the evidence does **not** support: merging the folder
into kernel so that there are only two words. That is shape (a), and it puts
factories that are harmful to call twice behind the rule "import from kernel
without thinking".

## Part 2: final report

Five commits on `claude/ghost-modular-architecture-bqbbrw` after `e8f4258`.

### The answer

**The rule is achievable, with one exception still in the lint config and
two known breaks in existing kernel files.**

> Anything in kernel can be imported directly, by any code, without thinking
> about whether the import is allowed. Things that are importable hold no
> state.

- A lint rule now holds kernel to "no state, no ambient reads, no instances,
  nothing on import", and the boundary rules let every kind of file import
  any kernel file. Thirteen locations are tested.
- **Foundation is two things**: framework code that builds what exists once
  per process (a folder only bootstrap imports), and the instances it builds
  (injected, never imported). Ghost supplies values and a bootstrap.
- For config, logging and the database, **the kernel half is types** and one
  pure function. The factories are stateless as modules but must be called
  once, so they are not in kernel.
- Old and new share **one** config, logger, database handle and event bus,
  verified by identity in a real process.
- A second application runs on the framework alone, with no Ghost code.

### Inventory

The full table is in [step 1](#part-2-step-1-inventory). In short:

| Thing                         | Importers (roots) | Stateless part split from the instance?                            |
| ----------------------------- | ----------------- | ------------------------------------------------------------------ |
| Logging                       | 352 (27)          | **Done here**, on Ghost's side; the package needs two exports      |
| Config                        | 149 (24)          | **Done here**                                                      |
| Database (Knex)               | 32 (9)            | **Done here**                                                      |
| Event bus                     | 29 (10)           | Adapter here; the package needs an instance export                 |
| Adapter manager               | 31 (12)           | Was already split; its class should move from kernel to foundation |
| Clock and `moment`            | 10, plus 43 raw   | No. Known kernel break                                             |
| URL utils                     | 131 (23)          | Possible (the package exports the class). Shared, not foundation   |
| Models registry and Bookshelf | 117 (29)          | **No**: about 100 model files close over one instance at import    |
| Settings cache                | 87 (22)           | Possible; it is state by definition. Shared                        |
| Labs, i18n, limits, mail      | 40, 15, 8, 19     | Possible. Shared                                                   |
| Jobs service                  | 34 (5)            | Possible; kept as one instance on purpose                          |
| Sentry                        | 27 (5)            | Partly; the SDK is process-global                                  |
| Outbound HTTP                 | 12 (7)            | Possible: a factory taking four config values                      |
| Metrics, tracing              | 13; few           | Metrics needs the package change; tracing is already factories     |

### The design and why the others lost

Chosen: **(b)**, foundation is framework code beside kernel that assembles
the instances from an application's values, with the sharpening that the
factories are a separate folder from kernel because they are safe to import
and unsafe to call twice.

- **(a) lost** because it puts those factories in kernel, and because a
  second application would have copied 171 lines of assembly (`application.ts`
  and `domains.ts`).
- **(c) lost** because a folder of Ghost-specific wiring cannot be used by
  another application. That wiring is real; it is `bootstrap/`.

### What each step cost

| Step                                                                                      | Commit    | Files | Added                    | Removed | Of which this log | Notes                                                                                          |
| ----------------------------------------------------------------------------------------- | --------- | ----- | ------------------------ | ------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| 1 and 2: inventory and design                                                             | `0fd1161` | 1     | 201                      | 0       | 201               | this log only                                                                                  |
| 3, 5 and the first half of 6: the split, the second application, foundation first in boot | `4592269` | 82    | 2,635                    | 1,012   | 176               | about 620 lines are tests; 849 lines of config machinery moved rather than written; 11 renames |
| 4, the rest of 6, and 8: network's `boot.ts`, fakes                                       | `bbcf477` | 9     | 840                      | 182     | 275               | `boot.ts` 143, kernel fakes 111, two new tests about 150                                       |
| 7 and 9: enforcement, naming, this report                                                 | this one  | 19    | about 740, plus this log | 58      | the rest          | the lint rule 255; about 370 lines of tests                                                    |

Before this last commit: 89 files changed, 3,676 lines added and 1,194
removed since `e8f4258`, of which 652 added lines are this log.

**What the next domain pays**, from one real domain: a `boot.ts` of about 140
lines for a root with eleven outside dependencies, about 60 lines out of the
root, and a mechanical change to the root's test of under 30 lines. Nothing in
`ghost/core` changes for it.

### Test and check results at the end (all verified by running)

| Check                                        | Result                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Typecheck (`nx run ghost:test:types`)        | pass                                                                                                 |
| oxlint, ESLint, knip, format, docs lint      | pass                                                                                                 |
| Boundaries                                   | pass: 5940 modules, 286 known violations, 189 deferred (both unchanged)                              |
| Domain rules                                 | pass                                                                                                 |
| Unit suite                                   | 11,678 passed; 34 failed, the same 34 in the same 3 files as baseline                                |
| DB-backed, the part 1 set, against MySQL 8.4 | 8 files, 76 tests pass                                                                               |
| `tools/scripts` tests                        | 463 tests; 441 pass, 20 fail, the same 20 as baseline; 2 cancelled by a failed parent among those 20 |
| `tools/gx` tests                             | 155 pass                                                                                             |
| Existing config tests, unchanged             | 9 files, 173 tests pass                                                                              |

### Boot time

| State                             | Runs | "Ghost booted in" |
| --------------------------------- | ---- | ----------------- |
| Before (`e8f4258`)                | 6    | 3.290s to 3.532s  |
| Foundation built first            | 6    | 3.260s to 3.660s  |
| Network started through `boot.ts` | 8    | 3.320s to 3.729s  |

No change these runs can resolve. One machine, warm, from source. A
difference under about 0.2s would not be seen. Boot time after step 7 was not
re-measured: step 7 changed lint rules, three fixture files and one default
argument.

### What cannot be made importable and stateless

| Thing                                                  | Why                                                                                                                  | What it is instead                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The models registry and Bookshelf                      | About 100 model files are defined against one Bookshelf instance while they are imported                             | Legacy, imported by `boot.ts` and handed over, until Bookshelf is gone         |
| The logger, the database handle, config, the event bus | They are state. That is the point                                                                                    | Foundation instances: built once, injected                                     |
| Their factories                                        | Stateless and importable, but a second call is a defect (two writers on one rotating log file; two connection pools) | Foundation code: only bootstrap imports it                                     |
| The config loader                                      | It reads argv, the environment and files                                                                             | Foundation code. The kernel plan's "one named exception" is not needed         |
| Reading the domains folder                             | It reads the disk and calls `require`                                                                                | Foundation code; the kernel has the pure half                                  |
| The event bus as published                             | A static emitter in a package                                                                                        | Adapted by bootstrap until the package exports an instance                     |
| Sentry                                                 | The SDK initializes one process-wide client                                                                          | Shared; imported by `boot.ts`                                                  |
| `@tryghost/debug`                                      | Reads `DEBUG` when a namespace is created at module scope. 128 files                                                 | Left ambient on purpose; forbidden in kernel by the lint                       |
| `moment`                                               | A library object with a process-wide default timezone, set by `server/overrides.js`                                  | A known break in `kernel/clock.ts` until the clock is injected                 |
| Reading the clock                                      | It is an ambient read by definition                                                                                  | Should be a foundation instance. Today `getUnixTime()` is a known kernel break |
| The adapter manager's loader                           | Reads `package.json` files and resolves modules from disk                                                            | A known break in kernel; belongs in foundation                                 |
| Settings cache, labs, i18n, limits, mail, URL utils    | Each could be split, but each is Ghost's: another application has no settings table or site URL shape                | Shared, imported by `boot.ts`. Not foundation                                  |

### Rules that were ambiguous, wrong or missing

| Rule as given                                                                                  | What exposed it                                                     | Problem                                                                                                                        | Suggested wording                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Exports are mechanisms (classes, factories, pure functions, types, schemas), never instances" | `createLogger`, `createDatabase`                                    | A factory for something that must exist once is a mechanism, and is still unsafe for any code to call                          | "Kernel holds what any code may import **and call**. A factory for something that exists once per process is not kernel: it lives in the foundation, which only an application's bootstrap imports."       |
| "No ambient reads … with a config loader the one named exception"                              | `foundation/config/sources.ts`                                      | With a foundation folder the exception is unnecessary, and without one there are more than one (discovery, the adapter loader) | Drop the exception. "Code that reads the process, the disk or the clock is foundation, not kernel."                                                                                                        |
| "Foundation" (a layer in boot order, and the home of the stateful framework)                   | Every sentence in this log about it                                 | One word for the instances and for the code that builds them                                                                   | "The **foundation** is the instances every application has: config, logging, the database, the event bus. The framework code that builds them is the **application** folder (or another name)."            |
| "A `boot.ts` in the domain declares what the roots need from outside"                          | `domains/network/boot.ts`                                           | Does not say which of those are handed to `boot.ts` and which it imports                                                       | "The domain layer hands `boot.ts` the foundation. `boot.ts` imports everything else the domain needs, inside `dependencies()`, and returns what the roots receive. Nothing else in the domain imports it." |
| "Service roots import nothing but their own domain and kernel"                                 | `notices`, which had no `boot.ts`                                   | Silent on a domain with no `boot.ts`, and it makes `boot.ts` required for almost every domain, where part 1 found it optional  | "A domain without `boot.ts` hands its roots the foundation unchanged. A domain that needs anything else has one."                                                                                          |
| "The domain gets config" (whole instance or a slice: left open)                                | `services:recommendations:enabled`                                  | A slice is read once; the code it replaces treated any value but `false` as on                                                 | "A domain declares the config section it reads and its schema in `boot.ts`. It is parsed when the domain starts. Its schema accepts what the code it replaces accepted; tightening is a separate change."  |
| "No facades, global helpers or service locators"                                               | Whether to hand domains a bag of shared services                    | Does not say whether an injected bag counts                                                                                    | "Only the foundation is injected by the framework. A bag of application services handed to every domain is a service locator: `boot.ts` imports each one it uses."                                         |
| Boot starts foundation, then shared, then domains                                              | The two experiments in step 6                                       | Silent on a domain that registers itself on another service at start, which is start order by another name                     | "A domain does not register itself on another service while it starts. The owner of the registry imports what it needs from the domain's public surface."                                                  |
| Capability subfolders "ONE level deep inside a layer folder"                                   | `services/`                                                         | `services/<name>/` is already a folder per root                                                                                | "A layer folder holds capability subfolders one level deep. In `services/` the service's own folder is that level's parent: `services/<name>/<capability>/`. Roots stay at `services/<name>/index.ts`."    |
| A found file's name is its file name without the role                                          | `jobs/gifts/send.job.ts` and `jobs/offers/send.job.ts`              | Two capabilities may each have a `send`                                                                                        | "A file in a capability subfolder is named `<capability>/<name>`."                                                                                                                                         |
| "A root may be imported so it can be passed on" (the Service Standard's "inject")              | 325 of 352 logging importers are not roots                          | The rule is met by new code only, and nothing counts the rest                                                                  | Add a count to the report: files outside `bootstrap/` and service roots that import a foundation instance, so the number is seen to fall.                                                                  |
| Services "may import [the clock] directly" (kernel README)                                     | `ghost/kernel-purity` on `clock.ts`                                 | Contradicts "no clock in exported functions"                                                                                   | Decide: either the clock is the named exception, or it is injected. The lint treats it as a break.                                                                                                         |
| `service-roots-in-services` (existing boundary rule)                                           | The "kernel is importable from anywhere" test                       | An import rule doing the job of a "where may this be called" rule                                                              | Replace with a lint on calls to `defineService` outside a root file.                                                                                                                                       |
| `defineEvent` gives an event the time it was made                                              | `ghost/kernel-purity`                                               | A default of `new Date()` is a clock read in kernel                                                                            | "An event is given the time it happened by whoever publishes it."                                                                                                                                          |
| Nothing about testing a rule on packages                                                       | `domain-foundation-injected` missed three packages on the real tree | A temporary repository has no `node_modules`, so a package pattern is tested only in its unresolved form                       | "A boundary rule that names a package is proven by introducing the import in the real tree."                                                                                                               |

### Changes needed outside this repository

None were made: TryGhost/framework is not attached to this session. Ghost's
side is proven against the published packages through two seams in
`ghost/core/bootstrap/`.

| Package                                | Change                                                                                                                                                                                                                                                                                                                   | What it replaces here                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tryghost/logging`                    | 1. A subpath that builds nothing on import: `@tryghost/logging/logger` exporting `GhostLogger` and `createLogger(options)`. 2. `setInstance(logger)`, documented as "call before anything requires the package", throwing if a different instance already exists. 3. Later: the entry point resolves its instance lazily | 1. `require('@tryghost/logging/lib/GhostLogger')`, a path inside the package. 2. Writing to `globalThis[Symbol.for('@tryghost/logging@6')]`. 3. The "adopt the logger legacy code already built" path |
| `@tryghost/metrics`                    | The same two exports. It builds `new GhostMetrics(require('loggingrc'))` on import                                                                                                                                                                                                                                       | Nothing: it was left reading `loggingrc.js`, which now returns `loggingOptions(config)`                                                                                                               |
| `@tryghost/domain-events`              | `createEventBus({ logging })` returning an instance with `subscribe`, `dispatch` and `unsubscribe`; stop importing the logging singleton                                                                                                                                                                                 | `bootstrap/legacy-events.ts`, an adapter over the static emitter. `foundation/events.ts` is the shape, in 32 lines                                                                                    |
| `@tryghost/debug`, `@tryghost/version` | Nothing proposed. Both read the environment or disk at import; neither is in kernel                                                                                                                                                                                                                                      |                                                                                                                                                                                                       |

`loggingrc.js` has to stay for as long as any package reads it.

### Deviations from the rules given, in one place

1. **Four inline lint suppressions in kernel** (`clock.ts` twice,
   `adapter-manager/loader.ts` twice): known breaks, not fixed.
2. **`service-roots-in-services` still restricts one kernel import.**
3. **The logger seam uses two things the package does not promise** (a file
   path inside it and the name of its cache key).
4. **`shared/config/` imports the foundation**, though it is not under
   `bootstrap/`.
5. **Foundation was moved to the start of boot; shared and domains were
   not.** What blocks each is in step 6.
6. **`boot.ts` and `ghost/core/foundation/` were not renamed**, though the
   evidence suggests both.
7. **The `@kernel/x` import spelling does not exist.** Kernel is imported by
   relative path, as in part 1, and each home of a service root still pins its
   own relative path in the lint config. An alias needs to work under tsx,
   vitest and the tsc build, which emits paths as written; Node's `imports`
   field in `package.json` is the candidate. Not attempted.
8. **Three existing tests were changed because the rule they pinned
   changed**: two that held "only the clock may be imported from kernel", and
   part 1's test of an event's default timestamp.
9. **Steps were committed together** where the code would not separate: 3
   with 5 and half of 6; 4 with the rest of 6 and 8; 7 with 9.

### Not verified, in one place

- **The full DB-backed suites.** Eight files were run, chosen in part 1 for
  relevance. Any e2e test that calls `config.set` after boot and expects a
  reshaped domain to see it would now fail; none of the eight does, and the
  others were not searched.
- **The 34 unit failures** in 3 Mailgun and mailer files are present on the
  untouched base in this container; their cause is still only partly known.
- **A production build.** `pnpm archive`, the Docker image and a boot from
  built JavaScript of Ghost itself were not run. The second application was
  run from built JavaScript; Ghost was run from source only. In particular
  `loggingrc.js` now requires `core/bootstrap/logging-options`, which exists
  as JavaScript only after `build:tsc`.
- **Worker threads.** A job in a worker thread still gets the package's own
  logger with the `parent` transport, by reading the code. Not run.
- **`@tryghost/metrics`** still builds itself from `loggingrc.js`; that it
  receives the same options as before was checked by reading, not by a test.
- **Log output.** That the logger the application builds writes the same
  lines to the same transports as the one the package built was checked for
  class, level and transports in one process, not by comparing files.
- **Boot time after step 7**, and timing in general: six to eight runs each on
  one shared machine.
- **Admin against this backend**, and the two recommendation jobs on their
  real timers, as in part 1.
- **The inventory counts** are from `grep` on import specifiers and are
  approximate. Tracing and Prometheus importers were not counted.
- **Whether anything in `initCore` depends on the seven feature services in
  it**, which decides how hard "shared strictly second" is.
- **`gx services verify`**, which still needs the branch rebased.
- MySQL was 8.4 from a registry mirror, not the pinned image.
