# Framework spike 2

A spike on `claude/framework-spike-2`, cut from `main` at `613506b5c5`. It asks one question of
everything Ghost does when it starts:

> Would this still exist once Ghost is stateless, runs as several processes for a site, and
> serves several sites in a process?

If yes, it is **framework**. If no, it is **earmarked**: it lives in a `transition/` folder, runs
only because a list names it, and says what removes it.

Every claim below is marked **verified** (it was run) or **inferred** (it was read).

## Vocabulary

| Word          | What it is                                                                                                                                         | Where                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Kernel        | Types, `define…` functions and pure functions. Holds nothing                                                                                       | `tbd/kernel`, imported as `#kernel/…`    |
| Foundry       | Builds an application from what it is told: a foundation, service definitions and a list of steps. Stops what it started. Names nothing of Ghost's | `tbd/foundry`, imported as `#foundry/…`  |
| Foundation    | Config, logger, database handle, event bus, clock. Handed in, never imported                                                                       | Type in the kernel, built by the foundry |
| Bootstrap     | What Ghost tells the foundry: its application, values, lists, and `transition/`                                                                    | `ghost/bootstrap`                        |
| Shared module | A module several services use, described with the same `defineService`                                                                             | `ghost/shared/<name>`                    |

## Stages and commits

| Commit                      | Subject                                                                              | Files, lines     | A pull request on `main` by itself?                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `b46f810aad`                | Changed tiers to load their cache on first use                                       | 10, +246 −58     | Yes, with `9d824e403e`. First                                                                                  |
| `9d824e403e`                | Fixed test tiers that could not be loaded once tiers load on first use               | 4, +18           | Belongs in the tiers pull request                                                                              |
| `3ff5c6d55b`                | Changed Better Auth and signing keys to build synchronously and start explicitly     | 16, +162 −68     | Yes, with `1a858eca7e`. Independent of tiers                                                                   |
| `1a858eca7e`                | Removed the tooling tests for the service root exception list                        | 1, +1 −28        | Belongs in the Better Auth pull request                                                                        |
| `47338d0955`                | Moved the kernel to a workspace package imported as #kernel                          | 99, +488 −291    | Yes. Mechanical. After the two above or before; no dependency                                                  |
| `27d18d5352`                | Changed defineService to describe a service that the application builds on first use | 156, +4382 −4083 | Only together with `0c1350135b` and the fix in `b45c964b26`; needs stages 1 and 2 and the kernel package first |
| `1b20b284df` … `32727e4e71` | Eight small boot refactors, cherry-picked                                            | 1–8 files each   | Yes, each one, in order; they do not need stage 3                                                              |
| `0c1350135b`                | Fixed server tests that assumed services were built once per process                 | 4, +29 −37       | Part of stage 3                                                                                                |
| `9c19337199`                | Changed boot.js into a list of entries that the foundry runs                         | 32, +1887 −1316  | After stage 3                                                                                                  |
| `22c93ea6ce`                | Changed the foundation, adapters and limits to be built by the application           | 118, +1400 −902  | No: it is five changes in one commit (see stage 4). Split before review                                        |
| `763e342de9`                | Added the list of tests changed by the service definition spike                      | 1                | Not for `main`                                                                                                 |
| `b45c964b26`                | Fixed the foundry failing to load in production                                      | 5                | Part of stage 3                                                                                                |
| `35fd58e98e`                | Fixed test helpers that loaded settings before services could be built               | 2                | Part of the limits change                                                                                      |

Two things about these commits that a reader should know:

- `27d18d5352` on its own has four failing e2e files (fixed by `0c1350135b`) and does not boot
  with plain Node in production (fixed by `b45c964b26`). **Verified.** "Every commit green" held
  for the static checks and the unit suite, not for those two.
- One intermediate commit was made with `--no-verify` while rebuilding unpushed commits and was
  redone with hooks straight away. It was never pushed. Every commit on the branch ran the hooks.

### Stage 1: tiers build synchronously

In place. `create` is synchronous. The repository keeps its cache and loads it on first use;
overlapping first uses share one load; a failed load is not kept; `reload()` replaces `init()`.

- **Transactions (verified on SQLite):** a first tier read inside a transaction, made without
  the transaction, blocked for more than 5 seconds; made with it, 6 ms. So a first use that is
  handed `transacting` loads through that transaction and that load is not kept.
- **Fixtures (verified):** three e2e tests failed because fixtures insert paid tiers with no
  currency or price, which the cache now reads. The fixture fix from #32126 was ported.
- **`updated_at`:** the cached tier's `updated_at` goes stale after an edit, as before. **Inferred.**
- **Performance finding from #32126:** the pull request has no numbers. Its closing comment says
  only that the performance impact was too severe. Its commit message shows it had to stop the
  front end's caching middleware reading the free tier on every page view. **Inferred:** removing
  the cache put a database read on hot paths, which is why this stage keeps the cache.

### Stage 2: Better Auth leaves `defineService`

In place. Better Auth is a plain object, `{ start(), instance }`, not a service root: `start()` is
idempotent, builds synchronously, waits for Better Auth's own context and can be retried after a
failure. Readers use `.instance`. Signing keys is a root with a synchronous `create` and a
`start` that advances a due rotation. No root has an asynchronous `create` any more.

### Stage 3: `defineService`, changed in place

In place. One form. Final API (`tbd/kernel/src/define-service.ts`):

```ts
defineService(name, {
  needs?: { [name]: definition },          // built first and handed to create
  create: ({ foundation, ...needs }) => service,   // synchronous; a promise is refused
  listeners?: [{ event, handle: (service, ...payload) => unknown }],
  start?: (service, given) => unknown,     // work no request asks for
  stop?: (service) => unknown,
}, extras?)
```

A definition holds nothing. The application (`createServices` in the foundry) builds a service
on first use after `open()`, attaches declared listeners at `open()`, and on `close()` forgets
every instance and registration. It refuses: building while closed; a root with listeners or a
`start` that was never registered; a `create` that returns a promise; a cycle.

One root, before and after (`explore-ping/index.ts`):

```ts
// Before: built and pinged by boot calling init()
export default defineService('Explore ping', () => {
  const service = new ExplorePingService({ ..., statsService: require('../stats').default.service });
  if (config.isProductionOrDevelopment() && !isLocalhost(...)) { service.ping(); }
  return service;
});

// After: says what it needs, and that the ping is background work
export default defineService('Explore ping', {
  needs: { stats },
  create: ({ stats: statsService }) => new ExplorePingService({ ..., statsService }),
  start(service) { if (config.isProductionOrDevelopment() && !isLocalhost(...)) { service.ping(); } },
});
```

One caller, before and after: boot had `explorePingService.init()` inside a `Promise.all`. Now
`ghost/bootstrap/services.ts` names the root in `background`, and the worker entry of the start
list starts each one, isolated from the others.

- **Root files touched:** all 31 (the import line, because the `.service` getter moved to an
  earmarked alias in `ghost/bootstrap/transition/define-service.ts`). 11 changed beyond that: the
  ten that subscribed to events or started work in `create` or `init`, and signing keys. Three
  roots (segments, upgrades, export requests) dropped the alias altogether. **Verified.**
- **Endpoint answer:** yes, endpoints can be handed services without changing the definition's
  shape. `defineEndpoints(needs, (handed) => controller)` declares what a controller needs and
  `withServices` hands it over lazily when the endpoint registry loads it. Converted for three
  roots (segments, upgrades, exports). The remaining readers of `.service` under `api/endpoints`
  were not converted. **Verified** for the three by the e2e suite.
- **Behaviour changes (verified unless marked):**
  - A failure that used to fail boot now fails the first use of that service.
  - Services are built once per start, not once per process. A reboot in one process builds new
    ones (one test changed deliberately: `tinybird-consumers.isolated.test.ts`).
  - Background `start`s run after "ready" and each is isolated from the others.
  - The signing keys check runs on every boot.
  - `DomainEvents.subscribe` in `packages/domain-events` now returns an unsubscribe function.
- **Enforcement, each proven by a deliberate violation:** oxlint `ghost/service-root-shape`
  (asynchronous `create`, subscribing inside `create`); unit test `service-definitions.test.ts`;
  e2e test that builds every root in a booted Ghost and asserts none subscribes while being
  built; boundary rules `kernel-not-application`, `foundry-not-application`,
  `foundry-only-from-bootstrap`, `bootstrap-only-from-boot`, `service-alias-only-from-service-roots`.
  The `boot-awaits-service-init` rule, the standard-services boot test and two boot phase tests
  were removed.
- **Tests changed deliberately:** about 50 files. The list is in
  [framework-spike-2-tests.md](framework-spike-2-tests.md). **Inferred** (reported by the passes
  that made the changes; not re-checked line by line).

### Stage 4: a fresh boot

In place, to the points listed under "Not done".

- `ghost/core/boot.js` is gone. Ghost's start is the list in
  [`ghost/bootstrap/start.ts`](../../ghost/bootstrap/start.ts). The foundry runs it with
  `application.start(steps, state)` and knows no entry; `application.stop()` undoes what entries
  registered, last first.
- **Foundation.** `createFoundation` builds each part once, on first read. Ghost's logger and
  metrics are built from Ghost's values through the `/factory` entries of `@tryghost/logging` 6.1.0
  and `@tryghost/metrics` 3.8.0 and registered, so the package import returns the same instance.
  **Verified** by booting. Config, the database handle and the event bus are still built by their
  legacy modules, and the foundation takes those: the instances are the same, but the direction
  is the old one.
- **Roles.** `GHOST_ROLES` (default `web,worker`). Two entries carry `role: 'worker'`.
- **Limits** is a shared module, `ghost/shared/limits`, built on first use. All consumers read
  `limits.service` when they use it. Because loading settings reads limits, services can now be
  built from the database entry on, before settings load.
- **Adapter manager.** Class and loader are in the foundry. Ghost's registry, search paths and
  config normalisation are values in `ghost/bootstrap/values/adapters`. The instance is still
  built when its file is first loaded (earmarked), because legacy modules ask it for adapters
  while they are being imported.
- **Product knowledge removed from boot:** `rescheduleOnBoot` (now `postScheduling.rescheduleOnStart()`),
  the `!frontend` branch (now `routerManager.prepare()`, called by route settings), and
  `prometheus:enabled` (the Prometheus module decides, and loads its library only when enabled).
- **Settings pool.** Loading settings destroyed and recreated the database pool on every start, as
  a SQLite workaround. It now does so only on SQLite. **Verified** on MySQL by the suites. On
  SQLite, a fresh install and a second boot also worked with the workaround removed
  (**verified**, two paths only), so it can probably go there too; a migration on SQLite and the
  SQLite suites were not tried.
- **Enforcement added, each proven by a deliberate violation:** `kernel-pure` (the kernel imports
  only its own files and its date libraries; anything else as a type); the boundary scan now
  covers `ghost/index.js`, `ghost/bin` and `ghost/shared`; `shared-module-not-service-or-web`;
  a test in both framework packages that loads every module with plain Node.

## The start order

31 entries: 6 framework, 25 earmarked. **Verified** (printed from the list).

| #   | Entry                                            | Kind               | Leaves when                                                                                                                                                                                        |
| --- | ------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | unhandled rejections                             | earmarked          | the foundry owns what a process does with a failure nothing handled                                                                                                                                |
| 2   | error reporting                                  | earmarked          | error reporting is part of the foundation, built from values Ghost supplies; today Sentry sets itself up when its module is loaded                                                                 |
| 3   | metrics                                          | earmarked          | the metrics client is part of the foundation and decides for itself whether it is enabled                                                                                                          |
| 4   | HTTP server, in maintenance mode                 | earmarked          | listening is what the web role does when it starts serving, and a site that is not ready answers for itself; today one process listens early so that a migration can run behind a maintenance page |
| 5   | register the service roots that listen           | framework          | it stays; the list becomes whatever collects declarations, so that settings, flags and listeners are declared one way                                                                              |
| 6   | database: check the schema state, and migrate    | earmarked          | migrations run out of process again; what stays is the check that the schema is the one this code expects, which is a framework entry                                                              |
| 7   | services: allow building                         | framework          | it stays: services are built on first use from here until the application stops                                                                                                                    |
| 8   | adapters: validate what is configured            | earmarked          | the foundry validates adapter configuration when it builds the adapter manager from the values Ghost supplies                                                                                      |
| 9   | image upload config                              | earmarked          | image handling reads its config when it first handles an image                                                                                                                                     |
| 10  | url utils                                        | earmarked          | nothing; it only loads the module here so that its load time shows on its own                                                                                                                      |
| 11  | settings: load                                   | framework          | it stays, as the boot hook the settings module declares; what it loads becomes one site of several                                                                                                 |
| 12  | signing keys: advance a due rotation             | earmarked          | a rotation is advanced by a job and by whichever process first needs a key, with a lock, so that no process has to do it before it serves                                                          |
| 13  | i18n                                             | earmarked          | translations are loaded for a locale when it is first rendered                                                                                                                                     |
| 14  | Better Auth, under its engine                    | earmarked          | its readers can wait for it, so that it is built on first use; and the choice of engine is gone                                                                                                    |
| 15  | members metafields                               | earmarked          | it is a service root, built on first use                                                                                                                                                           |
| 16  | job runner: shut down with the application       | earmarked          | the job runner is started by the worker role, which then stops it                                                                                                                                  |
| 17  | metrics: instrument the database                 | earmarked          | the foundry instruments the database handle it builds; it is here only because the settings start used to replace the connection pool                                                              |
| 18  | route settings                                   | earmarked          | route settings are read by the dynamic routers entry, which is what needs them                                                                                                                     |
| 19  | custom redirects                                 | earmarked          | redirects are loaded by the first site request that needs them; they are loaded here because that request cannot wait today                                                                        |
| 20  | themes: load the active theme                    | earmarked          | the active theme is loaded by the first site request that renders it; it is loaded here because that request cannot wait today                                                                     |
| 21  | offers                                           | earmarked          | offers is a service root, built on first use                                                                                                                                                       |
| 22  | front end helpers                                | earmarked          | theme helpers are registered when the theme engine is first used                                                                                                                                   |
| 23  | Express apps                                     | earmarked          | the web role builds its apps when it starts serving                                                                                                                                                |
| 24  | dynamic routers: register                        | framework          | it stays, as the boot hook the routing module declares: without it every resource resolves to a 404                                                                                                |
| 25  | front end apps                                   | earmarked          | the internal apps are registered when the front end is first used                                                                                                                                  |
| 26  | job runner: build                                | earmarked          | the job runner is built on first use, like a service                                                                                                                                               |
| 27  | legacy services, job handlers and the job runner | earmarked          | each legacy service is a service root built on first use, job handlers are declared, and the worker role starts the runner; the inventory lists them one by one                                    |
| 28  | lift maintenance                                 | framework          | it stays: the point at which Ghost serves                                                                                                                                                          |
| 29  | announce that Ghost is ready                     | earmarked          | the foundry reports a finished start, with how long it took                                                                                                                                        |
| 30  | service roots with background work               | framework (worker) | it stays: the worker role starts the services that declare a start                                                                                                                                 |
| 31  | background work                                  | earmarked (worker) | each piece is a recurring job or a service start that declares itself; the inventory lists them one by one                                                                                         |

What is left inside the two largest earmarked entries (**inferred**, counted by reading):

- "legacy services, job handlers and the job runner": 16 to 18 `init`, `listen` or `start` calls.
- "background work": 12 to 14 items (nine recurring jobs, two recoveries, ActivityPub, inactive
  themes, remote flags).

### Themes, custom redirects and offers

Decision: all three stay as earmarked entries. None was deferred.

- All three fill in-memory state that the first front-end request reads synchronously (the
  active theme; two Express redirect routers). Deferring one means an asynchronous gate in the
  site middleware, and in several processes a change made in one must reach the others. That is
  the work that removes them; moving the call would not be.
- Cost at boot, one run from source (**verified**, one run, so read them as rough): custom
  redirects 3 ms, offers 8 ms, themes about 250 ms. Only themes would be worth deferring for
  time, and it is the one a first request can least do without.

## Timings

Production build (`tsc`, plain Node), MySQL 8.4, an existing database, `main` (`613506b5c5`) and
the branch (`b45c964b26`) booted alternately, 10 boots each. **Verified**, with a caveat: the
MySQL test suites were running in the same container, so the ranges are wide. Read the
comparison, not the absolute numbers.

| Measure                                               | `main`                     | Branch                     |
| ----------------------------------------------------- | -------------------------- | -------------------------- |
| "Ghost server started" (maintenance server listening) | 527–806 ms                 | 530–683 ms                 |
| "Ghost booted"                                        | 1332–2104 ms (median 1835) | 1338–1993 ms (median 1733) |
| `/` first answers 200, from process start             | 1568–2524 ms               | 1632–2400 ms               |
| First `/`                                             | 145–309 ms                 | 174–299 ms                 |
| First Admin API request (`/site/`)                    | 64–113 ms (median 77)      | 94–158 ms (median 132)     |
| First Content API request (posts)                     | 17–37 ms                   | 17–43 ms                   |
| First members API request                             | 5–10 ms                    | 4–10 ms                    |
| Second Admin API request                              | 1–4 ms                     | 2–7 ms                     |
| Second `/`                                            | 21–38 ms                   | 20–33 ms                   |

- **Boot time did not change measurably.** The ranges overlap almost entirely. The services that
  moved to first use were cheap to build; the expensive entries are still in the list.
- **Where time moved:** the first Admin API request is slower by roughly 30 to 60 ms. That is
  the one place the measurements show services being built on first use. Which services was not
  measured. The second request is as fast as before.
- **Where boot time goes on the branch** (one production boot, `DEBUG=ghost:boot:entry`,
  **verified** once): HTTP server in maintenance mode 455 ms (mostly loading modules), themes
  228 ms, legacy services 200 ms, Express apps 130 ms, database 105 ms, adapters 80 ms, front end
  helpers 75 ms, settings 45 ms, registering roots 35 ms. Everything else is under 25 ms each.

## Production paths

All on MySQL 8.4, `NODE_ENV=production`, JavaScript built by `tsc`, started with `node index.js`
and no loader, at `b45c964b26` (the later commit changes test helpers only).

| Path                                | Result                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh install                       | **Verified.** 503 from the maintenance server while the schema was created, then 200 from `/`, Admin API, Content API (with a key), members API, `/sitemap.xml`                                                                                                                                                                           |
| Existing database                   | **Verified.** Same requests, all 200                                                                                                                                                                                                                                                                                                      |
| Database needing a migration        | **Verified**, simulated by deleting the newest row of the `migrations` table: "Database state requires migration", 503 meanwhile, migration ran, boot finished; the next boot needed none                                                                                                                                                 |
| `backend`/`frontend`/`server` flags | **Verified**, and compared with `main`: the three combinations (`frontend: false`, `backend: false`, `server: false`) answer the same on both                                                                                                                                                                                             |
| Roles                               | **Verified.** `GHOST_ROLES=web` runs the list up to "announce that Ghost is ready" and starts no background work; the default runs both worker entries                                                                                                                                                                                    |
| Release archive                     | **Verified.** Admin built, `node scripts/pack.mts` run directly in `ghost/`, the `.tgz` extracted into an empty directory, `pnpm install --prod --frozen-lockfile`, booted fresh and again on the existing database; `/ghost/` answered 200. The archive contains `bootstrap/`, `shared/` and the kernel and foundry as packed components |
| Graceful shutdown                   | **Verified.** `SIGTERM` logs each cleanup task, ends with "Ghost has shut down", exit code 0                                                                                                                                                                                                                                              |
| Logger built by the application     | **Verified** from source: the start logs through a logger built from Ghost's values, and `require('@tryghost/logging')` is that instance                                                                                                                                                                                                  |
| A job in a worker thread            | **Not possible as asked.** Nothing on this `main` starts a worker thread; jobs run in the process. **Verified** instead with a synthetic worker: it builds the foundation's logger with the `parent` transport, and a line it logs arrives in the main thread                                                                             |
| SQLite                              | **Verified** from source only: fresh install and existing database boot and answer `/`, Admin API and members API                                                                                                                                                                                                                         |

The production boot found one real defect that the unit suite, the development loader and the
MySQL suites all missed: the foundry, an ES module, used a named import from a CommonJS package.
Node refuses that when it loads the file; the test runner and `tsx` accept it. Fixed in
`b45c964b26`, with a test in both framework packages that loads every module with plain Node.

## Checks

The final results of the checks are added in the next commit, once the last MySQL run has finished.

## Rule wordings that turned out wrong

1. "Closing forgets every instance." It must forget registrations too, or one unit test's roots
   leak into the next.
2. "Services can be built once settings are loaded." Loading settings uses limits, a service. The
   rule is now "once config and the database handle are ready"; a service that reads settings
   before they load reads nothing, and nothing checks that.
3. "The adapter manager is a kernel primitive." It caches instances and reads the file system.
   It is foundry code.
4. "The kernel may import `@tryghost/errors`." Once the adapter manager left, the kernel needed
   no package but its date libraries.
5. "Only boot imports the bootstrap." Also Ghost's commands in `ghost/bin`, and three earmarked
   exceptions: service roots (the alias), the endpoint registry, the adapter manager's legacy path.
6. "Importing a bootstrap file has no effect." `transition/adapter-manager.ts` builds on import.
7. "The foundation is built first." Each part is built on first read; the start reads config and
   the logger first. Building the database handle before the maintenance server listens would
   delay it.
8. "The schema state check is a boot hook, migration is earmarked." They are still one entry.
9. "A job runs in a worker thread." Nothing in Ghost starts a worker thread on this `main`;
   jobs run in the process.
10. "Tests may `import` a root." A test that imports a TypeScript root gets a second copy of the
    application that is never opened; tests must `require` it.

## Proposed wording for the skills (not applied)

Only links were repointed in the skills. Proposed changes:

- **`add-service`, section 4 "Initialize in boot".** Replace with "Tell the application": a root
  needs no line in the start. If it declares `listeners`, add it to `listening` in
  `ghost/bootstrap/services.ts`; if it declares a `start`, add it to `background`.
  `pnpm gx services verify` fails if it is missing. Drop the references to `init()`,
  `standard-services.test.ts` and `ghost/boot-awaits-service-init`.
- **`add-service`, section 3.** Add: `create` is synchronous and receives `{ foundation, ...needs }`;
  name other roots in `needs` rather than reading their `.service`; do not subscribe in `create`,
  declare `listeners`.
- **`migrate-service`.** Replace "boot-owned" with "built by the application on first use".
  Replace the step that moves the initializer into boot with: move subscriptions to `listeners`,
  background work to `start`, cleanup to `stop`, and delete `init()`. Note that a failure which
  failed boot now fails the first use, and that this needs a characterization test first.
- **`verify-service-change`.** Replace "confirm a boot test fails when boot stops waiting for the
  root's `init()`" with "confirm `service-definitions.test.ts` and `pnpm gx services verify` fail
  when the root is removed from its list".

## Not done, and what blocks it

- **Settings as a shared module: not started.** The settings cache is one object built when its
  module is imported; 83 files in `ghost/core` and 88 test files import it and read it
  synchronously. A `defineService` around it today would return those module-level objects, so
  nothing would be built per application. The first honest step is the one limits took:
  move the load (`populateDefaults`, the access limit, `findAll`, the cache fill) into a root in
  `ghost/shared/settings` with `needs: { limits }` and a `start`, and hand it the Bookshelf model,
  cache, emitter, cache adapter, calculated fields and tracer from a named root in `transition/`.
  The test helpers that call `settingsService.init()` directly are the cost (seen in this spike:
  moving limits broke 21 integration files through that one path).
- **One declaration point for settings and feature flags: not built.** Listeners are collected by
  registering roots. Settings defaults and flags are not declared by modules yet, so there was
  nothing to collect. Mentions adding a URL mapper for recommendations is the same missing piece.
- **Event bus in the foundry with `DomainEvents` as an alias: not done.** `@tryghost/domain-events`
  builds itself on import and legacy modules subscribe while they are imported, and its
  `allSettled()` tracking is used across the e2e suites. A package cannot import the foundry, so
  the alias needs the callers to take the bus from the foundation first.
- **Config and the database handle built by the bootstrap: not done.** Same shape of problem:
  both build on import.
- **Schema check split from migration: not done.**
- **The remaining `.service` readers in endpoints: not converted.**
- **`22c93ea6ce` is not split.** Its parts share `.dependency-cruiser.cjs`, the start list and the
  inventory file. For review it should become five: foundation, adapter manager, limits, the
  three product checks, the settings pool.

## Not verified

- No SQLite suites were run at any stage. SQLite was only booted (fresh and existing).
- The front end was only requested at `/` and `/sitemap.xml`; no theme other than `source`.
- `GHOST_ROLES=web` alone was covered by a unit test of the list, not by a boot.
- Sentry, Prometheus enabled, and a non-default scheduling adapter were not run.
- Timings were taken on one shared container, with other work running for some of them.
- The lists of changed tests in the appendix were not re-checked line by line.
