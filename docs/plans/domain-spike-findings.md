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
