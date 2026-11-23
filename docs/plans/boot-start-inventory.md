# Boot start inventory

What Ghost starts at boot on `claude/framework-boot-spike`, what each thing
actually does when it starts, and how much of it has to happen before Ghost
serves. Companion to [the framework and boot spike](framework-boot-spike.md).

## How to read this

- **inferred** means read in the code and not run. **verified** means
  something was run that proves it. Every classification here is inferred
  unless marked verified. Only the experiment in
  [Experiment](#experiment-three-roots-made-lazy) was run.
- The summary tables in this document are the result. The
  [appendix](#appendix-evidence-for-each-entry) holds the evidence for each
  entry with `path:line`. Where an appendix heading gives a different class
  from the summary table, the summary table is right: see
  [Reclassified](#reclassified-against-the-appendix).
- Counting unit: one thing started. A legacy step that starts several things
  (a `Promise.all`, several `init()` calls) counts once for each. The glue
  code of a step is not counted.

Classes:

| Class | Meaning                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------- |
| A     | Nothing to start. Only constructs objects. Could be built on first use with no change in behaviour |
| B     | Declares only. Subscribes, registers or schedules fixed things. Could become a declaration         |
| C     | Could be lazy with a small change. Loads, checks, or reads another service at start                |
| D     | Genuinely must run before serving                                                                  |
| E     | Genuinely long-running, or work that belongs to a worker or scheduler role                         |
| F     | Does not belong in boot at all                                                                     |

An entry with mixed effects has the highest letter that applies. An entry
that captures another service's instance while it starts is C, not A or B,
even when the capture is the only reason: the capture is a real order
dependency today and a getter removes it.

## Answer in one paragraph

Of 94 things boot starts, 3 are class D and 1 is class F with a D part (the
database state check). No `defineService` root is class D. 49 are A or B:
they have nothing to start, or only declare. 30 are C: they could be built on
first use after a small change, usually replacing a captured instance with a
getter. 11 are E and belong to a worker or scheduler role, or to the HTTP
listener. The real boot of Ghost is: check the database state, load
settings, register the dynamic routers, lift maintenance. Three more entries
(the active theme, custom redirects, offers) are needed by the first site
request and are C only at the cost of a slower first request. All inferred.

## Counts

| Group                                | A      | B      | C      | D     | E      | F     | Total  |
| ------------------------------------ | ------ | ------ | ------ | ----- | ------ | ----- | ------ |
| Shared entries                       | 5      | 0      | 2      | 1     | 0      | 0     | 8      |
| Service roots (`defineService`)      | 14     | 4      | 10     | 0     | 2      | 0     | 30     |
| Legacy things in the services list   | 5      | 8      | 11     | 1     | 1      | 0     | 26     |
| Background entries                   | 0      | 7      | 5      | 0     | 3      | 0     | 15     |
| Legacy steps outside the three lists | 2      | 4      | 2      | 1     | 5      | 1     | 15     |
| **Total**                            | **26** | **23** | **30** | **3** | **11** | **1** | **94** |

Nothing was classified `unknown`. What was not read is listed in
[Not determined](#not-determined).

Three counts depend on configuration and are counted at their highest class:
`metrics` (E only with the Prometheus pushgateway on; nothing when Prometheus
is off), `remote flags` (E only when configured) and `error reporting` (B
only when Sentry is configured).

## Class D: the real boot

| #   | Entry                                 | Why it must run before serving                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `database`, the state check (F entry) | Ghost must not serve against a schema that is behind or ahead: every model query would be wrong. The check is D. Running the initialisation or migration is F                                                                                                                                                                                                         |
| 1   | `settings` (shared)                   | The settings cache is read synchronously everywhere (`settingsCache.get`). Before it is filled it returns `undefined` for every key without failing (`ghost/core/shared/settings-cache/cache-manager.js:125-127`). A synchronous cache over an asynchronous store has to be filled before the first read. Its three subscriptions must exist before any settings edit |
| 2   | `legacy: dynamic routing`             | The root app answers 503 while `!urlService.hasFinished()` (`ghost/core/app.js:14-24`), for the Admin API too. `hasFinished()` becomes true when the routers register. Without the routers the site router is empty and every resource URL is `/404/`. An invalid `routes.yaml` fails boot here                                                                       |
| 3   | `ready`                               | Lifts the maintenance flag, mounts the Ghost app on the root app and notifies the process manager                                                                                                                                                                                                                                                                     |

Order between them: 0, then 1, then 2, then 3. Each depends on the one
before:

- Settings queries the database.
- Dynamic routing runs `bridge.init()`, which subscribes to locale, labs and
  timezone changes, and reads the route settings. It also needs the site app
  to exist, because the routers mount on it (see order dependencies 25 to 27).
- Ready follows everything that is D.

Settings reads limits while it starts (order dependency 1). Limits is class
A: it is built from config and queries nothing.

Borderline, classified C "D as written":

| Entry                                             | What the first site request needs                                                                                                                           | Cost of making it lazy                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `legacy: themes`, themes init                     | An active theme. Without one every site request is a 500 (`ghost/core/frontend/services/theme-engine/middleware/ensure-active-theme.js`); Admin still works | The first site request loads and validates the theme. Not measured |
| `legacy: routing services`, custom-redirects init | The redirects file read into a manager                                                                                                                      | The first site request reads the file or the storage adapter       |
| `legacy: themes`, offers init                     | All offers read into a redirect manager. Also two event subscriptions, which are B                                                                          | The first site request reads the offers                            |

If these three are counted as D, the real boot is 6 entries plus the state
check.

## Summary table

`S/` is `ghost/core/server/services/`. `BS` is
`ghost/bootstrap/transition/boot-steps.ts`. "Bus" is `@tryghost/domain-events`
(domain) or `ghost/core/server/lib/common/events` (legacy). Stop is "none"
unless stated. All rows inferred.

### Legacy steps outside the three lists

| Entry                        | Class | At start                                                                                                                                              | Reads other services at start      | Stop                                                        |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| unhandled rejections         | B     | subscribe: one `process.on('unhandledRejection')` (`BS:496-502`)                                                                                      | none                               | none; each restart in a process adds a listener             |
| error reporting              | B     | other: `Sentry.init` on import, from config                                                                                                           | none                               | none                                                        |
| metrics                      | E     | on import: default metrics; with the pushgateway, an immediate push and a `setInterval`                                                               | none                               | Prometheus stop, as a server cleanup task (`BS:546-550`)    |
| http server                  | E     | listen; takes over SIGINT and SIGTERM; registers cleanup tasks (`BS:516-558`)                                                                         | none                               | the server's own shutdown, which calls `application.stop()` |
| database                     | F     | check: state; other: initialise or migrate with knex-migrator on its own connection; load: one `SELECT version()` (`BS:57-68`)                        | none                               | none                                                        |
| query tracing                | B     | subscribe: three listeners on the Knex instance, only with Sentry tracing on                                                                          | none                               | none                                                        |
| adapter manager `init()`     | C     | check: requires each configured adapter module and calls its static `validate`. Failure would move to first use                                       | none                               | none                                                        |
| foundation checks            | B     | register: the allowed image loader list from config                                                                                                   | none                               | none                                                        |
| jobs: `memberJobs.init()`    | A     | wire                                                                                                                                                  | none                               | none                                                        |
| jobs: site importer init     | A     | wire; holds the imports storage adapter                                                                                                               | none                               | none                                                        |
| jobs: `registerJobHandlers`  | C     | register: 18 fixed handlers and queues. C because it captures 8 service instances                                                                     | 8 instances (dependency 39)        | none                                                        |
| jobs: `jobsService.start()`  | E     | default: stores the processor and creates queues; no loop, timer or query. With the outbox (MySQL): a database sweep, a 30 s poll loop, a lease timer | queue declarations (dependency 40) | `shutdown`, registered only when there is an HTTP server    |
| after jobs: automations init | E     | subscribe: 3 domain events; register on the scheduler; then an immediate poll that queries and sends                                                  | dependency 42                      | none                                                        |
| after jobs: `rescheduleAll`  | E     | load: scheduled posts and pages; refills the in-memory scheduler. Nothing a request reads                                                             | scheduler adapter                  | none                                                        |
| ready                        | D     | lifts maintenance, mounts the app, notifies (`BS:612-643`)                                                                                            | everything D                       | none                                                        |

### Shared entries

| Entry                        | Class | At start                                                                                                                                                                                                                                                          | Reads other services at start                |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| legacy: url utils            | A     | built from config on import. The module is already loaded by the http server step, so the entry is a no-op `require`                                                                                                                                              | none                                         |
| limits                       | A     | wire: limit objects from config. No query                                                                                                                                                                                                                         | none                                         |
| settings-transition          | A     | wire: an object of getters                                                                                                                                                                                                                                        | none                                         |
| settings                     | D     | load: all rows into the cache; subscribe: 3 legacy-bus events plus one for each calculated field's dependents; check: `site_uuid`. Also F parts: inserts missing default rows, forces the site private from a host limit, `syncEmailSettings`, recreates the pool | limits (dependencies 1 and 2), url utils (3) |
| signing-keys                 | C     | wire, then `check()`, which reads the settings cache and duplicates the check job                                                                                                                                                                                 | settings (4)                                 |
| internal-keys                | A     | wire: a lazy map. No query until a key is asked for                                                                                                                                                                                                               | none                                         |
| legacy: i18n                 | C     | load: the `locale` setting and one locale file; subscribe: locale change                                                                                                                                                                                          | settings (5)                                 |
| legacy: email address policy | A     | wire: stores closures. Reads happen at use                                                                                                                                                                                                                        | none                                         |

None has a stop. The settings listeners are removed by the next cache
`init`, not by a stop.

### Service roots

Only `indexnow-ping` and `slack-ping` pass `start` and `stop` hooks. For the
other 28, `stop()` does nothing. Root file is `S/<name>/index.ts` unless
stated.

| Root                   | Class | At start                                                                                                                            | Reads other services at start                         |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| better-auth            | C     | wire; captures `admin_session_secret`; awaits `auth.$context` as a self-check (`ghost/core/server/auth/better-auth/index.ts:23`)    | settings (6)                                          |
| gift-links             | A     | wire                                                                                                                                | none                                                  |
| app-installations      | C     | wire; check: zod check of `config.apps` that fails boot (`index.ts:90`)                                                             | none                                                  |
| export-requests        | A     | wire                                                                                                                                | none                                                  |
| invites                | A     | wire                                                                                                                                | none (limits is a forwarding Proxy)                   |
| integrations           | A     | wire                                                                                                                                | none                                                  |
| stripe-checkout-config | C     | wire; throws if metafields are unset (`index.ts:43,53-54`)                                                                          | members metafields (7)                                |
| link-redirection       | C     | wire; with the host cache on: builds a cache adapter and subscribes to `site.changed` (legacy bus)                                  | adapter manager                                       |
| custom-theme-settings  | A     | wire. The database sync happens in theme activation                                                                                 | none                                                  |
| member-attribution     | A     | wire; captures two URLs built from config                                                                                           | none                                                  |
| audience-feedback      | A     | wire; captures one URL built from config                                                                                            | none                                                  |
| newsletters            | A     | wire                                                                                                                                | none                                                  |
| mentions               | C     | subscribe: 6 legacy-bus events; captures `jobsService.getInstance()` (`index.ts:23`)                                                | jobs service (9)                                      |
| stats                  | C     | reads `web_analytics_enabled` once; calls `TinybirdServiceWrapper.init()`; may build a cache adapter                                | settings (10)                                         |
| staff                  | C     | subscribe: 4 domain events; load: reads email partial files synchronously                                                           | member-attribution (11)                               |
| tiers                  | C     | load: all products into an in-memory store                                                                                          | members metafields (8)                                |
| tags-public            | B     | subscribe: `site.changed` (legacy bus), only with its cache on                                                                      | none                                                  |
| posts-public           | B     | subscribe: `site.changed` (legacy bus), only with its cache on                                                                      | none                                                  |
| indexnow-ping          | B     | subscribe: 2 legacy-bus events in `start`. Stop removes them                                                                        | none                                                  |
| upgrades               | A     | wire                                                                                                                                | none                                                  |
| slack-ping             | B     | subscribe: 2 legacy-bus events in `start`. Stop removes them                                                                        | none                                                  |
| comments               | A     | wire                                                                                                                                | none                                                  |
| media-inliner          | C     | wire; check: resolves 3 storage adapters so a broken one fails boot                                                                 | adapter manager                                       |
| donations              | A     | wire                                                                                                                                | none                                                  |
| recommendations        | E     | subscribe: 1 domain event; register: a mapper on Mentions; schedule: 2 one-off delayed network refreshes, which is worker-role work | mentions (12, 13), settings (14)                      |
| explore-ping           | E     | fires a detached ping (database and HTTP) at start. Nothing reads the service                                                       | stats (15), email service (16), settings (17)         |
| users                  | A     | wire                                                                                                                                | none                                                  |
| editor-presence        | A     | wire; resolves the `cache:presence` adapter                                                                                         | adapter manager                                       |
| segments               | A     | wire                                                                                                                                | none                                                  |
| member-welcome-emails  | C     | load: 6 templates read synchronously; subscribe: locale change                                                                      | email address (18), link tracking (19), settings (20) |

### Legacy things in the services list

| Entry                                   | Class | At start                                                                                                                                                                       | Reads other services at start                             | Stop                              |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------- |
| members metafields                      | A     | wire                                                                                                                                                                           | none                                                      | none                              |
| jobs cleanup                            | B     | register: one server cleanup task, the job runner's stop (`BS:132-149`)                                                                                                        | none                                                      | is a stop                         |
| knex instrumentation                    | B     | register: Prometheus listeners on the Knex pool (`BS:591-599`)                                                                                                                 | must follow settings (21)                                 | none                              |
| routing services: route-settings init   | A     | wire: hands the adapter to the service. No file read                                                                                                                           | adapter manager                                           | none                              |
| routing services: custom-redirects init | C     | load: the redirects file or storage adapter                                                                                                                                    | none                                                      | none                              |
| themes: themes init                     | C     | load: reads, validates and activates the active theme; writes custom theme settings to the database. A missing theme is logged and boot continues                              | settings, labs, custom-theme-settings (28)                | none                              |
| themes: offers init                     | C     | subscribe: 2 domain events; load: all offers. Not idempotent: a second call subscribes again                                                                                   | none                                                      | none                              |
| frontend (helpers)                      | B     | register: 53 Handlebars helpers                                                                                                                                                | none                                                      | none                              |
| express apps                            | C     | wire: parent, admin and site apps. The API, members, well-known, webmentions and gift apps are built on first request. C because it captures middleware from three services    | offers (22), custom redirects (23), link-redirection (24) | none                              |
| dynamic routing                         | D     | load: `routes.yaml`; register: routers on the site app and the URL service; subscribe: `bridge.init()`                                                                         | route settings (25), site app (26)                        | none                              |
| app service                             | B     | register: `/private/` on the apps router, one helper; a config check                                                                                                           | apps router (27)                                          | none                              |
| jobs service (init only)                | A     | wire. No connection, query or timer until `start()`                                                                                                                            | adapter manager                                           | none                              |
| services first: post-scheduling         | B     | on import: subscribe to 6 legacy-bus events; register on the scheduling adapter                                                                                                | scheduling adapter, internal keys (30)                    | none                              |
| services first: scheduler `run()`       | E     | schedule: a self-rearming 5-minute `setTimeout` over an in-memory queue, for ever. Jobs fire by HTTP to Ghost's own Admin API                                                  | none                                                      | none                              |
| services first: `stripe.init()`         | C     | reads Stripe keys from settings. With keys: calls Stripe at boot to create or update the billing portal configuration, and in production the webhook endpoint. Failures logged | settings (31)                                             | `stripe.shutdown()`, cleanup task |
| services first: `giftService.init()`    | C     | subscribe: 4 domain events; register: 2 reschedulers on the scheduling adapter                                                                                                 | internal keys, checkouts (29)                             | none                              |
| services: identity-tokens               | C     | wire; captures the signing keys provider                                                                                                                                       | signing keys (38)                                         | none                              |
| services: members                       | C     | wire; subscribe: 6 domain events; check: a Stripe key and SSL check that fails boot. No database or Stripe load, and no `await`                                                | stripe (32); eight captures (33)                          | none                              |
| services: members-events                | B     | subscribe: 3 or 4 domain events                                                                                                                                                | none (reads members lazily)                               | none                              |
| services: email-service                 | C     | wire; subscribe: 1 legacy-bus event; register: 2 stop tasks on the server                                                                                                      | members (34); four captures (35)                          | 2 stop tasks                      |
| services: email-analytics               | A     | wire; Prometheus counters. Fetches nothing                                                                                                                                     | none itself; its argument reads members (36)              | none                              |
| services: `webhooks.listen()`           | B     | subscribe: 30 legacy-bus events                                                                                                                                                | none                                                      | none                              |
| services: link-tracking                 | C     | subscribe: 1 domain event                                                                                                                                                      | link-redirection (37)                                     | none                              |
| services: email-suppression-list        | B     | subscribe: 2 domain events                                                                                                                                                     | none                                                      | none                              |
| services: content-import                | A     | wire                                                                                                                                                                           | none                                                      | none                              |
| services: machine-payments              | C     | when enabled: mints two Stripe deposit addresses (network and a settings write) unless cached                                                                                  | settings                                                  | none                              |

### Background entries

No cron string is a literal and none comes from config or settings: each is
`Math.random()` jitter chosen when it is scheduled. Scheduling is an
in-process timer with no query or network call, except where stated.

| Entry                    | Class | At start                                                                                                      | Reads other services at start  |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| inactive themes          | C     | load: theme packages from disk. The promise is not returned to the framework                                  | none                           |
| interrupted email sends  | E     | load: scans pending and submitting emails; dispatches send jobs                                               | email service, job runner (47) |
| pending gift deliveries  | E     | rebuilds the scheduler entries and sends. Not awaited                                                         | gift service, scheduler (47)   |
| gift cleanup job         | B     | schedule: daily                                                                                               | job runner                     |
| gift reminder job        | B     | schedule: daily                                                                                               | job runner                     |
| member token cleanup job | B     | schedule: daily                                                                                               | job runner                     |
| expired comp cleanup job | B     | schedule: daily                                                                                               | job runner                     |
| signing key check job    | C     | schedule: only if `isRotating()`; also stores the runner for later rotations                                  | signing keys, settings (43)    |
| auth cleanup job         | B     | schedule: daily                                                                                               | job runner                     |
| email analytics jobs     | C     | a config gate and 3 queries decide whether to schedule each 5-minute job                                      | job runner                     |
| activitypub              | C     | subscribe: 3 legacy-bus events; with social web on, reconciles webhooks in the database and fetches over HTTP | identity tokens, settings (44) |
| tinybird sync job        | C     | config and `site_uuid` decide whether to schedule                                                             | settings (45)                  |
| update check jobs        | B     | schedule: daily; a one-off dispatch if `updateCheck:forceUpdate`                                              | job runner                     |
| remote flags             | E     | when configured: an immediate fetch, then an unref'd timer. Must run in every role that evaluates flags       | settings (46)                  |
| milestones               | B     | subscribe: 1 domain event; schedule: one `setTimeout` of 0 to 3 days, never cleared                           | none                           |

None has a stop.

## Order dependencies

"X reads Y at start". 48 found. Some lines group several captures by one
reader.

| #   | Reader                           | Reads                                                                                                                  | Can it move to time of use?                                                  |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | settings                         | limits: `isDisabled('publicSiteAccess')` decides a database write (`ghost/shared/settings/start-settings.ts:42`)       | No, while that write stays in boot                                           |
| 2   | settings, calculated fields      | limits, through the legacy alias                                                                                       | Yes: compute on read                                                         |
| 3   | settings, calculated fields      | url utils                                                                                                              | Yes; url utils is built from config alone                                    |
| 4   | signing-keys                     | settings cache, in `check()`                                                                                           | Yes: leave the check to the job                                              |
| 5   | i18n                             | settings: `locale`                                                                                                     | Yes: build on first `t()`                                                    |
| 6   | better-auth                      | settings: `admin_session_secret`                                                                                       | Yes, by building the whole instance on first use                             |
| 7   | stripe-checkout-config           | members metafields                                                                                                     | Yes: getters                                                                 |
| 8   | tiers                            | members metafields: `booted()`                                                                                         | Yes: call it inside the existing closure                                     |
| 9   | mentions                         | jobs service: `getInstance()`                                                                                          | Yes: getter                                                                  |
| 10  | stats                            | settings: `web_analytics_enabled`, `site_uuid`                                                                         | Yes: read on each request                                                    |
| 11  | staff                            | member-attribution                                                                                                     | Yes: getter                                                                  |
| 12  | recommendations                  | mentions, two captures                                                                                                 | Yes: getters                                                                 |
| 13  | recommendations                  | mentions: `metadata.addMapper` (`S/recommendations/index.ts:128`)                                                      | No, unless Mentions collects declared mappers                                |
| 14  | recommendations                  | settings: `recommendations_enabled`                                                                                    | Yes: read when the timer fires                                               |
| 15  | explore-ping                     | stats                                                                                                                  | Yes: getter                                                                  |
| 16  | explore-ping                     | the legacy email service, through `posts-service-instance`                                                             | Yes: it never uses it                                                        |
| 17  | explore-ping                     | settings, in the ping it fires                                                                                         | Moves with the ping                                                          |
| 18  | member-welcome-emails            | email address                                                                                                          | Yes: getter                                                                  |
| 19  | member-welcome-emails            | link tracking                                                                                                          | Yes: getter                                                                  |
| 20  | member-welcome-emails            | settings: `locale`                                                                                                     | Yes                                                                          |
| 21  | knex instrumentation             | must follow the settings start, which destroys and recreates the pool (`ghost/core/server/models/settings.js:350-352`) | No, unless the destroy and initialise are removed                            |
| 22  | express apps                     | offers: middleware                                                                                                     | Yes: a thunk                                                                 |
| 23  | express apps                     | custom redirects: middleware                                                                                           | Yes: a thunk                                                                 |
| 24  | express apps                     | link-redirection: route prefix and handler                                                                             | Handler yes. The prefix is part of the route pattern: not easily             |
| 25  | dynamic routing                  | route settings store                                                                                                   | No: the result decides which routers exist                                   |
| 26  | dynamic routing                  | the site app, and the sitemap manager it loads, must exist                                                             | No                                                                           |
| 27  | app service                      | the apps router in the routing registry                                                                                | No                                                                           |
| 28  | themes                           | settings (`active_theme`, `locale`), labs, custom-theme-settings                                                       | Moves with activation                                                        |
| 29  | gifts                            | internal keys, checkouts                                                                                               | Yes: getters                                                                 |
| 30  | post-scheduling, gifts           | the scheduling adapter object, to register on                                                                          | The object is available at any time from the adapter manager                 |
| 31  | stripe                           | settings: Stripe keys                                                                                                  | Yes: moves with first use                                                    |
| 32  | members                          | stripe: `api.configured` and `mode`, for a check that fails boot                                                       | No, without changing what fails boot                                         |
| 33  | members                          | newsletters, member-attribution, signing keys, offers, email address, metafields, checkouts, two settings secrets      | Yes: getters                                                                 |
| 34  | email-service                    | members: `api.members`, `verificationTrigger`                                                                          | Yes: getters                                                                 |
| 35  | email-service                    | audience-feedback, member-attribution, limits, `locale`                                                                | Yes                                                                          |
| 36  | email-analytics, its argument    | members: `api.members` (`BS:396`)                                                                                      | Yes: pass a getter                                                           |
| 37  | link-tracking                    | link-redirection                                                                                                       | Yes                                                                          |
| 38  | identity-tokens                  | signing keys                                                                                                           | Yes: build on first use                                                      |
| 39  | `registerJobHandlers`            | 8 instances: email analytics (3), gifts, media inliner, mentions (2), email service, signing keys                      | Yes: a closure that resolves when the job runs, as other handlers already do |
| 40  | `jobsService.start()`            | queue declarations                                                                                                     | No: a later declaration silently gets the default concurrency                |
| 41  | site importer                    | the imports storage adapter                                                                                            | Yes                                                                          |
| 42  | automations                      | url utils, `site_uuid`, internal keys, scheduler adapter                                                               | Yes                                                                          |
| 43  | signing key check job            | signing keys: `isRotating()`                                                                                           | Only by scheduling it unconditionally                                        |
| 44  | activitypub                      | identity tokens, `social_web_enabled`                                                                                  | Captures yes                                                                 |
| 45  | tinybird sync job                | `site_uuid`                                                                                                            | Yes: schedule unconditionally; the job checks on every run                   |
| 46  | remote flags                     | `site_uuid`                                                                                                            | Yes                                                                          |
| 47  | interrupted sends, gift recovery | the email and gift services, and a started runner in the same process                                                  | No: this is the work itself. It belongs to the worker role                   |
| 48  | everything that queries; ready   | the database step; every D entry                                                                                       | No                                                                           |

**How many remain if every movable read is moved: 11** (1, 13, 21, 24 for
the prefix only, 25, 26, 27, 32, 40, 47, 48). Three of those go with a small
change of their own, leaving **8**:

- 13: Mentions collects declared mappers.
- 21: the pool is no longer destroyed and recreated in the settings start.
- 32: the Stripe key check becomes a check the framework runs, not part of
  members.

Of the 8, five are inside the class D chain (1, 25, 26, 27, 48), one is
inside the worker role (47), one is the job runner's own rule (40) and one is
a route pattern (24).

## Entries that are sequential only because of list position

The services list starts everything one after another. These entries read no
earlier entry while they start, and no later entry reads them while it
starts. Their position proves nothing (inferred).

Service roots, 18 of 30: better-auth, gift-links, app-installations,
export-requests, invites, integrations, custom-theme-settings, tags-public,
posts-public, indexnow-ping, upgrades, slack-ping, comments, media-inliner,
donations, users, editor-presence, segments.

- better-auth needs settings, which is in the shared step, not this list.
  Its consumer is the Admin API app, which is built on first request.
- custom-theme-settings is read during the themes step, at time of use. The
  order requirement exists only because the getter throws before `init()`.
- media-inliner is read by `registerJobHandlers`, after the whole list.

Legacy entries: jobs cleanup, frontend helpers, `webhooks.listen()`,
members-events, email-suppression-list, content-import, machine-payments,
and knex instrumentation within this list (its constraint is against the
shared step).

Entries whose position is a proven dependency that a getter would remove, 12
roots: stripe-checkout-config, link-redirection, member-attribution,
audience-feedback, newsletters, mentions, stats, staff, tiers,
recommendations, explore-ping, member-welcome-emails.

Entries whose position is a proven dependency that stays: express apps,
dynamic routing, app service, jobs service init (before its three
capturers).

The comments in `ghost/bootstrap/services.ts` that claim an order reason are
all true as written, with these corrections:

- "webhooks listen after Mentions" is not a read. Both add listeners to the
  legacy bus for the same events; the order decides only which runs first.
  Nothing was found that depends on it.
- "automation polling sends through it once jobs start": polls send through
  `memberWelcomeEmails.service` directly
  (`S/automations/poll.ts:287`), read at poll time, not through the runner.
- "What the frontend reads while its Express app is built" is true of custom
  redirects and not of route settings.
- The comments on the two legacy service steps still list the email address
  policy, which neither starts.
- The comment on `initKnexInstrumentation` names `initLegacyCore`, which no
  longer exists. The pool recreate it describes is in the settings start.
- The comment at `BS:270` says `initFrontend` calls `routerManager.init`. It
  is `initExpressApps` that does.

The legacy `Promise.all` of ten is not concurrent in effect. Six of the ten
have finished before `Promise.all` is called, because their `init` runs to
the end synchronously. Only machine-payments does I/O after an `await`.
There is one real order dependency inside it: `members.api.members` at
`BS:396` is evaluated while the array literal is built, and it works only
because `members.init()` is the element before it and has no `await` before
it sets the API. If `members.init()` throws its Stripe check, the step would
fail with a `TypeError` from `S/email-service/email-service-wrapper.js:49`
and the real error would become an unhandled rejection (inferred, not run).

## A two-phase model on this evidence

**Register (nothing built).** The framework reads declarations and loads no
service:

- Service definitions: a name and a `create`. Covers the 26 class A entries
  as they are, and the 30 class C entries once their captures are getters.
- Listeners: an event and a handler that resolves its service when the event
  fires. Covers the subscriptions of the 23 class B entries and the B parts
  of C entries. This is the declaration that has to exist at boot even when
  the service is built later: an event published before first use is
  otherwise missed. Examples of what would be missed: webmentions for a post
  published before Mentions is first used; staff notifications; the 30
  webhook triggers.
- Job handlers, queue declarations and recurring schedules. Covers
  `registerJobHandlers` and 7 background entries. Queue declarations must be
  collected before the runner starts (dependency 40).
- Routes and apps. The API, members, well-known, webmentions and gift apps
  are already built on first request.
- Checks: adapter validation, `config.apps`, the Stripe key check,
  `site_uuid`, the media-inliner storage adapters.

**Boot (class D only).** In order: database state check, settings, dynamic
routing, ready. Plus themes, custom redirects and offers if the first site
request must not pay for them.

**Roles decide the long-running work.**

| Role         | Starts                                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| web          | HTTP server; metrics push if configured; remote flags                                                                                                                                                                       |
| worker       | job runner; scheduler `run()`; recurring schedules; `rescheduleAll`; automations poll; interrupted sends; gift recovery; recommendations refreshes; explore ping; milestones; Stripe webhook and portal setup; remote flags |
| command line | neither. Database initialisation and migration belong here                                                                                                                                                                  |

**What would have to change, as small as possible.**

In `defineService` (`kernel/src/define-service.ts`):

1. `.service` builds the instance on first read when `create` is
   synchronous, instead of throwing. The experiment below did this for three
   roots in four lines. `init()` stays for an asynchronous `create`
   (2 of the 30 roots: better-auth and tiers) and for `start`.
2. A guard replaces the lost "used before init()" error: building is refused
   until the boot phase has finished. Without it, an early read would build
   against a settings cache that silently returns `undefined`.
3. Subscriptions move out of `create` into `start`, or into a listener
   declaration. Today 7 roots subscribe inside `create` (staff, tags-public,
   posts-public, recommendations, member-welcome-emails, mentions,
   link-redirection) and never release the listener.

In the foundry (`foundry/src/application.ts`):

4. A role in the start options, used by the `when` each entry already has.
   No new mechanism: `when` already skips an entry for a start.
5. A place to collect listener and job declarations before any module is
   loaded. This is the one new primitive. The spike document names the same
   gap for settings and flags.

**What breaks.**

- **Failures move from boot to first use** for every check listed under
  Register, unless the framework runs them as checks. Today each fails boot.
- **Unit tests that assert boot starts each root.** Verified: with three
  roots made lazy, 16 unit tests in 6 files fail, all of them tests of the
  list or of the root's own `init()`; see the experiment.
- **Tests that boot Ghost several times in one process.** `create` already
  runs once per process and the instance survives `stop()`, so lazy building
  does not add a new kind of staleness. What is new: an instance first built
  during test A is built with whatever test A had stubbed. Not run beyond
  the experiment.
- **Code that reads `.service` at import.** Three reads were found at the top
  level of a module (`ghost/core/server/api/endpoints/tags-public.js:24`,
  `posts-public.js:28,84`). They work today only because those modules are
  loaded on first request. With lazy building they would work at any time,
  subject to the guard in point 2.
- **Legacy wrappers are not covered.** `members.api`,
  `emailAddress.service` and `linkTracking.service` are plain properties
  that are `undefined` before their init. They fail silently, not loudly,
  and `defineService` does not help until they are migrated.
- **Subscriptions are lost** for any service built lazily whose listeners
  are still inside `create`. This is silent.
- **The first request is slower** by whatever was moved. Not measured.

## The job runner

**What must be true before it starts today.**

- The runner object exists (`legacy: jobs service`). Mentions, the email
  service and the site importer captured that same object earlier.
- Queue declarations are registered. They are handed to the backend only at
  start. A handler registered later is still found, but its queue gets the
  default concurrency of 3, silently. A job delivered with no handler is
  settled dead and lost.
- `registerJobHandlers` has captured 8 built service instances, 5 of them
  asserted. The runner does not need the captures; each could be a closure.

**What starts after it and blocks ready.**

- `automationsService.init`: 3 subscriptions, a scheduler registration and
  an immediate poll.
- `postScheduling.rescheduleAll()`, when the scheduler adapter says its
  queue is in memory.

Neither needs the runner in the same process, and neither produces anything
a request reads. No reason was found for either to block ready. Run before
ready, an overdue post is pinged against Ghost's own API while it is still
answering 503, and retried.

`jobsService.start()` in the default configuration does almost nothing: it
stores the processor and creates the queues. With the outbox (MySQL, on in
the development and testing configs, off in the defaults) it also sweeps the
outbox table, starts a 30-second poll loop and a lease timer.

**Is a separate role feasible in Ghost as it is?**

- **Default configuration: no.** The only jobs backend is in memory. A job
  exists only in the process that dispatched it, and dispatch throws in a
  process whose backend is not started.
- **With the outbox on: partly.** One-off jobs already cross processes: a
  row is inserted, and any started runner claims it with
  `FOR UPDATE SKIP LOCKED`. The lease logic is written for several
  processes. A web role would build the jobs service and not start it.

**What it would take beyond turning the outbox on.**

1. The worker role builds nearly every service. The handlers reach members,
   gifts, importers, email and signing keys. It is the same application
   without the listener, not a thin worker.
2. `scheduleRecurring` has no cross-process path. It is called at request or
   event time in 4 places (after scheduling a newsletter, gift delivery
   analytics, automations, signing key rotation). In a web role those would
   throw or be dropped.
3. Recurring timers are per process. Two workers would each fire every
   recurring job.
4. State shared in one process today:
   - The email analytics status and schedule endpoints read and write the
     object the job mutates (`ghost/core/server/api/endpoints/emails.js:137,164,176`).
   - The default settings cache is in memory and is kept current by the
     in-process bus. The signing key and update check jobs write settings; a
     web process would keep the old values.
   - The expired comp cleanup job emits `member.edited` on the legacy bus;
     only listeners in its own process see it.
5. The runner's shutdown is registered only when an HTTP server exists.
6. The background entries that schedule or recover belong to the worker
   role. Remote flags must run in every role.

## Database migration and the HTTP server in maintenance mode

**Migration inside boot.** What depends on it being there:

- Nothing in the connection pool. knex-migrator opens and destroys its own
  connection for every call. The migration shutdown hooks destroy Ghost's
  handle only when run from the shell.
- `databaseInfo.init()`: one `SELECT version()`, read later by the public
  config endpoint. It could run on first read.
- The in-development tables, created in development and testing only.
- The `databaseWarning` handed to the ready step.
- Migration files that `require` Ghost modules in the serving process.
- Operationally: a deploy that starts Ghost against an older schema migrates
  itself. Moving migration to a command changes how Ghost is deployed, not
  how it boots. The spike verified that a database needing migration
  answers 503 and then 200.

So the check is D and the migration is F: nothing later in boot needs the
migration to have run in this process, only to have run.

**The HTTP server in maintenance mode.** What depends on it starting early:

- The 503 page while the database is migrated and everything else starts.
- Cleanup tasks register on the server object: the job runner's shutdown,
  Stripe, two for the email service, Prometheus, and `application.stop()`.
  A process with no server registers none of them.
- The server owns SIGINT and SIGTERM.
- The maintenance middleware has three conditions: the flag that ready
  lifts, `config.maintenance.enabled`, and `!urlService.hasFinished()`. The
  last two keep applying for the life of the process. A routes reload
  resets the URL service and the site answers 503 again until the routers
  have registered.
- "Listening before anything heavy is loaded" does not hold on this branch:
  `ghost/core/app.js:5` imports the URL service, which imports the whole
  model registry, before the server listens.

## Experiment: three roots made lazy

Run in the working tree, not committed, reverted afterwards.

- Roots: `gift-links`, `integrations`, `donations`. All class A, all read
  only inside functions by their consumers.
- Change: the three lines removed from `ghost/bootstrap/services.ts`, and
  four lines in `kernel/src/define-service.ts` so that `.service` runs
  `create` on first read for those three names.

Results (verified):

| Run                                                                  | Result                              |
| -------------------------------------------------------------------- | ----------------------------------- |
| Unit suite                                                           | 837 files; 12,103 passed, 50 failed |
| Of the 50, in the three mail files that fail on the untouched branch | 34 (the spike document's baseline)  |
| Of the 50, caused by the change                                      | 16 tests in 6 files                 |
| Four database-backed files, MySQL 8.4.13, `NODE_ENV=testing-mysql`   | 4 files, 75 tests passed, 0 failed  |

The four database-backed files: `test/e2e-api/admin/gift-links.test.ts`,
`test/e2e-api/admin/integrations.test.js`,
`test/e2e-api/members/donation-checkout-session.test.js`,
`test/e2e-api/members/stripe-webhook-outcomes.test.ts`.

The 16 unit failures, by file:

| File                                                 | Failed | What the failing tests assert (from their titles)                |
| ---------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| `test/unit/boot/standard-services.test.ts`           | 6      | Boot waits for each of the three roots, and fails when one fails |
| `test/unit/boot/init-core.test.ts`                   | 3      | Boot waits for Integrations (2) and for i18n (1)                 |
| `test/unit/boot/init-services.test.ts`               | 2      | Boot waits for donations before jobs                             |
| `test/unit/bootstrap/steps.test.ts`                  | 1      | The exact entries of each step, in order                         |
| `test/unit/server/services/gift-links/index.test.ts` | 3      | The root defers binding until `init()`                           |
| `test/unit/server/services/donations/index.test.ts`  | 1      | The root is constructed during boot                              |

Every one is a test of the rule being changed: that boot starts these roots.
No test of what the three services do failed. Only the failure messages of
`init-core.test.ts` were read ("expected stub to be called once but was
called 0 times"); the rest is from the titles. Why the i18n test in that
file fails was not investigated.

Limits of the experiment:

- The unit suite on the untouched branch was not re-run here; the baseline
  of 34 is the spike document's, and the 34 failures seen here are in the
  same three files.
- The four database-backed files were not run on the untouched branch for
  comparison. They log errors while passing; these were not compared.
- The full database suites were not run.
- The lint rule `boot-awaits-service-init` and the service inventory tests
  were not run. They are expected to reject a root that is not in the list.

## Three biggest surprises

1. **No service root has to start before Ghost serves.** Of 30, 14 only
   construct objects, 4 only subscribe, and 10 capture something a getter
   would supply. The two that do real work at start (recommendations,
   explore-ping) do worker-role work. The real boot is four steps.
2. **The settings start destroys and recreates the database pool on every
   start**, as a workaround for SQLite that also runs on MySQL. That is the
   actual reason knex instrumentation has a fixed position, and the comment
   that explains it names a function that no longer exists.
3. **The "concurrent" legacy group is sequential, with a hidden dependency
   inside it**, and several stated reasons do not match the code: automation
   polling does not send through the runner, nothing was found that makes
   post rescheduling block ready, and starting the job runner does almost
   nothing in the default configuration.

## Not determined

- What adapter constructors do. `getAdapter` for cache and storage adapters
  was not followed into the adapters. If the `cache:presence` Redis adapter
  connects when it is constructed, editor-presence is C, not A. The same
  applies to link-redirection, stats, settings and media-inliner.
- Non-default scheduling, jobs and cache adapters.
- External packages: knex-migrator beyond its connection handling, what
  `instrumentKnex` attaches, `Sentry.init`, `collectDefaultMetrics`, gscan,
  `express-lazy-router`, nodemailer, `@tryghost/i18n`, Better Auth's
  `createAuthContext`.
- Whether any migration uses Ghost's own database handle.
- Top-level code of the 53 helper modules, the shared web middleware, the
  model registry, `shared/labs`, `lib/mail`.
- Whether tiers' write paths assume the store is already filled, which
  matters for making tiers lazy.
- The cost in time of a lazy first request for themes, redirects and offers.
- Which HTTP endpoint each job dispatch sits behind.
- Whether anything depends on Mentions' listeners running before the
  webhooks listeners.
- The import-time read count for the settings cache, labs and limits is a
  grep heuristic that found 0 at module top level; it cannot see reads made
  inside a function called at import.
- Nothing here was run on SQLite, in a browser, or through Ghost-CLI.

## Recheck

A second pass over this document, after it was first written. What was
checked again, by running a command against the tree (verified):

- The list sizes: 30 roots and 12 legacy entries in the services list, 15
  background entries, 8 shared entries.
- The counts table against the summary tables, recounted by script: the
  five groups and the total of 94 match, and the order dependency table has
  48 rows.
- Which roots pass `start` and `stop` hooks: only indexnow-ping and
  slack-ping.
- Which roots have an asynchronous `create`: better-auth and tiers. This was
  listed as not determined before.
- These cited lines, re-read and found to say what the table says:
  order dependencies 1, 8, 9, 11, 13, 15, 21 and 36; the checks in
  stripe-checkout-config and app-installations; the silent `undefined` of
  the settings cache; the maintenance gate in `ghost/core/app.js`; the
  automation send in `poll.ts`; the email analytics status endpoint; the
  apps that are built on first request; the Stripe billing portal call.

Nothing was reclassified by the recheck. The other rows remain as the
readers reported them: inferred, and not re-read.

## Reclassified against the appendix

The appendix is what each reader wrote. Nine classes were changed for
consistency with the rule that a start-time capture of another service is C
and that config and url utils are not services:

| Entry                 | Appendix | Here | Why                                                    |
| --------------------- | -------- | ---- | ------------------------------------------------------ |
| member-attribution    | C        | A    | Captures only URLs built from config                   |
| audience-feedback     | C        | A    | Captures only a URL built from config                  |
| staff                 | B        | C    | Captures member-attribution and reads files at start   |
| recommendations       | B        | E    | The two delayed network refreshes are worker-role work |
| link-tracking         | B        | C    | Captures link-redirection                              |
| `giftService.init()`  | B        | C    | Captures internal keys and checkouts                   |
| identity-tokens       | A        | C    | Captures the signing keys provider                     |
| express apps          | A        | C    | Captures middleware from three services at build       |
| `registerJobHandlers` | B        | C    | Captures 8 service instances                           |

## Appendix: evidence for each entry

Six parts, one for each reader. Each defines its own path abbreviations at
the top. All inferred.

### Part 1: foundation, database and shared

Branch `claude/framework-boot-spike`. All paths relative to repo root. Everything is `inferred` from reading; nothing was run.

Order as executed by `foundry/src/application.ts:391-401`: `startFoundation()` → foundation.after slots (unhandled rejections, error reporting, metrics, http server) → database.run → database.after (query tracing) → `adapters().init()` → shared.before (foundation checks) → shared modules.

---

#### Legacy steps around the foundation and database

##### unhandled rejections — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:496` (listed `ghost/bootstrap/app.ts:88`)
- Effects:
  - `subscribe` — `process.on('unhandledRejection', …)` that logs through the foundation logger (`ghost/bootstrap/transition/boot-steps.ts:498-500`)
- Reads at start: none beyond foundation (logging).
- Stop: none. The slot has no `stop`, so each `application.start()` in the same process adds one more listener (tests that boot repeatedly).
- Class reason: one fixed process-level handler; a declaration. If it did not exist until "first use", rejections before that would fall to Node's default (process crash on Node 22).
- Confidence: inferred
- Not determined: nothing

##### error reporting — class B (A when Sentry is not configured)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:507` → `require('ghost/core/shared/sentry')`
- Effects (all on import):
  - `other` — reads `config.get('sentry')` at module top (`ghost/core/shared/sentry.js:3`)
  - `register` — if configured and not disabled: `Sentry.init({...})` installs Sentry's global handlers/integrations, plus the HTTP tracing integration when `sentry.tracing.enabled` (`ghost/core/shared/sentry.js:103-128`); exports request/error/tracing express handlers (`:130-145`)
  - `wire` — otherwise exports no-ops (`ghost/core/shared/sentry.js:146-160`)
- Reads at start: none beyond foundation (config).
- Stop: none.
- Class reason: config-only installation of a fixed global hook. The step exists only so its load time is visible: `ghost/core/app.js:1` and `ghost/core/shared/express.js:4` import the same module anyway, so the very next step would load it.
- Confidence: inferred
- Not determined: what `Sentry.init` does internally (network is not contacted until an event is sent, as far as I know; not read).

##### metrics — class E when `prometheus:pushgateway:enabled`, B when only `prometheus:enabled`, nothing otherwise

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:241` → `require('ghost/core/shared/prometheus-client')` only if `config.get('prometheus:enabled')` (`:242`)
- Effects (all on import of `ghost/core/shared/prometheus-client.js`):
  - `wire` — `new PrometheusClient({pushgateway})` (`ghost/core/shared/prometheus-client.js:6-9`)
  - `register` — `prometheusClient.init()` (`:10`) → `collectDefaultMetrics()` (prom-client default process metrics) (`@tryghost/prometheus-metrics/build/PrometheusClient.js:37-38,97-98`)
  - `schedule` + network — if pushgateway enabled: one immediate `pushMetrics()` and a `setInterval` (default 15 s) pushing to the gateway (`PrometheusClient.js:39-51`)
  - step itself: stores the client in `state.prometheusClient` (`ghost/bootstrap/transition/legacy-steps.ts:68-70` of that file, i.e. `metrics:` wrapper) for `http server`, `knex instrumentation`, email analytics.
- Reads at start: none beyond foundation (config).
- Stop: `prometheusClient.stop()` (clears the interval) — registered as a GhostServer cleanup task by the http-server step, only when a server exists (`ghost/bootstrap/transition/boot-steps.ts:546-550`). Not an application `stop`.
- Class reason: the pushgateway loop is long-running work unrelated to serving a request; default-metric registration is a declaration.
- Confidence: inferred
- Not determined: whether `collectDefaultMetrics` in the installed prom-client version sets timers (not read).

##### http server — class E

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:516` (wrapper `ghost/bootstrap/transition/legacy-steps.ts` `httpServer`, listed `ghost/bootstrap/app.ts:92-95`)
- Effects:
  - `load` (on import) — `require('ghost/core/app')` (`boot-steps.ts:530`) imports `./server/services/url` (`ghost/core/app.js:5`), whose index imports the **whole model registry** and builds the URL-service singleton (`ghost/core/server/services/url/index.js:3,7`), and `shared/url-utils` (`ghost/core/server/services/url/lazy-url-service.ts:4`). So "listening before anything heavy is loaded" (`boot-steps.ts:12-15`) is not true on this branch: models (and through `models/base/bookshelf.js:6,10` the db handle) load before `listen`. No query is made.
  - `wire` — root express app: sentry request handler, optional tracing handler, optional `siteIdMiddleware`, then `app.enable('maintenance')` and `maintenanceMiddleware` (`ghost/core/app.js:63-76`); `shared/express` adds `sentry.errorHandler` and trust-proxy (`ghost/core/shared/express.js:16-28`)
  - returns early with only `rootApp` when `options.server` is false (`boot-steps.ts:532-534`)
  - `listen` — `new GhostServer(...)` then `ghostServer.start(rootApp)` → `rootApp.listen(port, host)`, wrapped in `stoppable` (`ghost/core/server/ghost-server.ts:95-139`)
  - `subscribe` — replaces the process `SIGINT`/`SIGTERM` listeners with `this.shutdown()` (`ghost/core/server/ghost-server.ts:142-146`)
  - `other` — `notify.notifyServerStarted()` on `listening`/`error`: IPC `process.send` and/or bootstrap socket (`ghost/core/server/ghost-server.ts:124,134`; `ghost/core/server/notify.js:31-66`)
  - `register` — two cleanup tasks on the server: stop Prometheus client, and `application.stop()` ("Application") (`boot-steps.ts:546-554`)
- **Maintenance mechanism, exactly:** `app.enable('maintenance')` sets the Express setting on the root app (`ghost/core/app.js:72`). `maintenanceMiddleware` (`:27-38`) is the last thing on the root app until `ready`. For every request it answers **503**, `content-type: text/html`, no-cache headers, body streamed from `ghost/core/server/views/maintenance.html`, whenever any of three conditions holds (`ghost/core/app.js:14-24`): (1) `req.app.get('maintenance')` — the boot flag; (2) `config.get('maintenance').enabled` — operator switch; (3) `!urlService.hasFinished()` — true until at least one router has registered a permalink type with the URL service (`ghost/core/server/services/url/lazy-url-service.ts:228-242,336-338`), and again during a routes reload after `urlService.reset()` (`ghost/core/bridge.js:130`). `initReady` turns it off with `rootApp.disable('maintenance')` and only then mounts the real app: `rootApp.use(config.getSubdir(), ghostApp)` (`ghost/bootstrap/transition/boot-steps.ts:630-631`), then `notifyServerReady()` (`:642`). Because the Ghost app is mounted _after_ the maintenance middleware, condition (2)/(3) keep gating it for the life of the process. With `hostSettings:siteId` set, a mismatched `x-site-id` gets 500 before maintenance is even consulted (`ghost/core/app.js:44-60,69-71`).
- Reads at start: none beyond foundation (config: site url, env, `server`). Imports url service/url-utils but does not call them.
- Stop: `GhostServer.stop()` drains the HTTP server then runs cleanup tasks; `shutdown()` also flushes logs and `process.exit`s (`ghost/core/server/ghost-server.ts:155-207`). The application's own `stop()` runs as one of those cleanup tasks.
- Class reason: opens the listening socket and owns signals and exit.
- Confidence: inferred
- Not determined: nothing material. (Model registry import-time effects were not read here.)

##### database (`initDatabaseReady`) — class F (with a D part: the state check; and a C part: `databaseInfo.init`)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:563` → `initDatabase` (`:57-68`)
- Effects — `DatabaseStateManager.makeReady()` (`ghost/core/server/data/db/database-state-manager.js:94-145`):
  - Always: `getState()` → `knexMigrator.isDatabaseOK()` (`:48-52`). knex-migrator opens **its own** connection from `ghost/MigratorConfig.mts:23` (`configure(config.get('database'))`), checks connectivity, migrations table, lock and integrity, then destroys that connection (`knex-migrator/lib/index.js:559-613`). `load`/`check`.
  - **State READY (ok):** log "ready"; `createMissingInDevelopmentTables()` then return (`database-state-manager.js:100-103`). That is a no-op unless env is development/testing **and** `createInDevelopmentTables === true` (`ghost/core/server/data/schema/in-development.ts:35-39`); when on, it lists tables on Ghost's own knex and creates missing in-development tables (`:61-79`).
  - **Fresh DB** (`DB_NOT_INITIALISED` or `MIGRATION_TABLE_IS_MISSING` → NEEDS_INITIALISATION, `:55-64`): `knexMigrator.init()` (creates schema + fixtures, runs all migrations as init), emits `migrations` metric (`:105-114`); then `getState()` again, print, `createMissingInDevelopmentTables()` (`:127-131`). The second `getState` result is only printed — it is not checked.
  - **Needs migration** (`DB_NEEDS_MIGRATION`, `:67-70`): `knexMigrator.migrate()` (runs the `before` hook = DB backup unless `disableMigrationBackups`, `ghost/core/server/data/migrations/hooks/migrate/before.ts:6-16`), metric (`:116-125`); then the same re-check/print/in-dev tables.
  - **Dev only:** `MIGRATION_STATE_ERROR` in `development` is downgraded to READY with `this.warning` set (`:73-77`), returned to boot and logged after "booted" (`boot-steps.ts:67,637-639`).
  - **Anything else** (connection error, lock, state error in production): wrapped as `InternalServerError`, sent to Sentry, thrown → boot fails (`:79-90,132-144`). `check`.
  - Then `databaseInfo.init()` (`boot-steps.ts:64-65`): on MySQL one `SELECT version()` on Ghost's own knex, cached on the singleton; on SQLite reads the driver version (`@tryghost/database-info/lib/DatabaseInfo.js:26-68`; singleton `ghost/core/server/data/db/info.js:1-4`). `load`.
  - `other` — `bootLogger.log('database ready')` (`boot-steps.ts:572`).
- Does anything depend on this running inside the Ghost process? **No pool dependency.** knex-migrator never touches Ghost's pool: every call creates and destroys a private connection (`knex-migrator/lib/index.js:83,273,328,450,560,611`). The migration `shutdown` hooks destroy Ghost's `db.knex` **only** when `executedFromShell === true` (`ghost/core/server/data/migrations/hooks/init/shutdown.ts:6-19`, `.../migrate/shutdown.ts:9-11`), never in-process. What _is_ in-process: `databaseInfo.init()` (the cached engine/version, read by `ghost/core/server/api/endpoints/utils/public-config/config.js:55`), the dev-only in-development tables, the `databaseWarning` handed to `ready`, and migration files that `require` Ghost modules in this process.
- **The `initKnexInstrumentation` comment, verified:** the comment (`boot-steps.ts:587-590`) says the pool "is destroyed and recreated before then" by `initLegacyCore`. `initLegacyCore` no longer exists, and the database step does **not** do it. The destroy/recreate is real but lives in the **settings** start: `Settings.populateDefaults()` runs `await ghostBookshelf.knex.destroy(); await ghostBookshelf.knex.initialize();` unconditionally on every start (`ghost/core/server/models/settings.js:350-352`), and `ghostBookshelf.knex` is the foundation's handle (`ghost/core/server/models/base/bookshelf.js:6,10` → `ghost/core/server/data/db/connection.ts:7`). knex `destroy` sets `client.pool = undefined` and `initialize` builds a new `KnexPool` (`knex/lib/client.js:408-422,519-524`), so listeners put on `knex.client.pool` earlier are lost — `instrumentKnex` puts six there (`@tryghost/prometheus-metrics/build/PrometheusClient.js:325-343`). So the real constraint is "knex instrumentation after the `settings` shared module", which `ghost/bootstrap/services.ts:50` satisfies. Listeners on the knex instance itself (`knex.on('query')`, as query tracing uses) are not on the pool and are not affected (inferred from knex source, not run).
- Reads at start: none beyond foundation (config, db handle, logging, metrics, sentry).
- Stop: none.
- Class reason: F — schema initialisation and migration are done inside the serving process's boot, with the HTTP server already listening in maintenance mode. The D part is the _check_: Ghost must not serve against a schema that is behind or ahead (every model query would be wrong). `databaseInfo.init` is C: one query whose result is needed only by the public-config endpoint; it could run on first read (it already swallows its own errors, `DatabaseInfo.js:57-59`).
- Confidence: inferred
- Not determined: what `knexMigrator.init()`/`migrate()` do internally beyond their connection handling (not read); whether any individual migration uses Ghost's own `db.knex` rather than the migrator's transaction.

##### query tracing — class B (A unless `sentry.tracing.enabled`)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:579` (database.after, `ghost/bootstrap/app.ts:100`)
- Effects:
  - `subscribe` — only when Sentry is configured and tracing enabled: `Sentry.addIntegration(new SentryKnexTracingIntegration(knex))` (`ghost/core/shared/sentry.js:138-144`), whose `setupOnce` adds `query`, `query-response`, `query-error` listeners on the knex instance (`ghost/core/shared/sentry-knex-tracing-integration.js:34-61`). Otherwise `initQueryTracing` is a no-op (`sentry.js:159`).
- Reads at start: none beyond foundation (db handle via `data/db/connection`, config).
- Stop: none (a repeated start adds the integration again; not checked whether Sentry de-duplicates by id).
- Class reason: a fixed subscription on the db handle. It does not need the database to be _ready_ — the handle exists from `startFoundation()` — so its place after the database step is habit. Queries before it is attached (the Ghost-knex ones in the database step) are simply not traced.
- Confidence: inferred
- Not determined: when Sentry calls `setupOnce` for an integration added after `init`.

##### adapter manager `init()` (framework) — class C (pure `check`)

- Root/step: `foundry/src/application.ts:394-397`, after the database step and its `after` slots, before `shared.before`. Implementation `foundry/src/adapter-manager/adapter-manager.ts:200-247`.
- Effects:
  - `wire` — first read of `adapters()` builds the manager: requires `ghost/bootstrap/adapters.ts` (imports the 8 base-class packages, `:1-8`) and `services/adapter-manager/config` (`ghost/bootstrap/app.ts:63-75`); constructor rejects a type name containing `:` (`adapter-manager.ts:60-69`).
  - `check` — builds the list of names: every registered type (storage, scheduling, sso, cache, redirects, route-settings, jobs, upgrade — `ghost/bootstrap/adapters.ts:20-29`) plus every configured feature `type:feature` (`adapter-manager.ts:204-210`; a feature is any key other than `active` whose value is a string or an object with `adapter`, `kernel/src/adapter-manager/options.ts:74-90`); de-duplicates by type + class name + JSON of its config (`:214-225`); names with no class configured are skipped (`:217-219`).
  - `load` (import) — for each distinct one, `loadAdapter(name)` **requires the adapter module** from the lookup paths (`adapter-manager.ts:231`, `loader.ts:385-433`; reads `package.json` for absolute paths, `loader.ts:312-354`). Failures here: unknown type, class not found in any path, missing dependency inside the adapter, a module that throws on load.
  - `check` — calls the class's static `validate(adapterConfig)` if it has one (`adapter-manager.ts:232-234`). Present on: `AdapterCacheMemoryTTL`, `AdapterCacheRedis`, `S3Storage`, `S3RedirectsStore`, `S3RouteSettingsStore`, route-settings `FileStore`, `HttpUpgradeAdapter` (`ghost/core/server/adapters/**`, e.g. `storage/S3Storage.ts:167`).
  - All failures are collected and thrown as one `IncorrectUsageError` → start rejects (`adapter-manager.ts:240-246`).
  - It does **not** instantiate any adapter, and does not check base-class inheritance or `requiredFns` — those are checked in `getAdapter` on first use (`adapter-manager.ts:116-139`).
- Reads at start: none beyond foundation (config, read fresh through `getConfig`, `ghost/bootstrap/app.ts:72-73`).
- Stop: none.
- Class reason: its only purpose is to move a misconfiguration failure from first use to boot. Nothing a first request needs is produced. It needs config only, so it does not depend on the database step it sits behind; it could run at foundation time, or at deploy time (`bin/validate-adapters` already exists per `ghost/bootstrap/adapters.ts:17-18`). Risk of dropping it: a bad storage/cache config surfaces on the first upload/read instead of at boot.
- Confidence: inferred
- Not determined: what each adapter's `validate` checks; `resolveAdapterOptions` (`kernel/src/adapter-manager/options.ts`) was not read beyond `getConfiguredFeatures`.

##### foundation checks (`applyImageUploadConfig`) — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:73` (shared.before, `ghost/bootstrap/app.ts:103`)
- Effects:
  - `register` — computes the libvips loaders allowed for the configured `uploads.{images,thumbnails,icons}.extensions` (PNG and SVG always allowed) and hands the list to `@tryghost/image-transform` via `setAllowedDecoders` (`ghost/core/server/lib/image/image-upload-config.ts:19-22`, `ghost/core/server/lib/image/image-decoders.ts:12-38`). That only stores the list (`packages/image-transform/src/index.ts:35-43`); sharp is not loaded, the block is applied when sharp is first obtained.
  - `other` — logs a warning for configured content types that are not image types (`image-upload-config.ts:24-31`). It does not throw: despite the step's name it is not a `check` that can fail boot.
- Reads at start: none beyond foundation (config `uploads`).
- Stop: none.
- Class reason: config-only declaration of a fixed list. It has no order dependency on anything in boot except "before the first image is processed": if it had not run, sharp would decode with every loader (a security restriction silently absent). It could be pulled by image-transform on first sharp load instead.
- Confidence: inferred
- Not determined: nothing

---

#### Shared list

How the shared step starts a root: `root.init({foundation, ...needs})` in list order (`foundry/src/application.ts:316-333`); `defineService` calls `create` once per process and `start` on each init (`kernel/src/define-service.ts:60-70`).

##### legacy: url utils — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:93` → `require('ghost/core/shared/url-utils')`
- Effects:
  - `wire` (on import) — `new UrlUtils({...})` from config getters and config values, frozen (`ghost/core/shared/url-utils.ts:5-19`)
- Reads at start: none beyond foundation (config).
- Stop: none.
- Class reason: built from config alone at import; the entry exists only to time the load (`ghost/bootstrap/shared.ts:25-26` says so). It is in fact **already loaded** two steps earlier by the http-server step (`ghost/core/app.js:5` → `services/url/lazy-url-service.ts:4`), so this entry is a no-op `require` on this branch.
- Confidence: inferred
- Not determined: nothing

##### limits — class A (config-only load; no I/O)

- Root/step: `ghost/shared/limits/index.ts:17-20`
- Effects:
  - `wire` — `create`: `new LimitService()` (`ghost/shared/limits/index.ts:18`)
  - `load` (config only) — `start`: `loadHostLimits` reads `hostSettings:billing`, `hostSettings:subscription`, `hostSettings:limits` and calls `limits.loadLimits({...db: foundation.database})` (`ghost/shared/limits/host-limits.ts:16-36`), which only constructs limit objects holding the db handle (`packages/limit-service/src/limit-service.ts:23-73`). No query. An `IncorrectUsageError` (bad limit config) is logged, not thrown (`host-limits.ts:37-43`).
- Reads at start: none beyond foundation (config, database handle, logging).
- Stop: none.
- Class reason: builds objects from config; could be built on first use. Caveat that already exists today: about 18 modules import the legacy alias `ghost/core/server/services/limits.ts` at load time, and that alias silently answers from an **empty** limit service until the shared root has started (`ghost/core/server/services/limits.ts:20-33`) — a read before start returns "not limited" rather than failing.
- Confidence: inferred
- Not determined: nothing

##### settings-transition — class A

- Root/step: `ghost/shared/transition/settings/index.ts:10`
- Effects:
  - `wire` — returns an object of getters/closures; nothing is required or called until settings uses it (`ghost/shared/transition/settings/legacy-dependencies.ts:12-31`)
- Reads at start: none.
- Stop: none.
- Class reason: starts nothing; exists so `settings` can name it in `needs`.
- Confidence: inferred
- Not determined: nothing

##### settings — class D (contains an F part: making the site private; and a hidden side effect: recreating the db pool)

- Root/step: `ghost/shared/settings/index.ts:20-23`; work in `ghost/shared/settings/start-settings.ts:156-162`
- Effects, in order (`loadSettings`, `start-settings.ts:107-153`):
  1. `other` — wraps everything in a tracing span `settings.init` (`:114`; `ghost/core/server/lib/tracing` via `legacy-dependencies.ts:27`) and logs `settings.init.started` (`:115`).
  2. `load` — gets the cache adapter: `adapterManager.getAdapter('cache:settings')` → instantiates the configured cache adapter (`start-settings.ts:118`, `legacy-dependencies.ts:23-24`).
  3. `load` + **db write** — `SettingsModel.populateDefaults()` (`start-settings.ts:120`):
     - `other` — **destroys and re-initialises the foundation's knex pool** on every start (`ghost/core/server/models/settings.js:350-352`, "required for sqlite to pick up the columns after db init"). This is the source of the knex-instrumentation ordering constraint (see the database entry).
     - reads all settings rows (`:354`); for every key in default-settings missing from the DB, reads `columnInfo` and `batchInsert`s the default (`:356-391`). Uses raw knex, so no model events fire.
     - First touch of `require('../../../core/server/models')` from this module (`legacy-dependencies.ts:14-16`) — already loaded by the http-server step.
  4. **db write, product decision** — `enforcePublicSiteAccessLimit` (`start-settings.ts:38-63,122`): if `limits.isDisabled('publicSiteAccess')`, reads `is_private` and `password` rows and, if needed, `SettingsModel.edit`s `is_private = true` and a newly generated access code (`:46-62`). `Settings.edit` goes through the model, so model events fire on the legacy bus (before the cache has subscribed; harmless because the cache is filled from a fresh read next).
  5. `load` — `SettingsModel.findAll(internal)` (`:127`): every settings row.
  6. `load` + `subscribe` — `cache.init(events, settings, calculatedFields, cacheStore, overrides)` (`:132-138`) → `ghost/core/shared/settings-cache/cache-manager.js:275-301`:
     - stores `cacheStore` and the overrides; `reset(events)` clears the store and removes the previous listeners (`:276-279,308-331`)
     - writes every row into the store (`:281-284`)
     - `subscribe` (legacy string bus `core/server/lib/common/events`): `settings.edited`, `settings.added`, `settings.deleted` (`:289-291`)
     - **computes each calculated field now** and stores it (`:295`), then `subscribe`s `settings.<dependent>.edited` for each of its dependents (`:296-298`)
     - overrides come from `hostSettings:settingsOverrides`, plus `transistor: false` when `hostSettings:limits:customIntegrations:disabled` (`start-settings.ts:21-31`); applied at read time (`cache-manager.js:129-140`).
     - `transition.calculatedFields()` requires `ghost/core/server/services/settings/settings-service` (`legacy-dependencies.ts:25-26`), which **on import** loads models, `shared/labs`, the limits alias, `lib/mail`, `members/single-use-token-provider`, `shared/url-utils`, `settings-helpers`, `email-address` (`ghost/core/server/services/settings/settings-service.js:5-21`). None of those is initialised by the import (email-address is an un-inited wrapper, `ghost/core/server/services/email-address/index.js:1-3`).
  7. `check` — `validateSiteUuid`: if config `site_uuid` and the stored one differ (case-insensitive), log and throw `SITE_UUID_MISMATCH` → boot fails (`start-settings.ts:69-88,146-151`).
  8. **db write** — `syncEmailSettings`: if `hostSettings:emailVerification:verified === true` and the cached `email_verification_required` is truthy, edits it to `false` (`start-settings.ts:91-101,158-161`).
- Calculated settings — what each reads when computed at start (all via the `settings-helpers` singleton, built on import from settings cache, url utils, config, labs, limits alias: `ghost/core/server/services/settings-helpers/index.js:1-8`):

  | key (`settings-service.js`)                                                        | fn                          | reads                                                                                                                           |
  | ---------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | `members_enabled` (:152), `members_invite_only` (:161), `allow_self_signup` (:170) | `settings-helpers.js:23-32` | settings cache `members_signup_access`                                                                                          |
  | `paid_members_enabled` (:179), `donations_enabled` (:203)                          | `:81-87,181-183`            | settings cache stripe keys, config `stripeDirect`, `enableTipsAndDonations`                                                     |
  | `firstpromoter_account` (:194)                                                     | `:89-93`                    | settings cache                                                                                                                  |
  | `default_email_address` (:219)                                                     | `:151-175`                  | config `mail:from`; if missing, **url utils** `urlFor('home')` (`:108`) and config managed-email                                |
  | `support_email_address` (:227)                                                     | `:128-145`                  | settings cache `members_support_address`, config, possibly **url utils**                                                        |
  | `all_blocked_email_domains` (:237)                                                 | `:219-221`                  | config `spam:blocked_email_domains`, settings cache                                                                             |
  | `social_web_enabled` (:248)                                                        | `:241-270`                  | settings cache `social_web`, `is_private`; **limits** `limitSocialWeb` (`:255`); **url utils** subdir and site url (`:263,270`) |
  | `web_analytics_enabled` (:259), `web_analytics_configured` (:267)                  | `:291-323`                  | settings cache `web_analytics`; config `tinybird`; **limits** `limitAnalytics` (`:318`)                                         |

  `labs` is injected into settings-helpers (`settings-helpers.js:19`) and named as a _dependent_ of three fields, but no calculated-field function reads labs. No calculated field reads members, Stripe or any other service.

- Reads at start:
  - limits — `limits.isDisabled('publicSiteAccess')` (`start-settings.ts:42`) — movable: no for the write (it decides whether to write before the cache is built); it is the one real order dependency the shared list comment names (`ghost/bootstrap/shared.ts:12-14`).
  - limits (via alias) — `limitSocialWeb`, `limitAnalytics` in calculated fields (`settings-helpers.js:255,318`) — movable: yes, if calculated fields were computed on read instead of eagerly at `cache-manager.js:295`. Not in `needs`: reached through the legacy alias, which works only because limits started earlier (otherwise the empty stand-in answers "not disabled", silently).
  - url utils — in calculated fields (`settings-helpers.js:108,263,270`) — movable: same as above; config-only, effectively foundation.
  - adapter manager — `getAdapter('cache:settings')` (`start-settings.ts:118`) — foundation-like (framework-owned, config only).
  - foundation: config, logging, models registry, legacy event bus, tracing.
- Stop: none. Listeners are removed by the next `cache.init` (`cache-manager.js:279`), not by a `stop`.
- Class reason: D — almost everything reads the settings cache synchronously (`settingsCache.get`), and before `init` it returns `undefined` for every key without failing (`cache-manager.js:125-127`), so a first request would be served with no title, no keys, members "enabled" by default comparisons, etc. A synchronous cache over an async store has to be filled before serving. Also the three subscriptions must exist before any settings edit. What is _not_ inherently boot work: (F) `populateDefaults` inserts rows — a data migration by another name; (F) forcing the site private from a host limit — a product decision written to the database during boot; (F) `syncEmailSettings`; the knex pool destroy/recreate (an SQLite workaround run on every start, MySQL included); and the `site_uuid` check (a `check` that needs only one row).
- Confidence: inferred
- Not determined: what the configured `cache:settings` adapter does on construction (default adapter not read); `lib/tracing` not read; import-time effects of `shared/labs`, `lib/mail`, `single-use-token-provider` not read.

##### signing-keys — class C (with an F-ish part: key rotation run from boot)

- Root/step: `ghost/core/server/services/signing-keys/index.ts:16-32` (create only; no `start`/`stop`)
- Effects:
  - `wire` — `new SigningKeyService({settingsCache, Settings, transaction, logging, onRotationStarted})` (`index.ts:19-27`)
  - `load` + possible **db write** — `await instance.check()` (`index.ts:28`; `ghost/core/server/services/signing-keys/signing-key-service.ts:171-181`). For `members` and `staff`: reads key state from the settings cache (`:260-274`); `retirePrevious` clears a previous public key past its 2 h grace (`:305-322`); `promoteNext` swaps in a published next key after 48 h (`:324-350`); and if the active key is shorter than 2048 bits with no next key, `rotate` **generates an RSA keypair** and stores it as the next key (`:176-179,187-200`). Each write is a transaction with `forUpdate` reads and `Settings.edit` (`:280-303`). On an ordinary start with nothing due there is no DB access at all — only cache reads and two `crypto.createPrivateKey` calls.
  - `schedule` — none at start: `onRotationStarted → schedule()` returns immediately because no jobs service has been handed over yet (`index.ts:46-49`); the recurring check job is scheduled later from the background list (`ghost/bootstrap/transition/background-steps.ts:63`).
- Reads at start: settings cache — key rows with `{resolve:false}` (`signing-key-service.ts:263`) — movable: already lazy for _use_ (every `getSigningKey`/`getJwks` re-reads the cache per call, `:218-274`; the service holds no key state). Only `check()` reads at start. Also models (foundation).
- Stop: none.
- Class reason: the service is stateless over the settings cache, so building it on first use changes nothing for signing or JWKS. The comment "must be ready before anything signs or serves a JWKS" (`ghost/bootstrap/shared.ts:39`) is satisfied by _settings_ being loaded, not by this root. What `check()` at boot buys is that a due rotation step is applied before the first token is signed rather than at the next hourly job — work that already belongs to `CheckSigningKeysJob`. Change: drop `check()` from `create` (or run it in the background list next to `scheduleCheckJob`). Risk: after a restart, a due promotion/retirement happens up to an hour later; a legacy short key starts rotating later. Uncertainty: whether the job is only scheduled when `isRotating()` (`index.ts:39-42`) covers the "legacy key, not yet rotating" case — it does (`signing-key-service.ts:203-208` counts a short active key as rotating), but then the _first_ rotation would depend on that job rather than boot.
- Confidence: inferred
- Not determined: `CheckSigningKeysJob` body not read.

##### internal-keys — class A

- Root/step: `ghost/core/server/services/internal-keys/index.ts:34-49`
- Effects:
  - `wire` — `new AutoFillingMap(slug => models.Integration.getApiKeyBySlug(...))`; no query until a slug is first asked for (`index.ts:46-48`, comment `:35-36`)
- Reads at start: none beyond foundation (models registry).
- Stop: none.
- Class reason: already lazy inside; the root only has to exist. It sits in the ordered list only because `.service` throws before `init()` (`kernel/src/define-service.ts:89-96`).
- Confidence: inferred
- Not determined: `AutoFillingMap` not read (assumed to fill on `get`, per its name and the comment).

##### legacy: i18n — class C (load + B subscription)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:100` → `ghost/core/shared/i18n/index.js:30-52`
- Effects:
  - `load` — `i18n(locale, 'ghost')` builds an i18next instance and reads the locale's `ghost.json` from disk synchronously (`ghost/core/shared/i18n/index.js:36-38`; `packages/i18n/src/file-loader.ts:19-31`, `packages/i18n/src/i18n-core.ts:75-118`)
  - `subscribe` — legacy string bus: `settings.locale.edited` → `changeLanguage` (`ghost/core/shared/i18n/index.js:46-51`); a repeated init removes the previous listener first (`:42-44`)
- Reads at start: settings cache — `settingsCache.get('locale')` (`ghost/core/shared/i18n/index.js:36`) — movable: yes: build the instance on the first `t()`/`dir()` call (the exported functions already go through the module-level instance, `:7-20`) and read the locale then.
- Stop: none.
- Class reason: nothing needs the translator before the first `t()` call; today `t()` asserts if init has not run (`:18`). Change: lazy-create inside `t/dir/changeLanguage`. Risk: first translated response pays one small file read; the `settings.locale.edited` subscription must still be declared at boot (or made unnecessary by reading the locale per call), otherwise a locale edit before first use is missed — harmless here, since a lazily built instance would read the current locale anyway.
- Confidence: inferred
- Not determined: `i18n-core.ts` read only by grep (which files i18next loads for the `ghost` namespace beyond the active locale and the English fallback).

##### legacy: email address policy — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:111` → `ghost/core/server/services/email-address/email-address-service-wrapper.js:7-43`
- Effects:
  - `wire` — `new EmailAddressService({...})` with closures over config and `settingsHelpers` (`email-address-service-wrapper.js:19-42`); the constructor only stores them (`ghost/core/server/services/email-address/email-address-service.ts:31-53`). Idempotent (`:8-10`).
  - (on import) requires `shared/labs`, `settings-helpers`, `@tryghost/validator` — all already loaded by the settings start.
- Reads at start: none. Settings helpers, config and labs are read only inside getters when an address is asked for — already lazy. (`labs` is passed to the constructor but the constructor's parameter list does not take it, `email-address-service.ts:31-39`.)
- Stop: none.
- Class reason: pure construction; could be built on first `.service` read. It is in the ordered list because consumers read `emailAddressService.service` as a plain property that is `undefined` until `init()` — a missing lazy getter, not an order requirement.
- Confidence: inferred
- Not determined: nothing

---

#### Extra

##### (a) Modules that read the settings cache, labs or limits at import time in `ghost/core`

**Heuristic count: 0.** This is a grep heuristic, not a proof. Command (run in `ghost/core`):

```
grep -rnE "^[^ \t/*].*\b([sS]ettingsCache\.get[A-Za-z]*\(|labs(Service)?\.isSet\(|limitService\.[a-zA-Z]+\(|limits\.(isDisabled|isLimited)\()" \
  --include=*.js --include=*.ts server shared frontend app.js bridge.js | grep -v '\.test\.'
```

It matches a read call on an **unindented** line (top-level statement). It returned no lines. A stricter variant restricted to `const|let|var|module.exports|exports.|export` assignments also returned 0. What it cannot see: a read on an indented continuation line of a multi-line top-level expression (e.g. inside a top-level `new X({ a: settingsCache.get(...) })` or an object literal), class static initialisers, reads through other names (`settingsHelpers.*`, `settings.get`, destructured `isSet`), and reads made by a function that is _called_ at top level. One real import-time read of _config_ (not settings) was seen while reading: `ghost/core/shared/sentry.js:3`, `ghost/core/shared/prometheus-client.js:6`, `ghost/core/shared/url-utils.ts:5-19`.

What does happen at import time is _holding the reference_: files with a top-level import of each (same directories, heuristic `grep -rlE "^(const|import|let|var) .*<suffix>"`): settings-cache 64, `shared/labs` 31, the limits alias 18. Those are safe before start only because the cache returns `undefined` before init (`ghost/core/shared/settings-cache/cache-manager.js:125-127`) and the limits alias forwards to an empty service (`ghost/core/server/services/limits.ts:20-33`) — i.e. an early read is silently wrong rather than an error.

##### (b) `ghost/core/server/services/url` at boot

**No init at boot, and no "build" at all on this branch.** The module exports a singleton `new LazyUrlService({findResource: createFindResource(models)})` created on import (`ghost/core/server/services/url/index.js:1-7`); its constructor only stores dependencies and builds static filter tables (`ghost/core/server/services/url/lazy-url-service.ts:207-226`). There is no `init`, no resource fetch, no event subscription, no cache: URLs and ownership are computed per call from the registered router configs; only `resolveUrl` and `getRoutableResources` touch the database, per call (`lazy-url-service.ts:186-191,345-355,426`).

- First import: the http-server step, via `ghost/core/app.js:5` (so the model registry loads there).
- The only boot-time state it gains is router registrations: `RouterManager` calls `urlService.onRouterAddedType(...)` for each router with permalinks (`ghost/core/frontend/services/routing/router-manager.js:47-52`), which sets `routersReady = true` (`lazy-url-service.ts:228-242`). That happens in the `dynamic routing` legacy step (`ghost/bootstrap/transition/boot-steps.ts:262-284`, `routeSettingsModule.service.start({routerManager, urlService})`), outside my entries.
- `hasFinished()` returns `routersReady` (`lazy-url-service.ts:336-338`) and is the third condition of the maintenance middleware (`ghost/core/app.js:18`). So what "triggers" the URL service being usable is the first router registration, not a build; and a routes.yaml reload calls `reset()` (`ghost/core/bridge.js:130`), which re-gates the site with 503s until routers re-register.
- Consequence for ordering: URL _generation_ for a resource needs the router configs, so anything that builds resource URLs before `dynamic routing` gets `/404/` (the step's own comment, `boot-steps.ts:257-260`). Nothing in my entries does.

### Part 2: service roots, better-auth to stats

Paths are relative to the repo root. All roots use `defineService` (`kernel/src/define-service.ts:37`). None of the 14
passes a `start` or `stop` hook: each passes only a `create` function, so `root.stop()` is a no-op for all of them
(`kernel/src/define-service.ts:82-89` calls `lifecycle.stop?.`, which is undefined).

Note on `urlUtils`: `ghost/core/shared/url-utils.ts:5-21` builds a module singleton from `config` at import. Reads of it
are listed as order dependencies as the brief asks, but it depends on config only, not on any started service.

Note on `limitService`: `ghost/core/server/services/limits.ts:35` exports a Proxy that forwards each property access to
the shared limits instance at time of use. Capturing it in a constructor is already lazy.

---

##### better-auth — class C

- Root/step: `ghost/bootstrap/services.ts:25-29`; root `ghost/core/server/auth/better-auth/index.ts:11`
- `when` condition: `ghost/core/server/auth/index.ts:8-10` — `config.get('auth:engine') === 'better-auth'`. Decided by
  config only; `ghost/core/shared/config/schema.ts:11-22` (`legacyAuthOnSqlite`) rewrites the engine to legacy when the
  database client is SQLite. The same getter is read at import by many endpoint modules
  (`api/endpoints/session.ts:14`, `users.js:13`, `settings.js:13`, `authentication.ts:19`,
  `members-stripe-connect.js:7`, `web/api/endpoints/admin/routes.js:22`, `auth/authenticate.ts:70`), so it is fixed per process.
- Effects:
  - `wire` — `createAuth(...)` builds the Better Auth instance: Knex adapter, plugins, hooks, cookie options (`ghost/core/server/auth/better-auth/index.ts:21-58`, `create-auth.ts:97-273`, `knex-adapter.ts:475-505`)
  - `wire` — `new GhostMailer()` builds a nodemailer transport from `config.get('mail')` (`index.ts:48`, `ghost/core/server/lib/mail/ghost-mailer.*:118-140`)
  - `check` — `await auth.$context` (`index.ts:60`): awaits Better Auth's deferred setup so a bad setup fails boot. In `better-auth@1.7.22` `dist/context/init-minimal.mjs` + `create-context.mjs` this resolves the adapter, trusted origins and plugin `init` hooks; the awaits I saw are not database queries, and migrations throw in minimal mode. Plugin `init` in `plugins/staff-lifecycle.ts:100` only stores the context.
  - No subscribe, register, schedule or listen. The limiter factories from `web/shared/middleware/api/spam-prevention.ts` are passed as functions and called per request (`rate-limit.ts:59-79`). The expired-row cleanup job (`cleanup.ts:67`) is not called from this root.
- Reads at start:
  - settings cache — `settingsCache.get('admin_session_secret')` (`index.ts:23`), captured as `secret`/`secrets` (`create-auth.ts:111-112`) — movable: not as a getter (Better Auth takes a string), but the whole build could move to first use
  - urlUtils — `getAdminOrigin()`, `isSSL()`, `getSubdir()` (`create-auth.ts:101,103,108,256,265`), captured — movable: only by building later (config-derived)
  - foundation: `config.get('admin:sessionMaxAgeMs')` (`index.ts:24`), knex (`index.ts:15`), logging
  - already lazy: `require_email_mfa`, `title`, `security:staffDeviceVerification`, `blogIcon`, `auth/session`, `auth/passwordreset`, `api.endpoints` (closures, `index.ts:38-57`)
- Stop: none
- Class reason: only wires plus one self-check, but it captures a setting, so it must follow settings. It could be built on first use; the change is to mount the router lazily (see consumer below) and accept that a bad secret/setup fails the first auth request, not boot. `create` is async only for the `$context` await.
- Reverse (who reads `betterAuth.service`):
  - (ii) `ghost/core/server/web/api/endpoints/admin/app.js:28` — `betterAuthRouter(auth.betterAuth.service)` while the Admin API Express app is built (legacy express apps step). This is the proven reason the root precedes that step.
  - (iii) 4: `api/endpoints/session.ts:27`, `auth/authenticate.ts:49`, `auth/better-auth/staff-sessions.ts:67`, `auth/better-auth/stripe-connect-state.ts:84` (all inside closures)
- Confidence: inferred
- Not determined: `createAuthContext` in the dependency was skimmed, not read line by line; `betterAuthRouter` (`web/api/endpoints/admin/better-auth.*`) not read.

##### gift-links — class A

- Root/step: `ghost/bootstrap/services.ts:30`; root `ghost/core/server/services/gift-links/index.ts:6`
- Effects:
  - `wire` — `new GiftLinksService({knex, actionLog: new ActionLog()})` (`index.ts:7-8`); constructor stores two fields (`service.ts:33-36`)
- Reads at start: none beyond foundation (knex, `index.ts:7`)
- Stop: none
- Class reason: stores a knex handle and an action log. Could be built on first use.
- Reverse: (i) none, (ii) none, (iii) 5 (`api/endpoints/gift-links.ts:34,47,60,71`; `api/endpoints/utils/gift-link-access.ts:45`). List position proves nothing.
- Confidence: inferred
- Not determined: nothing

##### app-installations — class C (A plus one config check)

- Root/step: `ghost/bootstrap/services.ts:33-36`; root `ghost/core/server/services/app-installations/index.ts:87`
- Effects:
  - `check` — `appsConfig()` parses `config.get('apps')` with zod and throws `InternalServerError` (`APP_CONFIG_INVALID`) on a bad `trustedOrigins`/`localhostAlias`, deliberately failing boot (`index.ts:90`, `index.ts:64-74`)
  - `wire` — fetcher, manifest loader, identity checker, icon fetcher and service are closures/objects (`index.ts:94-119`; `fetch-from-app.ts:113`, `load-manifest.ts:74`, `identity-check.ts:112`, `fetch-icon.ts:70`, `service.ts:174-193`, `app-installations-repository.ts:181`)
- Reads at start: none beyond foundation (config, knex, logging, `lib/request-external`). `urlUtils.urlFor` and the apps config are read per use inside closures (`index.ts:99-102,112-115`) — already lazy
- Stop: none
- Class reason: everything is wiring except the config check. To make it lazy, move the apps-config validation into config validation (or a declared check); otherwise a bad `apps` config fails the first app request, not boot.
- Reverse: (i) none, (ii) none, (iii) 7 (`api/endpoints/app-sessions.ts:20`, `app-installation-previews.ts:26`, `app-installations.ts:62,72,83,95,110`). List position proves nothing.
- Confidence: inferred
- Not determined: nothing

##### export-requests — class A

- Root/step: `ghost/bootstrap/services.ts:37-40`; root `ghost/core/server/services/export-requests/index.ts:4`
- Effects:
  - `wire` — `new ExportRequestsService({config, logging, request})` (`index.ts:9`); constructor stores three fields (`export-requests-service.ts:32-36`); config is read per call (`export-requests-service.ts:38-44`)
- Reads at start: none beyond foundation
- Stop: none
- Class reason: pure wiring.
- Reverse: (i) none, (ii) none, (iii) 1 (`api/endpoints/exports.js:195`).
- Confidence: inferred
- Not determined: nothing

##### invites — class A

- Root/step: `ghost/bootstrap/services.ts:41`; root `ghost/core/server/services/invites/index.ts:7`
- Effects:
  - `wire` — `new Invites({...})` and `new InvitationLimiter({...})` (`index.ts:16-32`); constructors store references only (`invites.ts:93-109`, `invitation-limiter.ts:18-20`)
- Reads at start: none. It captures the module objects `settingsCache`, `settingsHelpers`, `mailService`, `urlUtils`, `limitService` (Proxy) and `models` but calls nothing on them; `config.get` is inside `getPeriodStart` (`index.ts:27-30`) — already lazy
- Stop: none
- Class reason: pure wiring.
- Reverse: (i) none, (ii) none, (iii) 2 (`api/endpoints/authentication.ts:223`, `api/endpoints/invites.js:98`). `authentication.ts:29` is a type position only.
- Confidence: inferred
- Not determined: nothing

##### integrations — class A

- Root/step: `ghost/bootstrap/services.ts:42`; root `ghost/core/server/services/integrations/index.ts:3`
- Effects:
  - `wire` — `createIntegrationsService({IntegrationModel, ApiKeyModel})` (`index.ts:7-10`); constructor stores two models (`integrations-service.js:9-12`)
- Reads at start: none beyond foundation (models)
- Stop: none
- Class reason: pure wiring.
- Reverse: (i) none, (ii) none, (iii) 1 (`api/endpoints/integrations.js:79`).
- Confidence: inferred
- Not determined: nothing (factory is `new IntegrationsService(...)`, `integrations-service.js` last lines)

##### stripe-checkout-config — class C

- Root/step: `ghost/bootstrap/services.ts:43-46`; root `ghost/core/server/services/stripe-checkout-config/index.ts:38`
- Effects:
  - `check` — throws `IncorrectUsageError` if `metafields.bindings`/`metafields.fields` are unset (`index.ts:43-47`)
  - `wire` — four services built from closures and references (`index.ts:50-78`; `service.ts:278-300`, `checkout-service.ts:66`, `preview-service.ts:44`, `branding-service.ts:31`)
- Reads at start:
  - members-metafields — `metafields.bindings`, `metafields.fields` module variables, captured by value (`index.ts:43,53-54`). These are `export let` set by the legacy members metafields step (`ghost/core/server/services/members-metafields/index.ts:45,48`) — movable: yes, pass `() => metafields.bindings` / `() => metafields.fields` getters, as `requirements` already is
  - foundation: knex (`index.ts:39`), logging
  - already lazy: tiers (`index.ts:56,67`), stripe (`index.ts:66,74-75`), members (`index.ts:69-70`), urlUtils (`index.ts:71`), labs (`checkout-service.ts:110`)
- Stop: none
- Class reason: wiring that captures two values from another service. The services.ts comment ("read member metafields while they start") is true and is the only real order dependency; it disappears if the two values become getters. Nothing needs the result before first use.
- Reverse (who reads `.service`):
  - (ii) `ghost/bootstrap/transition/boot-steps.ts:319-320` — `initLegacyServicesFirst` takes `.service.checkouts` and passes it to `giftService.init` (`boot-steps.ts:327-332`)
  - (ii) `ghost/core/server/services/members/api.js:299` — `checkouts: stripeCheckoutConfig.service.checkouts` inside `createApiInstance`, called from members `init()` (`members/service.js:171`)
  - (iii) 4 (`api/endpoints/stripe-checkout-preview.ts:24`, `stripe-checkout-branding.ts:16`, `stripe-checkout-config.ts:27,37`)
  - Both (ii) cases capture `checkouts`; both could take a getter.
- Confidence: inferred
- Not determined: `configRow(logging)` (`service.ts:299`) not read; assumed to build a codec.

##### link-redirection — class C (B for the subscription)

- Root/step: `ghost/bootstrap/services.ts:54-57`; root `ghost/core/server/services/link-redirection/index.ts:25`
- Effects:
  - `check` — `new URL(urlUtils.getSiteUrl())` throws on an invalid site URL before anything is registered (`index.ts:39`)
  - `load`/`other` — when `hostSettings:linkRedirectsPublicCache:enabled`, `adapterManager.getAdapter('cache:linkRedirectsPublic')` constructs (and caches) the cache adapter (`index.ts:44-46`; `foundry/src/adapter-manager/adapter-manager.ts:93-105`)
  - `subscribe` — only when that cache is enabled: legacy string bus `core/server/lib/common/events`, `site.changed` → `cache.reset()` (`link-redirect-repository.js:37-39`)
  - `wire` — `LinkRedirectRepository`, `LinkRedirectsService` (`index.ts:41-56`; `link-redirects-service.js:43-53`); module variable `linkRedirectRepository` set for `extras` (`index.ts:58`)
- Reads at start:
  - urlUtils — `getSiteUrl()` captured as `baseURL` (`index.ts:39,54`) — movable: could be a getter (config-derived)
  - adapter manager — `getAdapter` (`index.ts:45`) — movable: yes, on first cache use
  - foundation: config, models, domain-events bus object, legacy events bus object
- Stop: none. The `site.changed` listener is never removed.
- Class reason: wiring plus an optional subscription and an adapter build. Could be lazy by making `baseURL` and the adapter lookups getters and declaring the `site.changed` subscription. What is lost if the subscription did not exist until first use: `site.changed` events before first use would not reset the redirect cache; that matters only if the cache adapter keeps entries across processes (e.g. Redis), since an in-process cache is empty then anyway.
- Reverse (who reads `.service` / `.extras`):
  - (ii) `ghost/core/frontend/web/routers/link-redirects.js:5-6` — reads `.service.relativeRedirectPrefix()` and captures `.service.handleRequest` when the site Express app is built (`frontend/web/site.js:55`). Proven: the route path and handler are taken at mount.
  - (ii) `ghost/core/server/services/link-tracking/index.js:47,58` — `extras.linkRedirectRepository()` and `.service` captured in `#initialise`, run by `linkTracking.init()` in legacy services (`boot-steps.ts:403`)
  - (iii) 0
- Confidence: inferred
- Not determined: the cache adapter constructors (`ghost/core/server/adapters/cache/*`) were not read, so whether `getAdapter` opens a connection (Redis) is not established.

##### custom-theme-settings — class A

- Root/step: `ghost/bootstrap/services.ts:59-62`; root `ghost/core/server/services/custom-theme-settings/index.ts:5`
- Effects:
  - `wire` — `new CustomThemeSettingsService({model, cache})` (`index.ts:6-9`); constructor sets fields and builds a BREAD wrapper (`custom-theme-settings-service.js:22-33`)
  - (on import of `ghost/core/shared/custom-theme-settings-cache/index.js`) constructs the shared cache object — wire
- Reads at start: none beyond foundation (models). It captures the shared cache object without reading it.
- Stop: none
- Class reason: nothing happens at start. The database sync and cache fill happen in `activateTheme` (`custom-theme-settings-service.js:46-57`), which the legacy themes step calls, not this root.
- Reverse (who reads `.service`):
  - (i) none, (ii) none
  - (iii) 6: `services/themes/activation-bridge.js:13,19,25`, `services/themes/storage.js:112`, `api/endpoints/custom-theme-settings.js:13,23`
  - The services.ts comment is true only in this sense: `activateFromBoot` (`activation-bridge.js:13`, called from `themes/activate.js:40`) runs during the legacy themes step and reads `.service` at that moment, and the getter throws before `init()`. The read is at time of use; if the root were built on first use there would be no order requirement.
- Confidence: inferred
- Not determined: `custom-theme-settings-bread-service.js` constructor not read.

##### member-attribution — class C (near A)

- Root/step: `ghost/bootstrap/services.ts:80-83`; root `ghost/core/server/services/member-attribution/index.ts:8`
- Effects:
  - (on import) requires `../url`, which constructs `new LazyUrlService(...)` at module load (`index.ts:3`; `ghost/core/server/services/url/index.*:7`), plus url-utils, settings-cache, config (`index.ts:4-6`)
  - `wire` — `UrlTranslator`, `ReferrerTranslator`, `AttributionBuilder`, `OutboundLinkTagger`, `MemberAttributionService` (`index.ts:17-49`; constructors `url-translator.js:30`, `referrer-translator.js:26-31`, `attribution-builder.js:158`, `outbound-link-tagger.js:41`, `member-attribution-service.js:14-19`)
- Reads at start:
  - urlUtils — `urlFor('home', true)`, `urlFor('admin', true)` captured into `ReferrerParser` (`index.ts:28-29`, `referrer-translator.js:27-30`) — movable: could be getters (config-derived)
  - already lazy: `settingsCache.get('outbound_link_tagging')` (`index.ts:35`), `settingsCache.get('members_track_sources')` (`index.ts:48`), `config.getSiteUrl()` (`index.ts:36`); url service captured as an object, used per call
  - foundation: models
- Stop: none
- Class reason: wiring; the only read at start is two URLs derived from config. Could be built on first use with no visible change.
- Reverse (who reads `.service`):
  - (ii) `ghost/core/server/services/members/api.js:277` — captured in `createApiInstance` during members `init()` (`members/service.js:171`)
  - (ii) `ghost/core/server/services/staff/index.ts:49` — captured in Staff's create
  - (ii) `ghost/core/server/services/email-service/email-service-wrapper.js:96,98` — captured in the email service `init` (`.service` and `.service.outboundLinkTagger`)
  - (iii) 1 (`api/endpoints/utils/serializers/output/mappers/posts.js:129`)
  - All three (ii) consumers come later in the list; all capture the instance and could take a getter.
- Confidence: inferred
- Not determined: `ReferrerParser` constructor not read.

##### audience-feedback — class C (near A)

- Root/step: `ghost/bootstrap/services.ts:84-88`; root `ghost/core/server/services/audience-feedback/index.ts:10`
- Effects:
  - (on import) requires `../url` and `../../auth/permissions` (`index.ts:3-4`)
  - `wire` — `FeedbackRepository`, `AudienceFeedbackService`, `AudienceFeedbackController` (`index.ts:12-28`; constructors `feedback-repository.js:21`, `audience-feedback-service.js:14-17`, `audience-feedback-controller.js:34-38`)
- Reads at start:
  - urlUtils — `urlFor('home', true)` captured as `baseURL` (`index.ts:21`) — movable: could be a getter (config-derived)
  - foundation: models; url service and permissions captured as objects, used per call
- Stop: none
- Class reason: wiring; one config-derived URL captured. Could be built on first use.
- Reverse (who reads `.service`):
  - (ii) `ghost/core/server/services/email-service/email-service-wrapper.js:97` — `audienceFeedback.service.service` captured in the email service `init`. This is the services.ts comment; it is true, and a getter would remove it.
  - (iii) 3 (`web/members/app.js:155` inside the route handler; `api/endpoints/feedback-members.js:26,47`)
- Confidence: inferred
- Not determined: nothing

##### newsletters — class A

- Root/step: `ghost/bootstrap/services.ts:89-90`; root `ghost/core/server/services/newsletters/index.ts:7`
- Effects:
  - `wire` — `SingleUseTokenProvider` (`index.ts:16-21`; `members/single-use-token-provider.js:25-37`), `NewslettersService` (`index.ts:12-28`), whose constructor builds `new mail.GhostMailer()` (a nodemailer transport from `config.get('mail')`, `newsletters-service.js:61`, `lib/mail/ghost-mailer.*:118-140`) and `new MagicLink(...)` (`newsletters-service.js:100-108`, `lib/magic-link/magic-link.js:47-61`)
- Reads at start: none. Captures `urlUtils`, `limitService` (Proxy), `labs`, the `email-address` module and `sentry` as objects; they are used per call (`newsletters-service.js:93,160,246,338,368`) — already lazy
  - foundation: models, config (inside GhostMailer)
- Stop: none
- Class reason: pure wiring.
- Reverse (who reads `.service`):
  - (ii) `ghost/core/server/services/members/api.js:276` — `newslettersService: newsletters.service` captured in `createApiInstance` during members `init()`. This is the services.ts comment; true, and a getter would remove it.
  - (iii) 5 (`api/endpoints/newsletters.js:23,49,68,89,102`)
- Confidence: inferred
- Not determined: whether the nodemailer transport factory does anything beyond building an object (`@tryghost/nodemailer` not read).

##### mentions — class C (B for the subscriptions)

- Root/step: `ghost/bootstrap/services.ts:91-93`; root `ghost/core/server/services/mentions/index.ts:3`
- Effects:
  - `subscribe` — legacy string bus `core/server/lib/common/events`: `post.published`, `post.published.edited`, `post.unpublished`, `page.published`, `page.published.edited`, `page.unpublished` → `sendForPost` (`index.ts:83`; `mention-sending-service.js:52-59`)
  - `wire` — repository, metadata, discovery, resource, routing, API, controller, sending service (`index.ts:25-80`; constructors read and only store dependencies)
- Reads at start:
  - jobs service — `require('../jobs-service').getInstance()` (`index.ts:23`), which throws before the legacy jobs service step (`jobs-service/index.*:75-82`); captured into the controller and sending service (`index.ts:50,78`) — movable: yes, pass a getter
  - urlUtils — `getSiteUrl()` captured as `siteUrl` (`index.ts:34`) — movable: could be a getter (config-derived); already a getter for the sender (`index.ts:74`)
  - already lazy: `settingsCache.get('is_private')` (`index.ts:77`); url service, oembed service captured as objects
  - foundation: models, domain-events bus object, legacy events bus object, logging
- Stop: none. The six listeners are never removed.
- Class reason: wiring plus fixed subscriptions plus one captured read of the jobs service. Lazy with a getter for `jobsService` and the subscriptions declared. What is lost if the subscriptions did not exist until first use: posts and pages published, edited or unpublished before first use would send no webmentions.
- Reverse (who reads `.service`):
  - (ii) `ghost/core/server/services/recommendations/index.ts:55` — captures `.service`, passes `sendingService` (`:80`) and `api` (`:92`), and calls `metadata.addMapper(...)` (`:128`), which registers a mapper on the Mentions instance. This is the services.ts comment; true. The captures could be getters; `addMapper` is a registration on Mentions and needs the instance or a declared hook.
  - (ii) `ghost/bootstrap/transition/boot-steps.ts:436-437,448-449` — `initJobs` asserts and passes `controller` and `sendingService` to job-handler registration
  - (iii) 2 (`api/endpoints/mentions.js:13,28`)
  - "webhooks listen after Mentions" (`services.ts:92`): `webhooks.listen()` is at `boot-steps.ts:402`. Both listen on the same legacy bus, so the list order fixes listener order.
- Confidence: inferred
- Not determined: whether anything depends on Mentions' listeners running before the webhooks listeners (`services/webhooks` not read). `oembed` service and `forPost` serializer helper not read.

##### stats — class C

- Root/step: `ghost/bootstrap/services.ts:94-95`; root `ghost/core/server/services/stats/index.ts:14`
- Effects:
  - `other` — initializes another service: `TinybirdServiceWrapper.init()` when web analytics is on or `tinybird:stats` is configured (`index.ts:27-31`; `stats/utils/tinybird.ts:125-135`). `init()` reads `config.get('tinybird')` and `settingsCache.get('site_uuid')`, then sets the static `instance` or `null` (`tinybird/tinybird-service-wrapper.js:7-26`; constructor `tinybird-service.js:88-98` stores flags only)
  - `load`/`other` — when `hostSettings:statsCache:enabled`, `adapterManager.getAdapter('cache:stats')` constructs the cache adapter (`index.ts:53-55`)
  - `wire` — Tinybird query client (closures, `stats/utils/tinybird.ts:138-300`) and `StatsService.create` with seven sub-services whose constructors store dependencies (`index.ts:35-51`; `stats-service.js:274-284`)
- Reads at start:
  - settings cache — `settingsCache.get('web_analytics_enabled')` (`stats/utils/tinybird.ts:130`). The result decides, once per process, whether a Tinybird client exists at all (`index.ts:35-43`) — movable: yes, check it per request inside the client; as written, turning the setting on needs a restart for stats to query Tinybird
  - settings cache — `settingsCache.get('site_uuid')` inside `TinybirdServiceWrapper.init()` (`tinybird-service-wrapper.js:13`), captured — movable: yes, on first use
  - tinybird wrapper — `TinybirdServiceWrapper.instance` captured into the client (`index.ts:41`) — movable: could be a getter
  - adapter manager — `getAdapter('cache:stats')` (`index.ts:54`) — movable: yes
  - foundation: config, knex, logging; url service and urlUtils captured as objects
  - already lazy: `tinybird:stats` config and `site_uuid` for each request built (`stats/utils/tinybird.ts:147,158`)
- Stop: none
- Class reason: wiring that reads two settings and sets up the shared Tinybird instance. Nothing is needed before the first stats request, so it could be lazy; the risk is only that a failure moves to the first request. Side effect to keep: `automations-api.ts:88` reads `TinybirdServiceWrapper.instance`, which only this root (and the tinybird endpoint, `api/endpoints/tinybird.js:16`) initializes.
- Reverse (who reads `.service`):
  - (ii) `ghost/core/server/services/explore-ping/index.ts:14` — `statsService: require('../stats').default.service` captured in Explore ping's create. This is the services.ts comment; true, and a getter would remove it.
  - (iii) 20 in `api/endpoints/stats.js` (e.g. `:13,17,61,86,108`), all inside functions
- Confidence: inferred
- Not determined: cache adapter constructors not read (whether `getAdapter` opens a connection); `automations-api.ts:88` is inside `getTinybirdClient()` (read at time of use).

### Part 3: service roots, staff to member-welcome-emails

Paths are relative to the repo root. `S/` = `ghost/core/server/services/`. All roots are loaded lazily by
`ghost/bootstrap/services.ts:100-126` (`load:` runs when the step reaches the entry), then `init()` runs `create`
(+ `start` where present) from `kernel/src/define-service.ts:60-70`. `.service` throws before the first successful
init (`kernel/src/define-service.ts:91-98`).

Shared notes

- "Legacy bus" = the string-named bus `ghost/core/server/lib/common/events`.
- `adapterManager` is `application.adapters` (`S/adapter-manager/index.ts:9`), built by the application; I treat the
  manager object as foundation, but `getAdapter(...)` constructs/returns an adapter instance and I did NOT read the
  adapter constructors (a storage or Redis cache adapter could do I/O when first built).
- `new GhostMailer()` only reads `config.get('mail')` and builds a nodemailer transport object
  (`ghost/core/server/lib/mail/ghost-mailer.js:118-141`); no connection is opened there as far as that constructor shows
  (nodemailer internals not read).
- Reverse-direction search: grep over `ghost/` (excluding tests and node_modules) for every `require`/`import` of each root,
  then every `.service` read on the imported binding, including where the root object is passed on and read elsewhere.

#### Verdict on the order claims

| Claim                                                                                                   | Where                                                  | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Recommendations reads the ready Mentions instance while it starts"                                     | `ghost/bootstrap/services.ts:91`                       | TRUE. `S/recommendations/index.ts:55` reads `mentions.service`; captures `.sendingService` (`:80`), `.api` (`:92`), and calls `.metadata.addMapper` (`:128`).                                                                                                                                                                                                                                                                                                                  |
| "Explore captures the ready Stats aggregate while it starts"                                            | `ghost/bootstrap/services.ts:94`                       | TRUE. `S/explore-ping/index.ts:14` reads `require('../stats').default.service` and stores it; it is only used later at `S/explore-ping/explore-ping-service.ts:133-134`.                                                                                                                                                                                                                                                                                                       |
| MWE "captures the ready Email address and Link tracking instances while it starts"                      | `ghost/bootstrap/services.ts:121`                      | TRUE. `S/member-welcome-emails/index.ts:58-62` asserts both, captures `linkTracking.service` (`:72`) and `emailAddress.service` (`:91`). Both are legacy wrappers whose `.service` is a plain property, undefined until their init (`S/email-address/email-address-service-wrapper.js:5,19`; `S/link-tracking/index.js:71`). Email address is started in `ghost/bootstrap/shared.ts:44`; link tracking in "legacy: services" (`ghost/bootstrap/transition/boot-steps.ts:403`). |
| MWE "automation polling sends through it once jobs start"                                               | `ghost/bootstrap/services.ts:122`                      | TRUE but lazy: `S/automations/service.ts:106,117` read `memberWelcomeEmails.service` inside the event-handler closures, at poll time. It needs MWE ready before the first poll event (automations init is in `initAfterJobs`, `ghost/bootstrap/transition/boot-steps.ts:480`), not a position inside the services list.                                                                                                                                                        |
| Staff "Boot awaits member attribution first; Staff keeps this instance"                                 | `S/staff/index.ts:48`                                  | TRUE. `S/staff/index.ts:49`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Tiers "Boot sets up the custom fields services first" / "tiers read member metafields while they start" | `S/tiers/index.ts:6`, `ghost/bootstrap/services.ts:31` | TRUE for tiers. `S/tiers/index.ts:17` calls `metafields.booted()`, which throws if not initialised (`S/members-metafields/index.ts:54-66`).                                                                                                                                                                                                                                                                                                                                    |
| Undocumented                                                                                            | —                                                      | Explore ping also captures the legacy email service at start, via `require('../posts/posts-service-instance')()` (`S/explore-ping/index.ts:12` -> `S/posts/posts-service-instance.js:40` reads `emailService.service`).                                                                                                                                                                                                                                                        |
| Undocumented                                                                                            | —                                                      | Recommendations reads the settings cache at start through `service.init()` (`S/recommendations/service/recommendation-service.ts:64`).                                                                                                                                                                                                                                                                                                                                         |

Positions of these 16 relative to EACH OTHER are not proven by any start-time read: the only cross-read inside the group is
recommendations -> staff, and that is a getter (`S/recommendations/index.ts:49-53`). Consumers started EARLIER in the list
(Stripe, gifts, members API, stripe-checkout-config, content-import) already read staff/tiers/donations/comments/
media-inliner/MWE lazily because those roots start after them.

---

##### staff — class B

- Root/step: `ghost/core/server/services/staff/index.ts:13`
- Effects:
  - `subscribe` — 4 handlers on `@tryghost/domain-events`: `MemberCreatedEvent`, `SubscriptionActivatedEvent`, `SubscriptionCancelledEvent`, `MilestoneCreatedEvent` (`S/staff/index.ts:65` -> `S/staff/staff-service.js:185,194,206,217`)
  - `load` — synchronous read of the shared email partial files while the emails object is constructed (`S/staff/staff-service.js:30` -> `S/staff/staff-service-emails.js:28,621-623` -> `S/staff/email-template-files.ts:54-58` -> `S/staff/index.ts:60`)
  - `wire` — `new GhostMailer()` (`S/staff/index.ts:42`), Handlebars instance + helpers (`S/staff/staff-service-emails.js:27,29`)
- Reads at start: member-attribution — `memberAttribution.service` captured into the constructor (`S/staff/index.ts:49`; used only in the event handler, `S/staff/staff-service.js:132,135`) — movable: yes: could be a getter. settingsCache / labs / urlUtils / settingsHelpers / blogIcon — module objects passed in, not read at start (`S/staff/index.ts:43-50`) — already lazy. Foundation: logging, models, domain-events.
- Stop: none. The bus cannot remove handlers; a failed subscribe poisons retries (`S/staff/index.ts:9-19,64-69`).
- Class reason: beyond wiring, it subscribes to four fixed events and pre-reads partial files. If the subscriptions did not exist until first use, member signup / paid start / cancel / milestone events emitted before then would send no staff notification. The partial read could move to first render.
- Confidence: inferred
- Not determined: nothing
- Reverse (who reads `staff.service`): (i) none; (ii) none; (iii) 3 — getters in `S/gifts/index.ts:142`, `S/stripe/stripe-service.js:121` (root passed from `S/stripe/service.js:78`), `S/recommendations/index.ts:51`. Position not proven by consumers (gifts and Stripe start before staff).

##### tiers — class C

- Root/step: `ghost/core/server/services/tiers/index.ts:9`
- Effects:
  - `load` — reads every product with benefits from the database into an in-memory store (`S/tiers/index.ts:38` -> `S/tiers/tier-repository.js:60-71`)
  - `wire` — `TierRequirements`, `TierRepository`, `TiersAPI` (`S/tiers/index.ts:20,26,40`; constructors `S/tiers/requirements.ts:100-112`, `S/tiers/tier-repository.js:32-36`)
- Reads at start: members-metafields — `metafields.booted()` destructures `bindings`, throws if metafields is not initialised (`S/tiers/index.ts:17`; `S/members-metafields/index.ts:54-66`); `bindings` is used only inside the `boundPorts` closure (`S/tiers/index.ts:22`) — movable: yes: call `booted()` inside the closure. Foundation: knex, models, domain-events, logging.
- Stop: none
- Class reason: the only real start work is the DB load of the tier cache. It could load on first read behind a memoised promise (all API methods are async). Risk: first tier read is slower and a DB failure moves from boot to that request. Tests reload the repository after inserting products (`S/tiers/index.ts:6`), so they depend on the store being replaceable.
- Confidence: inferred
- Not determined: whether `TierRepository` write paths assume `#store` is already populated (only `init` and the constructor were read).
- Reverse (who reads `tiers.service`): (i) none; (ii) none; (iii) 18 — `S/stripe-checkout-config/index.ts:56,67`; `S/gifts/index.ts:51`; `S/members/middleware.js:27`; `S/members/api.js:271,296`; `S/members/service.js` (3); `ghost/core/server/api/endpoints/tiers-public.js:18`; `.../endpoints/tiers.js` (4); output serializers `email-posts.js:7`, `posts.js:26`, `previews.js:6`, `pages.js:22`. The members API and stripe-checkout-config are built BEFORE tiers and say so (`S/members/api.js:267-268`, `S/gifts/index.ts:48`). Position not proven by consumers.

##### tags-public — class B

- Root/step: `ghost/core/server/services/tags-public/index.ts:5`
- Effects:
  - `wire` — resolves the `cache:tagsPublic` adapter when `hostSettings:tagsPublicCache:enabled` (`S/tags-public/index.ts:10-13`)
  - `subscribe` — legacy bus `site.changed` -> `cache.reset()`, only when the cache is enabled (`S/tags-public/index.ts:15-18`)
- Reads at start: none beyond foundation (config, adapter manager, legacy bus object).
- Stop: none (the listener is never removed).
- Class reason: one conditional subscription of a fixed thing. If it did not exist until first use, a `site.changed` before then would have nothing to reset, which is harmless only while the cache is still empty.
- Confidence: inferred
- Not determined: what constructing the cache adapter does (not read).
- Reverse: (i) `ghost/core/server/api/endpoints/tags-public.js:24` — `cache: tagsPublicService.service.cache` at the top level of the endpoint module, so the value is captured when that module is first required. That module is itself required lazily from a getter (`ghost/core/server/api/endpoints/index.js:307-308`), reached from the lazily mounted Content API (`ghost/core/server/web/api/app.js:21`) or a frontend helper at request time. I found no boot-time access. (ii) none; (iii) 0. Position proven only as "before the first Content API / frontend data request".

##### posts-public — class B

- Root/step: `ghost/core/server/services/posts-public/index.ts:5`
- Effects:
  - `wire` — resolves the `cache:postsPublic` adapter when `hostSettings:postsPublicCache:enabled` (`S/posts-public/index.ts:10-15`)
  - `subscribe` — legacy bus `site.changed` -> `cache.reset()`, only when enabled (`S/posts-public/index.ts:17-20`)
- Reads at start: none beyond foundation.
- Stop: none.
- Class reason: same shape as tags-public.
- Confidence: inferred
- Not determined: what constructing the cache adapter does (not read).
- Reverse: (i) `ghost/core/server/api/endpoints/posts-public.js:28` and `:84` — top level of the endpoint module, itself lazily required (`ghost/core/server/api/endpoints/index.js:315-316`); other accesses of `api.postsPublic` are inside request-time functions (`ghost/core/frontend/helpers/prev_post.js:64`, `ghost/core/frontend/services/llms/service.js:51,299`). (ii) none; (iii) 0.

##### indexnow-ping — class B

- Root/step: `ghost/core/server/services/indexnow-ping/index.ts:4`
- Effects:
  - `wire` — constructor stores dependencies and binds one listener (`S/indexnow-ping/indexnow-ping-service.ts:99-118`)
  - `subscribe` — legacy bus `post.published` and `post.published.edited` (`S/indexnow-ping/index.ts:15` -> `S/indexnow-ping/indexnow-ping-service.ts:322-330`)
- Reads at start: none. settingsCache, config, urlService, urlUtils are stored and read in the handler (`S/indexnow-ping/indexnow-ping-service.ts:125,141,151`) — already lazy.
- Stop: yes — removes both listeners (`S/indexnow-ping/index.ts:17` -> `S/indexnow-ping/indexnow-ping-service.ts:332-335`).
- Class reason: two fixed subscriptions. If absent until first use (and nothing ever "uses" this service), publishes would never ping IndexNow, so the subscription must be declared at boot.
- Confidence: inferred
- Not determined: nothing
- Reverse: no consumer reads `indexnow-ping .service` anywhere (only `ghost/bootstrap/services.ts:104` loads it). Position unconstrained.

##### upgrades — class A

- Root/step: `ghost/core/server/services/upgrades/index.ts:7`
- Effects:
  - `wire` — `new UpgradeService({getAdapter, logError})` (`S/upgrades/index.ts:10-13`; constructor `S/upgrades/upgrade-service.ts:77-86`)
- Reads at start: none. The adapter is resolved per call (`S/upgrades/index.ts:11`) — already lazy.
- Stop: none
- Class reason: constructs one object from two closures; nothing else happens.
- Confidence: inferred
- Not determined: nothing
- Reverse: (i) none; (ii) none; (iii) 3 — `ghost/core/server/api/endpoints/upgrades.ts:66,85,106`. (On import: `S/upgrades/index.ts:3` imports the adapter manager module, i.e. `ghost/bootstrap/app`.)

##### slack-ping — class B

- Root/step: `ghost/core/server/services/slack-ping/index.ts:4`
- Effects:
  - `wire` — constructor stores dependencies and binds two listeners (`S/slack-ping/slack-ping-service.ts:90-110`)
  - `subscribe` — legacy bus `post.published` and `slack.test` (`S/slack-ping/index.ts:15` -> `S/slack-ping/slack-ping-service.ts:297-303`)
- Reads at start: none. settingsCache is read in the handler (`S/slack-ping/slack-ping-service.ts:113-114,129`) — already lazy.
- Stop: yes — removes both listeners (`S/slack-ping/index.ts:17` -> `S/slack-ping/slack-ping-service.ts:305-308`).
- Class reason: two fixed subscriptions; without them at boot, publishes and the Admin "send test" event would not reach Slack.
- Confidence: inferred
- Not determined: nothing
- Reverse: no consumer reads `slack-ping .service`. Position unconstrained.

##### comments — class A

- Root/step: `ghost/core/server/services/comments/index.ts:25`
- Effects:
  - `wire` — `CommentsService` (+ emails object, email renderer with Handlebars helpers), `CommentsStats`, `CommentsController`, `new GhostMailer()` (`S/comments/index.ts:46-66`; `S/comments/comments-service.js:107-160`; `S/comments/comments-service-emails.js:7-31`; `S/comments/comments-service-email-renderer.js:2-17`; `S/comments/comments-controller.js:23-26`; `S/comments/comments-stats-service.js:2-4`)
- Reads at start: members — `membersService.contentGating`, which is a static module export, not the initialised API (`S/comments/index.ts:55`; `S/members/service.js:213`) — not an order dependency. email-service — `emailService.renderer` read inside the `createUnsubscribeUrl` closure (`S/comments/index.ts:62-63`) — already lazy. settingsCache read in a getter (`S/comments/comments-service.js:165-166`) — already lazy. Foundation: config, logging, models, db, domain-events, i18n `t`.
- Stop: none
- Class reason: only constructs objects; no subscription, timer, I/O or start-time service read. Could be built on first use. Templates are read per send (`S/comments/index.ts:16-23`).
- Confidence: inferred
- Not determined: nothing
- Reverse: (i) none; (ii) none; (iii) 25 — endpoints `comments-members.js` (12), `comments.js` (6), `comment-replies.js` (2), `comment-likes.js:25`, `comment-dislikes.js:25`, `comment-reports.js:25`; `ghost/core/server/api/endpoints/utils/serializers/output/mappers/posts.js:114`; `S/members/members-api/services/member-bread-service.js:757` (root passed from `S/members/api.js:283`). The members API holds the root before comments starts.

##### media-inliner — class C

- Root/step: `ghost/core/server/services/media-inliner/index.ts:10`
- Effects:
  - `check` — resolves `storage:media`, `storage:images`, `storage:files` so a missing or broken adapter fails init (`S/media-inliner/index.ts:22-26`)
  - `wire` — `new MediaInliner({...})` (`S/media-inliner/index.ts:28-68`; constructor `S/media-inliner/external-media-inliner.js:147-159`)
- Reads at start: none beyond foundation. jobs-service — `jobsService.getInstance()` inside the `dispatchJob` closure (`S/media-inliner/index.ts:43`) — already lazy. Storage adapters re-read per selection (`S/media-inliner/index.ts:44-66`) — already lazy.
- Stop: none
- Class reason: wiring plus an eager adapter check. Dropping the check makes it A; the risk is that a broken storage adapter is reported on the first inlining/import instead of at boot. The adapter-manager comment says the framework already validates configured adapters during start (`S/adapter-manager/index.ts:3-5`), which I did not verify.
- Confidence: inferred
- Not determined: what constructing each storage adapter does (not read); whether the framework's adapter validation covers these three.
- Reverse: (i) none; (ii) `ghost/bootstrap/transition/boot-steps.ts:447` — `initJobs` reads `mediaInliner.service` while registering job handlers (step `legacySteps.jobs`, `ghost/bootstrap/app.ts:113`, after the whole services list); (iii) 2 — `S/content-import/index.ts:74` (closure), `ghost/core/server/api/endpoints/db.js:128`. Proven only "before the jobs step", not a position within the services list.

##### donations — class A

- Root/step: `ghost/core/server/services/donations/index.ts:4`
- Effects:
  - `wire` — `new DonationBookshelfRepository({DonationPaymentEventModel})` (`S/donations/index.ts:5-7`)
- Reads at start: none beyond foundation (models).
- Stop: none
- Class reason: one repository over one model.
- Confidence: inferred
- Not determined: the repository constructor body was not opened (it receives only the model).
- Reverse: (i) none; (ii) none; (iii) 1 — getter `S/stripe/stripe-service.js:115` (root passed from `S/stripe/service.js:76`). Stripe starts before donations.

##### recommendations — class B (the two delayed refreshes are E-type work)

- Root/step: `ghost/core/server/services/recommendations/index.ts:21`
- Effects:
  - `wire` — repositories, `RecommendationService`, `IncomingRecommendationService`, three controllers, `new GhostMailer()`, and a fresh settings BREAD service instance (`S/recommendations/index.ts:57-118`; `S/settings/settings-service.js:51-66`, whose constructor builds another GhostMailer and a MagicLink, `S/settings/settings-bread-service.js:73-123`)
  - `schedule` — one-off timer, 2-7 min, to refresh metadata of all recommendations over the network; only when `recommendations_enabled` is `'true'` and not a test env (`S/recommendations/index.ts:124` -> `S/recommendations/service/recommendation-service.ts:61-83`)
  - `schedule` — one-off timer, 15 s-5 min, to re-verify all incoming recommendations; not in test or development (`S/recommendations/index.ts:125` -> `S/recommendations/service/incoming-recommendation-service.ts:85-101`)
  - `register` — adds a URL mapper to the Mentions metadata service (`S/recommendations/index.ts:128-134` -> `S/mentions/webmention-metadata.js:37-39`)
  - `subscribe` — `@tryghost/domain-events` `MentionCreatedEvent` -> send the "recommendation received" staff email (`S/recommendations/index.ts:136-146`)
- Reads at start:
  - mentions — `mentions.service` (`S/recommendations/index.ts:55`); `.sendingService` captured (`:80`), `.api` captured (`:92`), `.metadata.addMapper` called (`:128`) — movable: the two captures yes (getters); the mapper registration no, unless Mentions collects declared mappers.
  - settings cache — `recommendationEnablerService.getSetting()` runs synchronously at the top of `service.init()` (`S/recommendations/service/recommendation-service.ts:64` -> `S/recommendations/recommendation-enabler-service.js:15-17` -> `S/settings/settings-bread-service.js:158`) — movable: yes: read it when the timer fires.
  - settings service — `settings.getSettingsBREADServiceInstance()` (`S/recommendations/index.ts:58`); it is handed the email-address wrapper module, not its `.service` (`S/settings/settings-service.js:21,65`) — movable: yes: build on first use.
  - staff — getter (`S/recommendations/index.ts:49-53`) — already lazy.
  - Foundation: config (`:121`), logging, sentry, models, domain-events, urlUtils object (stored only).
- Stop: none. The timers, the mapper and the subscription are never released.
- Class reason: one fixed subscription and one fixed registration, plus two delayed one-off refreshes that are background/worker work decided inside boot (the code says "We better move this to a job", `S/recommendations/service/recommendation-service.ts:63`). Without the subscription at boot, a verified recommendation mention arriving before first use would send no email; without the mapper, such a mention's metadata URL would not be rewritten.
- Confidence: inferred
- Not determined: MagicLink constructor and oembed module load effects (not read).
- Reverse: (i) none; (ii) none; (iii) 11 — `ghost/core/server/api/endpoints/recommendations-public.js` (3), `recommendations.js` (6), `incoming-recommendations.js` (1), `ghost/core/frontend/web/site.js:75` (inside the route handler). Position not proven by consumers.

##### explore-ping — class E (the boot ping); the rest is A

- Root/step: `ghost/core/server/services/explore-ping/index.ts:5`
- Effects:
  - `wire` — `new ExplorePingService({...})` (`S/explore-ping/index.ts:7-15`; constructor `S/explore-ping/explore-ping-service.ts:77-93`); builds a whole `PostsService` + `PostsExporter` + `PostStats` just to reach `posts.stats` (`S/explore-ping/index.ts:12` -> `S/posts/posts-service-instance.js:17-42`)
  - `other` (detached network + DB work) — `service.ping()` fired without awaiting, only in production/development and for a non-localhost site URL (`S/explore-ping/index.ts:23-25`). It reads `explore:update_url` and the `explore_ping` setting, runs three post-stat queries, optionally member count and MRR, then POSTs to Explore (`S/explore-ping/explore-ping-service.ts:177-191,95-151,153-175`).
- Reads at start:
  - stats — `require('../stats').default.service` captured (`S/explore-ping/index.ts:14`); used at `S/explore-ping/explore-ping-service.ts:133-134` — movable: yes: could be a getter (the detached ping reaches it only after awaited DB queries).
  - email-service (legacy wrapper) — `emailService.service` captured into `PostsService` (`S/posts/posts-service-instance.js:40`); explore never uses it — movable: yes: construct `PostStats` directly instead of the whole posts service.
  - settings cache — `settingsCache.get('explore_ping')` and the payload settings are read synchronously inside the `ping()` call made at start (`S/explore-ping/explore-ping-service.ts:184,98-102`) — movable: only if the ping itself moves.
  - members — `require('../members')` module; `stats` is a static export (`S/members/service.js:236`) — not an order dependency.
  - Foundation: config (`S/explore-ping/index.ts:23`), logging, request.
- Stop: none. The in-flight ping is not tracked or cancelled.
- Class reason: nothing reads this service; its whole purpose is a one-off "phone home" at server start, which the code itself says should become a schedule (`S/explore-ping/index.ts:21-22`). That is scheduler/background work, not something a request needs. Arguably F (a product decision made inside boot).
- Confidence: inferred
- Not determined: `PostEmailHandler` constructor (built at `S/posts/posts-service.js:65`) was not read.
- Reverse: no consumer reads `explore-ping .service`. Position constrained only by its own reads (stats, email service, settings).

##### users — class A

- Root/step: `ghost/core/server/services/users/index.ts:6`
- Effects:
  - `wire` — `new UsersService({...})` (`S/users/index.ts:9-14`; constructor `S/users/users-service.ts:78-90`)
- Reads at start: none beyond foundation (models, domain-events object, event class, post-revisions function).
- Stop: none
- Class reason: stores four dependencies and binds one method.
- Confidence: inferred
- Not determined: nothing
- Reverse: (i) none; (ii) none; (iii) 2 — `ghost/core/server/api/endpoints/users.js:231`, `ghost/core/server/api/endpoints/authentication.ts:252` (both inside `query`). The root comment's worry that update check may load the users endpoint early (`S/users/index.ts:4-5`) concerns loading the endpoint module, which does not read `.service`.

##### editor-presence — class A

- Root/step: `ghost/core/server/services/editor-presence/index.ts:23`
- Effects:
  - `wire` — resolves the `cache:presence` adapter, derives retention from its `ttl`, picks a Redis or in-memory store, logs one info line, constructs the service (`S/editor-presence/index.ts:28-44`; constructors `S/editor-presence/editor-presence-service.ts:128-135`, `S/editor-presence/redis-presence-store.ts:30-33`)
- Reads at start: none beyond foundation (adapter manager, logging, metrics). The adapter's Redis client is captured into the store (`S/editor-presence/index.ts:34`) — could be resolved on first poll.
- Stop: none
- Class reason: no subscription, no timer at start (the only `setTimeout` is a per-call store timeout, `S/editor-presence/editor-presence-service.ts:91-93`), no I/O in the code read.
- Confidence: inferred
- Not determined: whether constructing the `cache:presence` adapter opens a Redis connection (adapter not read). If it does, that connection is opened here at boot, which would make this C.
- Reverse: (i) none; (ii) none; (iii) 2 — `ghost/core/server/api/endpoints/presence.js:35,46`.

##### segments — class A

- Root/step: `ghost/core/server/services/segments/index.ts:15`
- Effects:
  - `wire` — `new ActionLog()`, `recordSegmentChanges` and `refreshSettingsCache` closures, `SettingsSegmentRepository`, `SegmentsService` (`S/segments/index.ts:18-39`; `S/segments/service.ts:50-54`; `S/segments/settings-repository.ts:155-169`; `ghost/core/server/lib/action-log/segments.ts:17-22`; `S/segments/settings-cache.ts:54-57`)
- Reads at start: none. The settings cache object is stored and only `set` after a commit (`S/segments/settings-cache.ts:34-38`) — already lazy. Foundation: knex, logging, schema.
- Stop: none
- Class reason: only builds closures and objects; all DB access is per call.
- Confidence: inferred
- Not determined: nothing
- Reverse: (i) none; (ii) none; (iii) 5 — `ghost/core/server/api/endpoints/segments.ts:21,30,40,49,63`.

##### member-welcome-emails — class C

- Root/step: `ghost/core/server/services/member-welcome-emails/index.ts:36`
- Effects:
  - `check` — asserts the email-address and link-tracking instances exist (`S/member-welcome-emails/index.ts:58-62`)
  - `load` — synchronously reads six template files while the renderer is constructed (`S/member-welcome-emails/index.ts:66,25-32` -> `S/member-welcome-emails/member-welcome-email-renderer.js:45-48`)
  - `load` — builds an i18n instance for the current locale (`S/member-welcome-emails/index.ts:64`); `@tryghost/i18n` not read, it may load locale files
  - `wire` — renderer, service with MagicLink, `new GhostMailer()`, `new MailgunClient(...)`, `SingleUseTokenProvider` (`S/member-welcome-emails/index.ts:66-103`; `S/member-welcome-emails/member-welcome-email-service.js:82-148`; `ghost/core/server/lib/mailgun/mailgun-client.js:18-21`; `S/members/single-use-token-provider.js:25-35`)
  - `subscribe` — legacy bus `settings.locale.edited` -> `i18n.changeLanguage` (`S/member-welcome-emails/index.ts:106-108`)
- Reads at start:
  - email-address — `emailAddress.service` asserted and captured (`S/member-welcome-emails/index.ts:59,91`) — movable: yes: could be a getter.
  - link-tracking — `linkTracking.service` asserted and captured into the renderer (`S/member-welcome-emails/index.ts:62,72`) — movable: yes: could be a getter.
  - settings cache — `settingsCache.get('locale')` chooses the i18n language (`S/member-welcome-emails/index.ts:64`) — movable: yes if i18n is built on first render; the locale subscription then has to read the setting at render time or be declared.
  - labs, urlUtils, settingsHelpers, config, sentry — stored or passed, read later (`S/member-welcome-emails/member-welcome-email-service.js:150-157`) — already lazy. Foundation: logging, models.
- Stop: none (the locale listener is never removed).
- Class reason: nothing needs the result before the first welcome/automation email, preview or settings edit. Change: capture email-address and link-tracking as getters and read templates/i18n on first render; keep (or replace by reading the locale per render) the one locale subscription. Risk: first send is slower; a missing template or uninitialised link tracking fails at first send instead of at boot. If the subscription were missing until first use nothing is lost, provided i18n is created from the then-current locale.
- Confidence: inferred
- Not determined: what `i18nLib(...)` and `registerHelpers` do at construction (`@tryghost/i18n`, `S/email-service/helpers/register-helpers` not read); MagicLink constructor not read.
- Reverse: (i) none; (ii) none; (iii) 9 — `S/stripe/stripe-service.js:135`; `S/automations/service.ts:106,117` (inside the `StartAutomationsPollEvent` handler closures); `ghost/core/server/api/endpoints/automation-email-previews.js:25,52`; `ghost/core/server/api/endpoints/automated-emails.js:329,353,380,405`. Stripe starts before MWE and says so (`S/stripe/stripe-service.js:133`). Proven only "before the first automation poll", not a list position.

### Part 4: legacy entries in the services list

Paths are relative to the repo root. Step functions are in `ghost/bootstrap/transition/boot-steps.ts`, wrapped by `ghost/bootstrap/transition/legacy-steps.ts`.
All findings are from reading code; nothing was run. `node_modules` is not installed in this checkout, so external packages (`@tryghost/prometheus-metrics`, `knex-migrator`, `gscan`, `express-lazy-router`) were not read.

---

##### legacy: members metafields — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:122` (`initMembersMetafields`) → `ghost/core/server/services/members-metafields/index.ts:68` (`init`)
- Effects:
  - `wire` — builds `namespaces`, `fields`, `MetafieldDefinitionsService`, `MetafieldValuesService`, `MetafieldBindingsService` into module-level `let` exports (`members-metafields/index.ts:87-109`). Constructors only store their arguments (`values-service.ts:205-217`, `bindings-service.ts:63-75`, `definitions-service.ts:146`). Idempotent (`index.ts:71-73`).
  - `other` — creates one OpenTelemetry counter `members.metafields.unreadable_fields` (`members-metafields/tracking.ts:53`); no I/O.
- Reads at start:
  - knex (`index.ts:75`), config module (`index.ts:81`), tracer/meter (`index.ts:11`) — foundation/always available.
  - limits — the `limitService` object is passed into `customFields` (`index.ts:87`); only called inside closures (`custom-fields.ts:36-37`) — already lazy. The legacy alias `server/services/limits.ts:20-30` forwards to the shared instance at call time.
  - labs — the labs module object is passed to the definitions service (`index.ts:92-99`), "asked on every create" (`definitions-service.ts:159`) — already lazy.
  - config `members:metafields:maxDefinitions` — a getter (`index.ts:82-83`) — already lazy.
- Stop: none.
- Class reason: only constructs objects; no query, subscription or timer. It is a boot entry only because consumers read the bare `let` exports at their own start (see below); a lazy accessor (or `booted()` building on first call) would remove the order requirement.
- The claim in `services.ts:31` ("Stripe checkout config and tiers read member metafields while they start") — **verified true by reading**:
  - `stripe-checkout-config/index.ts:43-47` throws if `metafields.bindings`/`fields` are unset, then captures both into `StripeCheckoutConfigService` (`index.ts:53-54`). Movable: yes, could be getters.
  - `tiers/index.ts:17` calls `metafields.booted()` (throws if unset, `members-metafields/index.ts:54-66`) and captures `bindings` in a closure (`tiers/index.ts:22`). Movable: yes, call `booted()` inside the closure.
  - Others that capture at their own start: `members/api.js:290,293` (values, bindings captured into the members API), `members/service.js:93-94` and `209-210` (importer/exporter), `stripe/stripe-service.js:139-140` (getter — already lazy).
- Confidence: inferred
- Not determined: nothing.

##### legacy: jobs cleanup — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:132` (`initJobsCleanup`)
- Effects:
  - `register` — registers a cleanup task `'Jobs Service (in-memory)'` on `ghostServer` that calls `jobsService.shutdown({timeoutMs: config server:shutdownTimeout})` (`boot-steps.ts:144-146`). Skipped when there is no HTTP server (`boot-steps.ts:139`).
  - (on import) `require('../../core/server/services/jobs-service')` (`boot-steps.ts:142`) loads the module only; its top level just requires `@tryghost/database-info` (`jobs-service/index.ts:10`). No instance is built here.
- Reads at start: `state.ghostServer` (made by the `http server` step, `legacy-steps.ts:107-108`); config — foundation. None beyond foundation.
- Stop: this entry _is_ the jobs service's stop. `shutdown()` is a no-op if no instance exists (`jobs-service/index.ts:84-88`).
- Class reason: one fixed registration; its position in the list is irrelevant (the task only reads the instance when the server shuts down). It is a `stop` declaration for the jobs service.
- Confidence: inferred
- Not determined: nothing.

##### legacy: knex instrumentation — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:591` (`initKnexInstrumentation`)
- Effects:
  - `register` — if Prometheus is enabled, `prometheusClient.instrumentKnex(knex)` (`boot-steps.ts:596-598`). The client is built on import of `core/shared/prometheus-client.js:6-11` in the `metrics` step. `instrumentKnex` lives in the external package `@tryghost/prometheus-metrics`, which is not in this checkout, so what it attaches was not read (the step comment says pool/knex event listeners, `boot-steps.ts:588-589`).
- Reads at start: `state.prometheusClient` (foundation step `metrics`); the knex handle (`core/server/data/db/connection.ts:7`, which is `application.foundation.database.knex`) — foundation. None beyond foundation.
- Stop: none of its own. The Prometheus client is stopped by the cleanup task registered in `boot-steps.ts:546-550`.
- Class reason: a fixed registration of listeners on the database handle. Nothing in the services list is needed for it.
- The ordering comment ("Needs to be after initLegacyCore because the pool is destroyed and recreated before then", `boot-steps.ts:589`) — **could not be confirmed, and looks stale on this branch**:
  - `initLegacyCore` no longer exists; `services.ts:48-49` gives the real reason for today's position: "which is where the pool was instrumented before services started from this list" (i.e. historical position).
  - The handle is built once by the application (`ghost/bootstrap/app.ts:42-55`, `foundry/src/database.ts:11-13`) and nothing in `ghost/core/server/data`, `ghost/shared`, `ghost/bootstrap`, `foundry/src` or `kernel/src` calls `knex.destroy()`/`initialize()` on it during boot. The only `destroy()` calls are the knex-migrator shutdown hooks, and both are guarded by `executedFromShell === true` (`ghost/core/server/data/migrations/hooks/init/shutdown.ts:6-19`, `hooks/migrate/shutdown.ts:9-10`), which is not the in-process boot path (`database-state-manager.js:108,119`).
  - So the only real requirement visible in the repo is "after the `database` step" (after migrations). It could sit in `database.after` next to query tracing (`app.ts:100`).
- Confidence: inferred
- Not determined: what `instrumentKnex` registers; whether `knex-migrator` itself (external, not read) touches Ghost's pool object during `init()`/`migrate()`.

##### legacy: routing services — route-settings init — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:159-160` → `ghost/core/server/services/route-settings/index.js:6-12`
- Effects:
  - `wire` — `service.configure({store: adapterManager.getAdapter('route-settings')})` (`route-settings/index.js:9-11`, `dynamic-routing-service.js:28-31`). No file or DB read.
  - `check` — the adapter constructor validates its config paths (`server/adapters/route-settings/FileStore.ts:62-67`, schema `:22-29`); default adapter is `FileStore` (`shared/config/defaults.json:62-66`), paths from `adapter-manager/config.ts:75-85`.
  - (on import) `new DynamicRoutingService()` (`route-settings/index.js:3`) — wire.
- Reads at start: adapter manager (`application.adapters`, `adapter-manager/index.ts:9`) — foundation. None beyond foundation.
- Stop: none.
- Class reason: only hands the store to the service; the actual read of `routes.yaml` happens in `legacy: dynamic routing` (`dynamic-routing-service.js:48`). `this.store` could be resolved on first use.
- Who needs it before the first request: `initDynamicRouting` → `service.start()` → `this.store.get()` (`dynamic-routing-service.js:43-49,52-54`); `bridge.reloadFrontend` (`bridge.js:119`); Admin API upload/download (`api/endpoints/settings.js:218,237`, `exports.js:108`). **Nothing in the Express app build reads it**: `initExpressApps` passes only `{urlService}` (`boot-steps.ts:230`), so `routerManager.init` runs without `routeSettings` (`router-manager.js:67-81`). The `services.ts:52` comment ("What the frontend reads while its Express app is built") is true of custom-redirects, not of route-settings.
- Confidence: inferred
- Not determined: nothing.

##### legacy: routing services — custom-redirects init — class C (D as written today)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:164-165` → `ghost/core/server/services/custom-redirects/index.js:19-32`
- Effects:
  - `wire` — builds a `DynamicRedirectManager` (an `express.Router` holder, `web/shared/dynamic-redirect-manager.js:11-23`) and a `RedirectsService` (`custom-redirects/index.js:20-29`).
  - `load` — `redirectsService.init()` → `activate()` → `store.getAll()` then loads every redirect into the manager (`redirects-service.ts:67-70,116-134,177-179`). Default store `FileStore` reads `content/data/redirects.yaml|json` (`server/adapters/redirects/FileStore.ts:32-41,78-90`; `shared/config/defaults.json:57-61`; path `adapter-manager/config.ts:70-74`). An S3 store is the alternative, i.e. a network read.
  - Errors are swallowed and logged; boot never fails here (`redirects-service.ts:177-194`).
- Reads at start: config `caching:customRedirects:maxAge` (`index.js:14`) — foundation. urlUtils — only inside a closure (`index.js:15`) — already lazy. Adapter manager — foundation.
- Stop: none. `init()` replaces both objects on a second call (`index.js:20-29`).
- Class reason: two different needs. (1) The manager _object_ must exist when the site app is built, because `frontend/web/site.js:59` reads `customRedirects.middleware`, a getter returning `redirectManager.handleRequest` (`custom-redirects/index.js:38-40`) — a TypeError if `init()` has not run. That is a wire-order dependency, removable by building the manager at import or making the middleware a thunk. (2) The _loaded redirects_ are needed by the first site request (a redirect that is not loaded falls through to routing and 404s or serves the wrong page). Change to make it lazy: await a memoised `activate()` inside the middleware. Risk: first site request pays a file (or S3) read; a bad file is reported at first request instead of boot (it is already non-fatal).
- Confidence: inferred
- Not determined: nothing.

##### legacy: themes — themes init — class C (D as written today)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:177-180` → `ghost/core/server/services/themes/index.js:14-21`
- Effects:
  - `wire` — `validate.init()` takes the `cache:gscan` adapter (`themes/validate.js:32-34`).
  - `load` — reads the active theme's folder and package.json from `content/themes/<name>` (`themes/loader.js:13-17`, `lib/package-json/package-json.js:103-125`).
  - `check` (non-fatal) — runs gscan over the theme (`themes/activate.js:25-27`, `validate.js:47-73`; `skipChecks` from config `optimization:themes:skipBootChecks`, `themes/index.js:17`), caches the result in the gscan cache adapter (`validate.js:88-93`). Fatal theme errors are only logged (`activate.js:29-38`).
  - `load` + DB write — `customThemeSettings.service.activateTheme()` syncs the theme's custom settings with the `custom_theme_settings` table (browse/destroy/edit/add) and fills its value cache (`themes/activation-bridge.js:13`, `custom-theme-settings/custom-theme-settings-service.js:46-57,230-288,297-303`).
  - `other` — `bridge.activateTheme()` sets the active theme in the theme engine (`bridge.js:79-86`; `frontend/services/theme-engine/active.js:42-67,158-161`), which loads theme translations (`active.js:115-126`) and stats `robots.txt` (`active.js:66`); invalidates card assets and admin-auth assets (`bridge.js:90-95`). First use of `cardAssets` reads `cards.manifest.json` synchronously (`frontend/services/assets-minification/card-assets.js:29-40`); first use of `adminAuthAssets` does `mkdirSync` + `copyFileSync` into `content/public/admin-auth` (`admin-auth-assets.js:12-31`).
  - `subscribe` — **none** in `server/services/themes` or the theme engine (grep for `events.on`/`subscribe` found nothing). The theme-related subscriptions (`settings.locale.edited`, `settings.labs.edited`) are made later by `bridge.init()` in `legacy: dynamic routing` (`bridge.js:37-61`).
  - (on import) loading `themes/index.js` loads `core/bridge.js`, whose `new Bridge()` reads `labs.isSet('themeTranslation')` (`bridge.js:34,139`).
- Reads at start:
  - settings cache — `settingsCache.get('active_theme')` (`themes/index.js:19`) and `settingsCache.get('locale')` (`bridge.js:80-82`) — movable: yes, both are read at the moment of activation, so they move with it.
  - labs — `labs.getAll()` for gscan (`validate.js:70`), `labs.isSet('themeTranslation')` (`active.js:119`, and on import `bridge.js:34`) — move with activation; the on-import read in `Bridge` could be taken on `init()`.
  - custom-theme-settings `.service` (`activation-bridge.js:13`) — a real order dependency (`services.ts:58-62`); moves with activation.
  - adapter manager, config — foundation.
- Stop: none.
- If the active theme is missing: `readPackage` rejects with `NotFoundError`, `loadAndActivate` rewrites the message to "The currently active theme … is missing" and only logs it (`activate.js:41-50`). Boot continues. No active theme is set, so every site request gets a 500 from `ensureActiveTheme` (`frontend/services/theme-engine/middleware/ensure-active-theme.js:17-26`); static theme files fall through (`frontend/web/middleware/static-theme.js:86-88`); the admin still works.
- Class reason: nothing reads the active theme while the Express apps are built — the theme is mounted per request (`ensure-active-theme.js:28-31`). But the first site request needs it. Lazy change: activate on first site request behind a memoised promise in `ensureActiveTheme`. Risk: first request pays gscan + file reads + a DB sync (this is the step boot times with `theme-service-init`, `boot-steps.ts:178-180`); a broken theme is reported on first request, as it already is non-fatal at boot. Also `custom_theme_settings` rows and `@custom` values would not be synced until then — the Admin API's custom theme settings endpoints would see an unsynced/empty list before the first site request, so on a backend-only process it would have to be triggered there too.
- Confidence: inferred
- Not determined: what gscan does internally (external package); translation file loading in `themeI18n.init`/`themeI18next.init` was followed only to `theme-i18n.js:26-32`.

##### legacy: themes — offers init — class C (D as written today)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:184-185` → `ghost/core/server/services/offers/service.js:11-27`
- Effects:
  - `wire` — `DynamicRedirectManager`, `OfferBookshelfRepository`, `OffersModule`/`OffersAPI`; sets `this.api` (`offers/service.js:12-24`, `offers-module.js:60-63`).
  - `subscribe` — `@tryghost/domain-events`: `OfferCodeChangeEvent` and `OfferCreatedEvent`, to keep offer-code redirects in sync (`offers/offers-module.js:25-42`).
  - `load` — `repository.getAll()` reads every offer from the DB and adds a redirect `/<code>` → `/#/portal/offers/<id>` for each (`offers-module.js:44-50`).
- Reads at start: config `caching:customRedirects:maxAge` (`service.js:13`), models (`service.js:4`), domain-events bus — foundation. urlUtils only in a closure (`service.js:14-16`) — already lazy. None beyond foundation.
- Stop: none. Not idempotent: a second `init()` subscribes again and replaces the manager (`service.js:12-27`).
- Class reason: (1) wire-order: `frontend/web/site.js:53` reads `offersService.middleware` (getter → `redirectManager.handleRequest`, `offers/service.js:31-33`) while the site app is built — TypeError if `init()` has not run; `offersService.api` is null until then (`service.js:29`). (2) The loaded offer redirects are needed by the first request to an offer link. (3) The two subscriptions must exist before any offer is created/renamed, or that offer's redirect is missed until restart — this is the part that must be _declared_ at boot. Lazy change: build manager/API at import or first use, load offers on first use of the middleware. Risk: first site request pays one DB query.
- Confidence: inferred
- Not determined: nothing.

##### legacy: frontend (helpers) — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:192-196` → `ghost/core/frontend/services/helpers/index.js:8` → `register-ghost-helpers.js:3-56`
- Effects:
  - `register` — requires each of 53 helper modules and registers it on the Handlebars instance (`frontend/services/helpers/register-ghost-helpers.js:4-55`, `registry.js:6-22`, `helpers/handlebars.js:39-40`). Idempotent per name (`registry.js:7-9`).
- Reads at start: none beyond foundation in `init` itself. Helpers read settings cache/labs when a template calls them.
- Stop: none.
- Class reason: a fixed list of registrations into one registry; nothing is read or opened. Only needed before the first theme render; runs only with `options.frontend` (`services.ts:64-68`).
- Confidence: inferred
- Not determined: the top-level (on import) code of the 53 helper modules and `frontend/services/proxy.js` was not audited line by line; `proxy.js:2-9` only requires modules.

##### legacy: express apps — class A for what it builds; with two real build-time captures (see list)

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:206-236` (`initExpressApps`)
- What is built **now** (eagerly): the parent app (`web/parent/app.js:10-44`), the backend wrapper + the admin (SPA shell) app (`web/parent/backend.js:9-25`, `web/admin/app.js:20-98`), the frontend wrapper + the site app (`web/parent/frontend.js:10-26`, `frontend/web/site.js:41-224`).
- What is **not** built now (`lazyUse` builds on the first request to that mount path, `core/shared/express.js:30-38`): the API app (`backend.js:15`; and inside it Content and Admin API apps are again lazy, `web/api/app.js:21-22`), `/ghost/.well-known` (`backend.js:16`), `/members` (`frontend.js:20`), `/webmentions` (`frontend.js:21`), `/gift` (`frontend.js:22`). Their module files are `require`d now (the `require(...)` argument is evaluated), but the setup functions run on first request.
- Effects:
  - `wire` — constructs Express apps and mounts middleware functions.
  - `register` — `routerManager.init({urlService})`: hands the URL service to the router manager, clears the router registry, emits `RoutesReset`, creates the empty `SiteRouter` (`frontend/web/routes.js:11`, `frontend/services/routing/router-manager.js:67-84`). No routes yet.
  - `subscribe` (on import of `frontend/services/sitemap/handler.js:3`) — `new SiteMapManager()` subscribes to the frontend routing emitter (`RouteRegistered`, `RoutesReset`) and to the legacy bus `site.changed` via the proxy (`frontend/services/sitemap/site-map-manager.js:59,73-102`; `frontend/services/proxy.js:120-129`). **Order dependency:** this must be loaded before `routerManager.start()` in `legacy: dynamic routing`, or the sitemap misses the static/collection route entries (`site-map-manager.js:68-71`).
  - `other` (file I/O at build) — `bridge.ensureAdminAuthAssetsMiddleware()` (`web/admin/app.js:46`, `bridge.js:75-77`) instantiates `AdminAuthAssets` if theme activation has not already: `mkdirSync` + `copyFileSync` (`admin-auth-assets.js:12-31`).
  - `check` — `queueRequest(config)` throws on a bad `optimization:requestQueue` config (`web/parent/app.js:35-39`, `web/parent/middleware/queue-request.ts:32-43`); private-blogging `setupMiddleware` only mounts middleware (`frontend/apps/private-blogging/index.js:48-51`).
- **Read from services at build time** (value captured while the apps are constructed):
  - offers — `siteApp.use(offersService.middleware)` reads `redirectManager.handleRequest` (`frontend/web/site.js:53`; `offers/service.js:31-33`). Needs offers `init()` first. Movable: yes (thunk).
  - custom-redirects — `siteApp.use(customRedirects.middleware)` (`frontend/web/site.js:59`; `custom-redirects/index.js:38-40`). Needs custom-redirects `init()` first. Movable: yes (thunk).
  - link-redirection — `linkRedirects.service.relativeRedirectPrefix()` and `linkRedirects.service.handleRequest` are read to register the route (`frontend/web/routers/link-redirects.js:3-7`, called `site.js:55`). Needs the `link-redirection` service started (`services.ts:54-57`). Movable: the handler yes (thunk); the path prefix is part of the route pattern — cannot easily, unless the prefix is computed from config/url utils without the service.
  - adapter manager — `getAdapter('storage:images'|'storage:media'|'storage:files').serve()` (`site.js:107-115`); `getAdapter('sso')` + `setUserRepository` (`server/auth/session/index.ts:120,126`, called from `backend.js:20`). Foundation.
  - auth engine — `require('../index').isBetterAuth` "chosen once, when the backend app mounts this" (`server/auth/session/index.ts:139-140`). Config-derived as far as read; movable: yes.
  - URL service — the singleton is passed in and stored (`boot-steps.ts:229-230`, `router-manager.js:68`). Not called at build.
  - config — `queryParameterFiltering:enabled`, `compress`, `optimization:requestQueue` (`web/parent/app.js:16,26,35`), `admin:redirects` (`frontend/web/middleware/redirect-ghost-to-admin.js:15`), `apps:internal` (`site.js:128,212`), `paths`, caching max-ages (`web/admin/app.js:31,34`, `site.js:120`) — foundation.
  - (on import) `core/bridge.js:34` reads `labs.isSet('themeTranslation')`; `server/auth/session/index.ts:75-77` builds a `GhostMailer` and the session service; `server/services/members/service.js:33,41-45` builds a `GhostMailer`, `MembersConfigProvider` and `MembersStats` (reads only the knex client type). None of these call another service's started instance.
  - **Not read at build**: settings cache values (only the module object is captured: `site.js:79,87-104`, `llms/service.js:40-42`, `llms-discovery.ts:27-29`), labs values in routes (`shared/labs.js:158-165` checks per request), members API, recommendations, the active theme, tiers.
- **Read per request** (already lazy):
  - `recommendationsService.service.wellknownController` (`site.js:72-77`); `membersService.api.middleware.wellKnown` (`site.js:121-123`); `membersService.ssr` inside `loadMemberSession` (`site.js:153`, `members/middleware.js:94-104`); `themeEngine.getActive()` (`ensure-active-theme.js:17-33`, `static-theme.js:86`); `settingsCache.get('icon')` (`frontend/web/routers/serve-favicon.js:35`), `indexnow_api_key` (`serve-indexnow-key.js:36`), `admin_session_secret`/`theme_session_secret` (`admin-toolbar.js:12-14`); `api.tiers.browse()` in frontend caching (`site.js:167-170`, `frontend-caching.js:36-42`); `DomainEvents.dispatch(MemberPageViewEvent)` (`site.js:176-187`).
- **Read at first request to a lazy app** (capture, but after boot is complete): `stripeService.webhookController` bound into the members app (`web/members/app.js:41`); `signingKeys.service.forPurpose('staff')` (`web/well-known.js:9`); `auth.betterAuth.service` in the Admin API app (`web/api/endpoints/admin/app.js:26-29`). These capture instances once, so they pin whatever instance exists at first request.
- **URL service**: it is neither started here nor built lazily. `ghost/core/server/services/url/index.js:7` builds the `LazyUrlService` singleton on import; the first import is `core/app.js:5`, i.e. the foundation `http server` step, long before this entry. The constructor is pure wiring (`lazy-url-service.ts:207-226`) — no DB, no events, no timers. There is no URL table and no "first build": every URL is computed per call from the registered router configs (`lazy-url-service.ts:362-401`); only `resolveUrl` and `getRoutableResources` touch the DB, per call (`lazy-url-service.ts:345-356,426`). What makes it usable is router registration (`onRouterAddedType`, `lazy-url-service.ts:228-244`), which happens in `legacy: dynamic routing`, not here.
- Reads at start (summary): offers, custom-redirects, link-redirection — real order dependencies, all movable to thunks except the link-redirect route prefix.
- Stop: none.
- Class reason: building the apps opens nothing and loads nothing from the DB; it must merely precede `legacy: dynamic routing` (which mounts routers onto the `SiteRouter` this creates, and whose route events the sitemap must already be listening for) and `ready` (which mounts the returned app, `boot-steps.ts:630-631`). Its need for offers/custom-redirects/link-redirection to be started first comes from three property reads at mount time.
- Confidence: inferred
- Not determined: `express-lazy-router` (external) was not read — "builds on first request" is from the wrapper `core/shared/express.js:30-38` and its debug line; `server/web/shared/middleware/*` and the storage adapters' `serve()` were not audited for build-time reads.

##### legacy: dynamic routing — class D (routers must be registered before serving); part B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:262-284` (`initDynamicRouting`)
- Effects:
  - `subscribe` (part B) — `bridge.init()` subscribes on the legacy string bus `core/server/lib/common/events` to `settings.locale.edited`, `settings.labs.edited`, `settings.timezone.edited` (`core/bridge.js:37-68`). If these did not exist until first use, a locale/labs/timezone change made before then would not reload theme translations or regenerate dated URLs.
  - `register` — backend-only boot: `routing.routerManager.init({urlService})` (`boot-steps.ts:274-276`) so the router manager has the URL service (with a frontend, `initExpressApps` did this — the comment at `boot-steps.ts:270` says `initFrontend`, which is inaccurate).
  - `load` — `routeSettings.service.start()` reads and parses `routes.yaml` (or the bundled default) through the store (`route-settings/dynamic-routing-service.js:43-49,52-54`; `server/adapters/route-settings/FileStore.ts:77-86`; S3 store alternative = network). A failed or invalid read **throws and fails boot** (`dynamic-routing-service.js:55-74`).
  - `register` — `routerManager.start(settings)` creates and mounts on the site router: unsubscribe, email, preview routers, one `StaticRoutesRouter` per route, one `CollectionRouter` per collection, the `StaticPagesRouter`, one `TaxonomyRouter` per taxonomy, and the empty `AppsRouter`; each is put in the router registry (`frontend/services/routing/router-manager.js:101-164`).
  - `register` on the URL service — each router with permalinks (collections, static pages, taxonomies) calls `urlService.onRouterAddedType(identifier, filter, resourceType, permalink)` (`router-manager.js:32-53`; `server/services/url/lazy-url-service.ts:228-244`), which also sets `routersReady = true`. Each also emits `RouteRegistered` on the frontend routing emitter, consumed by the sitemap (`router-manager.js:33-39`; `site-map-manager.js:73-85`).
- Reads at start:
  - route-settings store (set by `legacy: routing services`) — `this.store.get()` (`dynamic-routing-service.js:54`) — movable: no, the result decides which routers are registered.
  - URL service singleton and router manager — passed in (`boot-steps.ts:278-281`).
  - url utils — used by router constructors to build route paths (e.g. `collection-router.js:49,77`, `preview-router.js:29`); config-derived. Movable: no, part of the route patterns.
  - labs — `bridge.init()` itself reads nothing; the `themeTranslation` baseline was captured on import (`bridge.js:34`).
- Stop: none. The legacy-bus listeners and routers are never removed; a reload goes through `urlService.reset()` + `siteApp.reload()` (`bridge.js:114-136`).
- Class reason — what a first request would get wrong without it:
  - Every request gets **503 maintenance**: `core/app.js:14-24` treats `!urlService.hasFinished()` as maintenance mode, and `hasFinished()` is `routersReady` (`lazy-url-service.ts:336-338`), which only `onRouterAddedType` sets. This holds for the Admin API too, not only the site.
  - If that gate did not exist: the `SiteRouter` would be empty, so every site URL would 404; `getUrlForResource` would return `/404/` for every post, page, tag and author (`lazy-url-service.ts:381-400`), in API output, emails and webhooks (the step comment `boot-steps.ts:257-260` records that this already happened on backend-only boots); `resolveUrl` would find nothing.
  - `legacy: app service` would fail to load: it needs the `appRouter` this creates.
    It could be made lazy (first request awaits a memoised `start`) only by also changing the maintenance gate; and a broken `routes.yaml` would then stop failing boot. The three `bridge.init()` subscriptions are a separate B-type declaration with no order need on routing.
- Confidence: inferred
- Not determined: constructors of the individual routers were grepped for service reads (only url utils/config found) but not read in full.

##### legacy: app service — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:290-295` → `ghost/core/frontend/services/apps/index.js:15-28`
- Effects (for the one internal app, `private-blogging`, `shared/config/overrides.json:15`):
  - `register` — mounts the private-blogging router at `/private/` on the `AppsRouter` (`frontend/apps/private-blogging/index.js:39-44`; `frontend/services/apps/proxy.js:4-17`; `apps/loader.js:37-52`).
  - `register` — registers the `input_password` theme helper (`private-blogging/index.js:45`).
  - `check` — if the site URL's subdirectory ends in `private`, logs an error and calls `process.exit(0)` (`private-blogging/index.js:19-36,42`).
  - Any other failure is caught and logged, not thrown (`apps/index.js:19-27`).
- Reads at start:
  - routing registry — `routingService.registry.getRouter('appRouter')` then `appRouter.mountRouter.bind(appRouter)` (`apps/proxy.js:5,15`). Real order dependency on `legacy: dynamic routing` (`router-manager.js:158-161`); if the router is missing this throws inside `init`, is swallowed by the catch, and the app is silently not loaded. Movable: no — it registers onto that router.
  - url utils `getSubdir()` (`private-blogging/index.js:20`) — config-derived; could be a foundation check.
  - config `apps:internal` (`apps/index.js:17`) — foundation.
- Stop: none. `bridge.reloadFrontend` calls `appService.init()` again after routers are rebuilt (`bridge.js:135`).
- Class reason: two fixed registrations plus a config check. Without it, a private site's `/private/` login page 404s and the template's `{{input_password}}` helper is missing; the private-site middleware itself is mounted by the site app, not here (`frontend/web/site.js:128-134`). The subdirectory check is a config validation that does not need to sit after routing.
- Confidence: inferred
- Not determined: nothing.

##### legacy: jobs service (init only) — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:604-607` → `ghost/core/server/services/jobs-service/index.ts:19-73`
- Effects:
  - `wire` — takes the `jobs` adapter from the adapter manager (`jobs-service/index.ts:32`; default `InMemoryJobsBackend`, `shared/config/defaults.json:70-75`, whose constructor only sets fields, `server/adapters/jobs/InMemoryJobsBackend.ts:75-83`); reads outbox config (`index.ts:34`); if the outbox is enabled and the DB is MySQL, constructs `JobsOutbox`, `OutboxRelay`, optional `OutboxTracker` — constructors only store arguments (`jobs-outbox.ts:82-85`, `outbox-relay.ts:33-49`, `outbox-tracker.ts:14-17`); constructs `JobsService` (`index.ts:64-70`, `jobs-service.ts:103-109`).
  - On a second call in the same process it clears registered handlers and returns the same instance (`index.ts:24-27`, `jobs-service.ts:360-365`).
  - **Opens nothing and sets no timer at init.** The backend is started, submitted outbox rows are released (DB), the relay poll starts and the lease timer is set only in `start()` (`jobs-service.ts:242-259,309-317`), which `initJobs` calls after handlers are registered (`boot-steps.ts:459`).
  - The instance is also stored in boot state for later steps (`legacy-steps.ts:133-135`).
- Reads at start: knex and `DatabaseInfo.isMySQL(knex)` — client type only, no query (`index.ts:36`); config; logging; sentry; adapter manager — all foundation. None beyond foundation.
- Stop: `shutdown()` stops the relay, shuts the backend down and clears the lease timer (`jobs-service.ts:342-355`); registered as a cleanup task by `legacy: jobs cleanup` (`boot-steps.ts:144-146`).
- Class reason: pure construction. It is a boot entry because `getInstance()` throws before `init()` (`index.ts:75-82`) and one consumer captures the instance at its own start.
- What `getInstance()` consumers need: only that the object exists; `dispatch`/`scheduleRecurring` are valid on an un-started instance as far as this class is concerned (they call the backend or write the outbox row, `jobs-service.ts:176-203,220-224`).
  - `mentions/index.ts:23` — calls `getInstance()` during the mentions service's create and captures the instance (see the comment at `jobs-service/index.ts:20-23`). Real order dependency; movable: yes, resolve per dispatch.
  - `media-inliner/index.ts:43`, `members/service.js:87`, `email-analytics/jobs/index.js:13` — inside closures, resolved per dispatch — already lazy.
  - `emailService.init({ghostServer, jobsService})` and `initJobs` receive the instance from boot state (`boot-steps.ts:388,416`).
    `init()` needs no argument that only boot has (knex and config are foundation), so `getInstance()` could build on first call.
- Confidence: inferred
- Not determined: whether a non-default jobs adapter's constructor opens a connection (only `InMemoryJobsBackend` exists under `server/adapters/jobs/`); how `InMemoryJobsBackend.enqueue` behaves before `start()` was not read.

### Part 5: the two legacy service steps

Paths are relative to the repo root. `svc/` = `ghost/core/server/services/`. All findings are from reading, nothing was run.

#### Step `initLegacyServicesFirst` ("legacy: services first")

##### legacy: services first (the step itself) — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:302`
- Effects:
  - `wire` — computes `apiUrl = urlUtils.urlFor('api', {type:'admin'}, true)` (`boot-steps.ts:323`), reads `internalKeys.service` (`:318`) and `stripe-checkout-config .service.checkouts` (`:319-320`) to hand to gifts.
  - `register` — cleanup task "Stripe" on `ghostServer` (`boot-steps.ts:334-338`).
  - `check` — `assert(giftService.deliveryService)` (`boot-steps.ts:333`).
- Reads at start: url utils (`:323`), internal-keys root (`:318`), stripe-checkout-config root (`:319`) — movable: yes, all three are only passed on to gifts, which stores them and uses them later.
- Stop: only the Stripe cleanup task (see stripe).
- Class reason: the step is glue. Its doc comment (`boot-steps.ts:298-300`) and `services.ts:78` still list "the email address policy", which this step does not start (that is `initEmailAddressPolicy`, `boot-steps.ts:111`).
- Confidence: inferred
- Not determined: nothing

##### post-scheduling (on import) — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:311` → `svc/post-scheduling/index.ts:9`
- Effects (all on import; there is no init):
  - `wire` — `new PostScheduling({apiUrl, adapter, internalKeys})` (`svc/post-scheduling/index.ts:9-13`).
  - `subscribe` — legacy string bus `core/server/lib/common/events`: `post|page.scheduled`, `.rescheduled`, `.unscheduled`, 6 listeners (`svc/post-scheduling/post-scheduling.ts:39-97`).
  - `register` — registers itself as a rescheduler on the scheduling adapter (`post-scheduling.ts:99` → `packages/adapters/scheduling-base/src/base.ts:62`).
- Reads at start:
  - url utils — `urlUtils.urlFor('api', …)` captured as `apiUrl` (`index.ts:10`) — movable: yes, a getter.
  - adapter manager — `getAdapter('scheduling')` (`index.ts:11`), wrapped in its own `withErrorCapture`. The manager caches instances (`foundry/src/adapter-manager/adapter-manager.ts:105-110`), so this is the same underlying adapter the step runs, behind a second wrapper — movable: no for the `register` (needs the adapter object), yes for everything else.
  - internal-keys root — `internalKeys.service` captured (`index.ts:12`); the key itself is fetched per event (`post-scheduling.ts:42`) — movable: yes, a getter.
- Stop: none.
- Class reason: only subscribes and registers fixed things. If the subscriptions did not exist until first use, a post scheduled before then would never be handed to the scheduler (until the next boot's `rescheduleAll`).
- Confidence: inferred
- Not determined: nothing. (The DB read `rescheduleAll` is not here; it runs in `initAfterJobs`, `boot-steps.ts:488-490`.)

##### scheduler adapter `.run()` — class E

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:324-325`
- Effects:
  - `wire` — `withErrorCapture(adapterManager.getAdapter('scheduling'))` builds a decorator that reports `schedule`/`unschedule` failures to Sentry and logging instead of throwing (`ghost/core/server/adapters/scheduling/error-capture.ts:61-114`).
  - `listen` / `schedule` — default adapter `run()` (`ghost/core/server/adapters/scheduling/scheduling-default.ts:218-253`): guarded by `isRunning` (`:222-226`), then `recursiveRun()` sets a `setTimeout` of 5 minutes (`runTimeoutInMs`, `:24`, `:229-249`). Each tick moves jobs due within 10 minutes (`offsetInMinutes`, `:27`, `:234-243`) out of the in-memory `allJobs` map, hands them to `_execute` (one `setTimeout` per timestamp plus a `setImmediate` spin until due, `:102-147`), then re-arms itself (`:248`). A due job is an HTTP request to Ghost's own admin API URL (`_pingUrl`, `:149-216`), retried every 5 s up to 30 times on 503. It is an endless self-rearming timer chain, not an interval; the timers are not `unref`'d. Nothing is read from the database by `run()`.
- `rescheduleOnBoot` (`scheduling-default.ts:32`, `true` by default; passed through by the wrapper, `error-capture.ts:68-70`): the adapter's statement that its queue lives in memory and is lost with the process, so Ghost must rebuild it at every boot. Read in two places: `initAfterJobs` calls `postScheduling.rescheduleAll()` when it is true (`boot-steps.ts:488-490`; that loads every scheduled post and page, `svc/post-scheduling/post-scheduling.ts:146-157`), and gifts copy it into `rescheduleDeliveriesOnBoot` (`svc/gifts/index.ts:151`, used at `:215-217`). An adapter with a persistent queue sets it false and opts out.
- Reads at start: adapter manager only (built by the application, `svc/adapter-manager/index.ts:9`) — foundation-like; movable: no, this is the object being started.
- Stop: none. No `stop` on the adapter, no cleanup task; the timer chain ends only with the process.
- Class reason: a long-running in-process timer loop that fires scheduled publishes. It is scheduler-role work, not request serving; a web process does not need it to answer requests.
- Confidence: inferred
- Not determined: what a non-default (configured) scheduling adapter's `run()` does.

##### stripe.init() — class C

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:326` → `svc/stripe/service.js:95`
- Effects:
  - `wire` (on import) — `new StripeService(...)` builds the API client shell, webhook manager, billing portal manager, four webhook event services and the controller (`svc/stripe/service.js:43-80`, `svc/stripe/stripe-service.js:56-170`). Members, donations, gifts, staff, welcome emails and metafields are all behind getters (`stripe-service.js:84-150`). Importing it also loads `svc/members` (`service.js:7`), whose module top level builds a `GhostMailer` and `MembersStats` (`svc/members/service.js:33-45`).
  - `load` — `configureApi()` (`service.js:27-35`) reads the active Stripe keys from the settings cache (`svc/stripe/config.js:59` → `svc/settings-helpers/settings-helpers.js:39-79`: `stripe_connect_secret_key`, `stripe_connect_publishable_key`, `stripe_secret_key`, `stripe_publishable_key`), site URL, `stripeRemoteWebhooks`, `stripeWebhookUrl`, `WEBHOOK_SECRET` (`config.js:64-83`). With no keys it returns `null` and nothing else happens.
  - `wire` — with keys: `api.configure` builds the Stripe SDK client and rate-limit buckets (`svc/stripe/stripe-api.js:288-325`); no network.
  - `load` (network, awaited) — with keys:
    - `webhookManager.start()` (`stripe-service.js:233`). Mode is `'network'` unless a webhook secret was supplied (`svc/stripe/webhook-manager.js:37`, `:106-112`). Outside production a placeholder secret is supplied unless `stripeRemoteWebhooks` is on (`config.js:65-71`), so no call. In production without `WEBHOOK_SECRET` it reads `members_stripe_webhook_id/secret` from the settings cache (`service.js:57-62`), then calls Stripe to update the endpoint, or delete and create it (`webhook-manager.js:82-96`, `:127-162`), and writes both settings back to the DB (`service.js:63-74`) on every boot.
    - `billingPortalManager.start()` unless test env (`stripe-service.js:234-236`): reads `stripe_billing_portal_configuration_id`, calls Stripe to create or update the portal configuration, writes the setting if the id changed (`svc/stripe/billing-portal-manager.js:57-74`, `:84-125`). Every boot of a connected site.
    - Any failure is caught and logged; boot continues (`service.js:96-103`).
  - `subscribe` — legacy bus `settings.edited`; on a Stripe key change, a 600 ms debounced re-configure (`service.js:37-41`, `:82-93`, `:105-107`).
  - `other` — warns if `stripeRemoteWebhooks` is set but Stripe is not connected (`service.js:98-100`).
- Reads at start: settings cache (keys, webhook id/secret, portal id) — movable: yes, `configure` could run when the API is first used or on a background step; url utils (`config.js:27`, `:76`, `:83`) captured into the config — movable: could be getters; labs is already a getter (`config.js:89-91`).
- Stop: cleanup task "Stripe" (`boot-steps.ts:334-338`) → `shutdown()` deletes the Stripe webhook endpoint and clears the two settings only when the registration was ephemeral, i.e. non-production with `stripeRemoteWebhooks` (`stripe-service.js:243-247`, `webhook-manager.js:57-75`, `config.js:65`, `:96`).
- Class reason: `api.configure` must have happened before `members.init()` reads `stripeService.api.configured` (`svc/members/service.js:156`, `:163`) and before any checkout, but it is cheap and could happen on first read. The two Stripe network syncs are reconciliation of external state that block boot and are not needed to serve a request; they are closer to F/background work. Risk of the change: a broken Stripe key is reported at first checkout instead of in the boot log (it does not fail boot today either).
- Confidence: inferred
- Not determined: `setupWebhook`'s exact Stripe calls beyond `webhook-manager.js:127-162`; the `stripe` SDK constructor is assumed not to call the network.

##### giftService.init({apiUrl, schedulerAdapter, internalKeys, checkouts}) — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:327-332` → `svc/gifts/index.ts:34`
- Effects:
  - `wire` — repositories, checkout adapter, `GhostMailer` + `MailgunClient`, email service, delivery service, gift service, controller (`svc/gifts/index.ts:72-152`). Constructors only store deps (`gift-service.ts:326-328`, `gift-delivery-service.ts:97-99`, `gift-checkout-adapter.js:16-20`, `gift-email-service.ts:113-145`).
  - `register` — two `SignedFlushScheduler`s (`gift_delivery`, `gift_reminder`) each register as a rescheduler on the scheduling adapter (`index.ts:97-107`, `:119-132` → `ghost/core/server/adapters/scheduling/signed-flush-scheduler.ts:63`).
  - `subscribe` — `@tryghost/domain-events`: `SubscriptionActivatedEvent`, `StartGiftReminderFlushEvent`, `StartGiftDeliveryFlushEvent`, `SendGiftDeliveryEvent` (`index.ts:154`, `:165`, `:182`, `:194`).
  - `other` — copies `schedulerAdapter.rescheduleOnBoot` into a module variable (`index.ts:151`).
- What it captures from the arguments:
  - `internalKeys` (the internal-keys service): stored in both flush schedulers (`index.ts:100`, `:122`) to sign job URLs when a flush is scheduled; no key is read at init.
  - `checkouts` (`stripe-checkout-config.service.checkouts`): stored in `GiftCheckoutAdapter` (`index.ts:83`, `gift-checkout-adapter.js:19`) to decide the checkout a gift opens; read at checkout time.
  - `apiUrl`: stored as a string in both schedulers (`index.ts:98`, `:120`).
  - `schedulerAdapter`: stored and registered on; `rescheduleOnBoot` read once (`index.ts:151`).
- Reads at start: scheduler adapter (register + flag) — movable: no for register; internal keys, checkouts, url utils — movable: yes (getters). Members, tiers, staff and the Stripe API are already lazy (`index.ts:49-53`, `:82`, `:136-143`). Settings cache is passed as an object and read at use.
- Stop: none.
- Class reason: fixed subscriptions and registrations around pure wiring. If the subscriptions did not exist until first use, a paid subscription activation would not consume a gift and flush events would be dropped.
- Confidence: inferred
- Not determined: `GhostMailer`'s constructor past `ghost/core/server/lib/mail/ghost-mailer.js:118-134` (it builds a nodemailer transport from config; assumed no connection is opened).

#### Step `initLegacyServices` ("legacy: services")

##### legacy: services (the step itself) — class A

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:351`
- Effects:
  - `wire` — reads `giftService.deliveryService` before the `Promise.all` (`boot-steps.ts:382`); builds the array and awaits it (`:384-407`).
- The "concurrent" group is not concurrent in any way that matters for order. An array literal evaluates its elements left to right, and each element here is a call, so each `init` runs synchronously up to its first `await` before the next element is evaluated. Six of the ten have no `await` at all and are complete before `Promise.all` is even called: members (`svc/members/service.js:149-212`), members-events, email-service, email-analytics, webhooks, content-import. Identity tokens is `async` with no `await`. Only link-tracking, email-suppression-list and machine-payments have a real asynchronous tail, and only machine-payments does I/O in it.
- `members.api.members` (`boot-steps.ts:396`) is evaluated when the fifth element's argument object is built, after `members.init()` (second element, `:386`) has run its whole body synchronously and set `membersApi` (`svc/members/service.js:170-172`). `members.api` is a getter over a module variable that is `undefined` until then (`service.js:47`, `:221-223`). So this is a real order dependency inside the group: it works only because members is listed first and its init has no `await` before line 171. `emailService.init` (fourth element) depends on the same thing (`svc/email-service/email-service-wrapper.js:49`).
- Side effect of that shape: if `members.init()` throws its Stripe check (`service.js:155-168`), the async function returns a rejected promise, `membersApi` stays undefined, and the next element `emailService.init` throws a synchronous `TypeError` reading `membersService.api.members` (`email-service-wrapper.js:49`). The step then fails with that TypeError, the real error is an unhandled rejection, and `Promise.all` is never reached.
- Reads at start: gifts (`deliveryService`, set by services-first) — movable: yes, a getter.
- Stop: none of its own.
- Confidence: inferred
- Not determined: nothing

##### identity-tokens — class A

- Root/step: `boot-steps.ts:385` → `svc/identity-tokens/identity-token-service-wrapper.js:8`
- Effects:
  - `wire` — `new IdentityTokenService(signingKeys.service.forPurpose('staff'), issuer)` (`identity-token-service-wrapper.js:13-21`); constructor stores both (`svc/identity-tokens/identity-token-service.ts:10-13`). Keys are fetched when a token is signed (`:24`).
- Reads at start: signing-keys root `.service.forPurpose('staff')` (`wrapper.js:19`); url utils `urlFor('admin', true)` captured as issuer (`wrapper.js:14`) — movable: yes, build on first use.
- Stop: none.
- Class reason: only constructs an object. Building it on first use also removes the order dependency on signing keys.
- Confidence: inferred
- Not determined: `forPurpose` was not read; assumed to return a provider without I/O.

##### members — class C (B for its subscriptions, plus one boot-failing check)

- Root/step: `boot-steps.ts:386` → `svc/members/service.js:149`
- Nothing is loaded from the database or from Stripe at init. The body has no `await`.
- Effects:
  - `wire` (on import) — `new GhostMailer()`, `MembersConfigProvider`, `MembersStats` (`svc/members/service.js:33-45`); `svc/members/api.js:38` builds another `GhostMailer`; `middleware`, `content-gating`, `stripe-connect` are required (`service.js:213`, `:230`, `:240`).
  - `check` — throws, failing boot, if a live Stripe key is configured outside production, or Stripe is configured and the site URL is not https in production (`service.js:155-168`).
  - `wire` — builds the members API once (`service.js:170-172` → `svc/members/api.js:63-304` → `svc/members/members-api/members-api.js:94-251`): token service, product/member/event repositories, BREAD service, magic link, payments service, account service, member/router/well-known controllers, ten Express routers (`members-api.js:474-514`).
  - `subscribe` — `@tryghost/domain-events`:
    - `EmailSuppressedEvent` → sets `email_disabled` on the member (`members-api.js:523-529`).
    - `OfferCreatedEvent`, `TierCreatedEvent`, `TierPriceChangeEvent`, `TierNameChangeEvent` → create or rename Stripe coupons, prices and products (`svc/members/members-api/services/payments-service.js:40-62`).
    - `MemberCreatedEvent` → verification trigger, only when `hostSettings:emailVerification:verified` is not true (`svc/verification-trigger.js:55-57`, built at `service.js:124-146`, `:187-189`).
  - `wire` — `RequestIntegrityTokenProvider` (`service.js:174-177`), `MembersSSR` (`:179-185`), CSV importer and its three entry points (`:192-203`; the importer resolves the `storage:imports` adapter, `svc/members/import-export/index.ts:140`), exporter (`:207-211`).
- `members.api` is a getter (`service.js:221-223`) that returns the module variable `membersApi`. It is lazy only in the sense that it is read at call time; it does not build anything, and returns `undefined` before `init()`.
- Reads at start (all captured into constructors unless noted):
  - stripe — `stripeService.api.configured` / `.mode` for the check (`service.js:156`, `:163`); `stripeService.api` captured (`service.js:192`, `api.js:266`) — movable: check no (it decides whether boot fails), capture yes.
  - settings cache — `theme_session_secret` captured twice (`service.js:175`, `:181`), `members_otc_secret` captured (`api.js:78`) — movable: could be getters; today a changed secret needs a restart.
  - url utils — cookie security and path (`service.js:180`, `:183`), token issuer (`api.js:67` → `svc/members/members-config-provider.js:46-48`) — movable: could be getters.
  - signing keys — `signingKeys.service.forPurpose('members')` (`api.js:68`) — movable: yes.
  - newsletters — `newsletters.service` captured (`api.js:276`), into the member repository and router controller (`members-api.js:110`, `:238`) — movable: yes, a getter. This is the `services.ts:89` claim: verified.
  - member-attribution — `memberAttributionService.service` captured (`api.js:277`) — movable: yes.
  - offers — `offersService.api` captured (`api.js:274`) — movable: yes.
  - email-address — `emailAddressService.service` captured (`api.js:284`) — movable: yes.
  - members-metafields — `values`, `bindings`, `definitions` captured (`api.js:290`, `:293`, `service.js:53`, `:92-95`, `:207-211`) — movable: yes.
  - stripe-checkout-config — `.service.checkouts` captured (`api.js:299`) — movable: yes.
  - config `hostSettings` — decides whether to subscribe (`service.js:134`) — foundation.
  - Already lazy: tiers (`api.js:269-273`, `:296`), gifts (module object), comments (module object), jobs (`service.js:87`), email-suppression-list (module object, `api.js:21`, `:278`), labs, url service.
- Stop: none.
- Class reason: no state is loaded; the members API could be built on first read of `members.api` with the captured reads turned into getters. What must stay at boot is the declaration of six subscriptions (an offer or tier created before first use would get no Stripe price; a suppressed address would not disable its member; signups would not count toward verification) and the Stripe key/SSL check, which is a boot-failing product rule. Risk: every consumer that reads `members.ssr`, `members.verificationTrigger`, `members.importCSV` etc. as plain properties (set to `null` until init, `service.js:225-237`) would need them to be getters.
- Confidence: inferred
- Not determined: top-level code of `svc/members/middleware.js`, `content-gating.js`, `stripe-connect.js` was only grepped for subscriptions (none found), not read in full. Constructors under `members-api/` were checked by grep for subscribe/await, not read line by line, except those cited.

##### members-events — class B

- Root/step: `boot-steps.ts:387` → `svc/members-events/index.js:8`
- Effects:
  - `wire` — `LastSeenAtCache`, `LastSeenAtUpdater` (`svc/members-events/index.js:21-39`).
  - `subscribe` — `@tryghost/domain-events`: `MemberPageViewEvent` (`svc/members-events/last-seen-at-updater.js:44`), `MemberLinkClickEvent` unless `backgroundJobs:clickTrackingLastSeenAtUpdater` is false (`:60-63`), `MemberCommentEvent` (`:79`), `EmailOpenedEvent` (`:90`).
- Reads at start: settings cache `timezone`, to compute the start of the current day once (`svc/members-events/last-seen-at-cache.js:22`, `:89-93`) — movable: yes, compute on first use. Members is already lazy (`index.js:32-34`).
- Stop: none.
- Class reason: fixed subscriptions. Without them until first use, last-seen and last-commented timestamps would not be written.
- Confidence: inferred
- Not determined: whether the cached start of day is refreshed later (not read).

##### email-service ({ghostServer, jobsService}) — class C (B for subscription and stop tasks)

- Root/step: `boot-steps.ts:388` → `svc/email-service/email-service-wrapper.js:18`
- Effects:
  - `check` — `assert(jobsService)` (`email-service-wrapper.js:26`).
  - `wire` — Mailgun client and provider, i18n instance, renderer, sending service, segmenter, domain warming, batch sending, sending status, `EmailService`, `EmailController` (`:65-174`).
  - `subscribe` — legacy bus `settings.locale.edited` → `i18n.changeLanguage` (`:73-76`).
  - `register` — on `ghostServer`: a pre-stop task and a cleanup task (`:142`, `:176-191`).
- What it does with each argument:
  - `jobsService`: stored in `BatchSendingService` (`:130`, `svc/email-service/batch-sending-service.js:109`) and used only to dispatch `SendEmailJob` when an email is sent (`batch-sending-service.js:232`). Nothing is dispatched or registered at init.
  - `ghostServer`: only the two stop tasks above; skipped when there is no server (`:177-179`). On an in-process restart, init re-arms sending and registers the tasks on the new server (`:19-25`).
- Reads at start:
  - members — `membersService.api.members` captured (`:49`) into the segmenter and service (`:114`, `:158`); `membersService.verificationTrigger` captured (`:159`) — movable: yes, getters. Today these are real order dependencies on `members.init()` inside the same array.
  - audience-feedback — `audienceFeedback.service.service` captured (`:97`). This is the `services.ts:84` claim: verified — movable: yes.
  - member-attribution — `.service` and `.service.outboundLinkTagger` captured (`:96`, `:98`) — movable: yes.
  - email-address — `.service` captured (`:99`, `:109`) — movable: yes.
  - limits — `limitService` captured (`:50`, `:157`) — movable: yes.
  - settings cache — `locale` read to build i18n (`:70`) — movable: yes, on first render.
  - link-tracking — module object captured (`:58`, `:95`); `.service` read at render time (`svc/email-service/email-renderer.js:695`) — already lazy.
  - config `bulkEmail:batchCreationConcurrency` (`:43`) — foundation.
- Stop: pre-stop sets a flag so workers stop claiming batches; cleanup awaits in-flight batch sends (`batch-sending-service.js:197-222`).
- Class reason: only wiring, one subscription and two stop tasks; nothing is loaded. It could be built on first use if the captured reads became getters. The locale subscription and the stop tasks must still be declared at boot.
- Confidence: inferred
- Not determined: constructors of `EmailRenderer`, `EmailService`, `DomainWarmingService`, `SendingStatusService` were grepped for subscribe/timers (none), not read in full.

##### email-analytics (eleven arguments) — class A

- Root/step: `boot-steps.ts:389-401` → `svc/email-analytics/index.ts:52`
- Effects:
  - `wire` — `Queries`, `NewsletterEmailEventStorage`, `EmailEventProcessor`, three `EmailAnalyticsServiceWrapper`s for newsletters, automations and gifts (`svc/email-analytics/index.ts:88-203`).
  - `register` — Prometheus counters, when a client exists (`index.ts:118-121`, `svc/email-service/newsletter-email-event-storage.js:32-38`, `svc/email-service/email-event-processor.js:56-62`).
  - `other` — logs the processing mode three times (`svc/email-analytics/email-analytics-service-wrapper.ts:70-73`).
- Reads at start: members — `members.api.members` is evaluated by the caller (`boot-steps.ts:396`) and captured into the event storage (`index.ts:96`) — movable: yes, pass a getter; gifts — `giftDeliveryService` captured inside a factory closure (`index.ts:202`) — movable: yes; email-suppression-list — module object captured (`index.ts:102`), methods called at use — already lazy; settings cache passed as an object and read when Mailgun is fetched (`email-analytics-service-wrapper.ts:61-62`) — already lazy; config `bulkEmail:mailgun:tag`, `emailAnalytics:batchProcessing` — foundation.
- Stop: none.
- Class reason: only wiring and metric registration. Nothing is fetched or scheduled here (the recurring jobs are registered in `initJobs`).
- Confidence: inferred
- Not determined: nothing

##### webhooks.listen() — class B

- Root/step: `boot-steps.ts:402` → `svc/webhooks/index.js:6`
- Effects:
  - `wire` — serializer, payload builder, `WebhookTrigger` (`svc/webhooks/index.js:22-24`).
  - `subscribe` — legacy bus: 30 named events (`site.changed`, post, page, tag, member, tag attach/detach), one listener each, skipped if already registered (`svc/webhooks/listen.js:3-38`, `:43-63`).
- Reads at start: limits — `limitService` captured (`index.js:8`, `:24`), read per event (`svc/webhooks/webhook-trigger.js:30`) — movable: yes; url service captured (`index.js:10`, `:22`); members is a closure (`index.js:19-20`) — already lazy; config `security:allowWebhookInternalIPs` (`webhook-trigger.js:22`) — foundation.
- Stop: none.
- Class reason: fixed subscriptions. Without them until first use, no outgoing webhook would fire.
- `services.ts:91-92` "webhooks listen after Mentions": webhooks read nothing from Mentions. Both add listeners to the same legacy bus for `post|page.published`, `.published.edited`, `.unpublished` (`svc/mentions/mention-sending-service.js:53-58`, `svc/webhooks/listen.js:54`), so the order only decides which listener runs first. Neither handler changes the model (`mention-sending-service.js:61-103`, `webhook-trigger.js`), so I found no behaviour that depends on it.
- Confidence: inferred
- Not determined: `serialize.js` and `payload.js` factories were not read.

##### link-tracking — class B

- Root/step: `boot-steps.ts:403` → `svc/link-tracking/index.js:13`
- Effects:
  - `wire` — post link repository, click repository, `LinkClickTrackingService` (`svc/link-tracking/index.js:45-65`).
  - `subscribe` — `@tryghost/domain-events` `RedirectEvent` (`svc/link-tracking/link-click-tracking-service.js:88-94`, `:271-272`).
- Reads at start: link-redirection root — `.extras.linkRedirectRepository()` (throws before that root's init, `svc/link-redirection/index.ts:12-21`) and `.service`, both captured (`index.js:36`, `:47`, `:58`) — movable: yes, getters; it is earlier in `services.ts:54-57`. Url utils object captured (`index.js:62`).
- Stop: none.
- Class reason: one fixed subscription. Without it until first use, link clicks would not be recorded.
- Confidence: inferred
- Not determined: nothing

##### email-suppression-list — class B

- Root/step: `boot-steps.ts:404` → `svc/email-suppression-list/mailgun-email-suppression-list.js:139`
- Effects:
  - `wire` (on import) — `MailgunClient` and the list instance (`svc/email-suppression-list/service.js:7-15`).
  - `subscribe` — `@tryghost/domain-events`: `EmailBouncedEvent`, `SpamComplaintEvent` (`mailgun-email-suppression-list.js:180-181`).
- Reads at start: none beyond foundation (models).
- Stop: none.
- Class reason: two fixed subscriptions. Without them, bounces and complaints would not create suppressions.
- Confidence: inferred
- Not determined: nothing

##### content-import — class A

- Root/step: `boot-steps.ts:405` → `svc/content-import/index.ts:110`
- Effects:
  - `wire` — `GhostMailer`, posts repository, run store, `ContentCSVImporter` (`svc/content-import/index.ts:31-105`). Every collaborator is a closure: media inliner (`:72-74`), jobs (`:87`), storage adapter (`:88-90`), url service (`:96-100`), settings (`:103`).
- Reads at start: none beyond foundation.
- Stop: none.
- Class reason: only constructs objects; `importCSV` and `handleJob` could build it on first call instead of throwing "used before init" (`index.ts:115-117`, `:132-134`).
- Confidence: inferred
- Not determined: `ContentCSVImporter` and `ImportRunStore` constructors were not read.

##### machine-payments — class C

- Root/step: `boot-steps.ts:406` → `svc/machine-payments/index.js:25`
- Effects:
  - `wire` — deposit address store, payment recorder, event repository, content loader, pricing, MPP adapter, `MachinePaymentsService` (`svc/machine-payments/index.js:38-71`).
  - `check` (soft) — `x402Adapter.init()` parses `machinePayments:x402:*` config and decides whether the adapter is added (`index.js:56-59`, `svc/machine-payments/adapters/x402-adapter.ts:232-256`); no I/O.
  - `load` (network, awaited, only when enabled) — if `isEnabled()` (labs + settings + Stripe connected, `index.js:76`, `svc/machine-payments/service.ts:111-117`), gets or creates a Stripe crypto deposit address for two networks (`index.js:80-83`). A cached address in the settings cache returns at once (`svc/machine-payments/stripe/deposit-address-store.ts:118-123`, `:162`); otherwise it calls Stripe and writes the setting (`:138-160`, `:186-`). Failures are warned, not thrown (`index.js:85-89`).
- Reads at start: labs, settings cache, settings helpers (Stripe connected) to decide whether to pre-mint (`index.js:76`) — movable: yes; the store already creates on demand (`deposit-address-store.ts:118-136`) and `challengeOrFulfill` already awaits `init()` (`index.js:112-114`).
- Stop: none.
- Class reason: the pre-mint is a warm-up that the request path can already do. Change: build synchronously and pre-mint in the background. Risk: `isEnabled()` and `isPurchasable()` return false until init has finished (`index.js:96-110`), so they must not depend on the warm-up; the first paid request may wait on Stripe.
- Confidence: inferred
- Not determined: `createStripeDepositAddressClient` and the rest of `#persist` were not read.

#### Who reads whom during init

Inside the ten:

| Reader                         | Reads                                          | Evidence                                                              | Real order dependency?                                                                                    |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| email-service                  | members (`api.members`, `verificationTrigger`) | `svc/email-service/email-service-wrapper.js:49`, `:159`               | Yes. Works only because `members.init()` is earlier in the array and fully synchronous. Could be getters. |
| email-analytics (its argument) | members (`api.members`)                        | `boot-steps.ts:396`                                                   | Yes, same reason. Could be a getter.                                                                      |
| email-service                  | link-tracking                                  | `email-service-wrapper.js:58`, `:95`; used at `email-renderer.js:695` | No, module object, read at use.                                                                           |
| email-analytics                | email-suppression-list                         | `boot-steps.ts:394`; `svc/email-analytics/index.ts:102`               | No, the instance exists on import.                                                                        |
| members                        | email-suppression-list                         | `svc/members/api.js:21`, `:278`                                       | No, module object.                                                                                        |
| members-events                 | members                                        | `svc/members-events/index.js:32-34`                                   | No, closure.                                                                                              |
| webhooks                       | members                                        | `svc/webhooks/index.js:19-20`                                         | No, closure.                                                                                              |

None of the ten reads identity-tokens, webhooks, content-import or machine-payments.

Roots listed before the step in `services.ts`:

| Reader         | Reads                                | Evidence                             | Claim in `services.ts`                                     |
| -------------- | ------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| members        | newsletters `.service`               | `svc/members/api.js:276`             | `:89` verified (captured; could be a getter)               |
| members        | member-attribution `.service`        | `svc/members/api.js:277`             | not stated                                                 |
| email-service  | audience-feedback `.service.service` | `email-service-wrapper.js:97`        | `:84` verified (captured; could be a getter)               |
| email-service  | member-attribution `.service`        | `email-service-wrapper.js:96`, `:98` | not stated                                                 |
| webhooks       | mentions                             | none                                 | `:91-92` not a read; listener order on the legacy bus only |
| any of the ten | stats                                | none found by grep of require paths  | not claimed                                                |

Other order dependencies of the group on earlier things: members → stripe (`svc/members/service.js:156`, `:163`, `:192`), signing keys (`api.js:68`), offers (`api.js:274`), email-address (`api.js:284`), members-metafields (`api.js:290-293`), stripe-checkout-config (`api.js:299`), settings; identity-tokens → signing keys; link-tracking → link-redirection (`svc/link-tracking/index.js:36-58`); email-service → limits, email-address, settings; the step → gifts (`boot-steps.ts:382`).

### Part 6: jobs, ready and background

All paths relative to repo root. Everything is `inferred` (read, nothing run).
Abbreviations: `JS` = `ghost/core/server/services/jobs-service/jobs-service.ts`,
`IMB` = `ghost/core/server/adapters/jobs/InMemoryJobsBackend.ts`,
`BS` = `ghost/bootstrap/transition/boot-steps.ts`,
`BG` = `ghost/bootstrap/transition/background-steps.ts`.

Wiring of the steps: `ghost/bootstrap/app.ts:112-118` (`jobs.run = legacySteps.jobs`, `after: afterJobs`, `ready.run = legacySteps.ready`, then `background`).
The runner object itself is built earlier, in the services list (`ghost/bootstrap/services.ts:76` -> `BS:604-607` -> `jobs-service/index.ts:19-73`), and its shutdown is registered on the HTTP server in `BS:132-148` (`services.ts:47`). Neither is in my entries but both matter below.

---

#### Jobs step (`initJobs`, `BS:416-461`)

##### jobs step itself — class B

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:416`
- Effects:
  - `other` — `require`s gifts, email-service, email-analytics, mentions, media-inliner, content-import, members/jobs, members, tinybird-sync, update-check, signing-keys, importer, auth cleanup (`BS:418-434,457`). All were already loaded by earlier steps except possibly `tinybird-sync` (builds its service on import, `ghost/core/server/services/tinybird-sync/index.ts:8-17`, wire only) and `update-check` (on import requires all API endpoints, `ghost/core/server/services/update-check/index.js:1`).
  - `check` — five `assert`s that gift service, mentions controller, mentions sending service, `membersService.handleImportJob`, email service exist (`BS:435-439`); boot fails if not.
- Reads at start: see `registerJobHandlers` below.
- Stop: none of its own.
- Class reason: the step is an ordering wrapper: build two small things, register handlers, start runner.
- Confidence: inferred
- Not determined: nothing

##### memberJobs.init() — class A

- Root/step: `ghost/core/server/services/members/jobs/index.js:34` (called `BS:433`)
- Effects:
  - `wire` — builds two closures `cleanTokens` / `cleanExpiredComped` over db, models, legacy events bus, sentry (`members/jobs/index.js:39-47`). Idempotent (`:35-37`).
- Reads at start: none beyond foundation (`data/db`, `models`, `lib/common/events` object, sentry).
- Stop: none
- Class reason: only wires closures; the tasks are looked up at job run time through `getTasks()` (`:22-29,50-56`), so it could be built on first use.
- Confidence: inferred
- Not determined: nothing

##### site importer init (`data/importer.init({jobsService})`) — class A

- Root/step: `ghost/core/server/data/importer/index.js:18` (called `BS:434`)
- Effects:
  - `wire` — `new ImportManager({...})` storing dependencies only (`data/importer/index.js:22-31`, `data/importer/import-manager.js:31-58`).
  - `wire` — `new GhostMailer()` (`index.js:27`), `createContentFileHandlers()` / `createContentFileImporters()` (`index.js:25-26`).
- Reads at start: adapter manager — `getAdapter('storage:imports')` (`index.js:24`) — movable: yes, could be a getter (comment at `:19-21` says it is captured per boot on purpose so a test restart picks up new config). `jobsService` instance captured (`import-manager.js:41`), used only at `dispatch` (`import-manager.js:427`).
- Stop: none
- Class reason: constructs objects only.
- Confidence: inferred
- Not determined: did not read `GhostMailer` constructor, `content-files.ts` factories, or the rest of the `ImportManager` constructor after line 58.

##### registerJobHandlers({...}) — class B

- Root/step: `ghost/core/server/services/jobs-service/register-job-handlers.ts:75` (called `BS:440-458`)
- Effects: `register` x18 — `jobsService.handle(JobClass, handler, options?)`; each call stores a deliverer in the service's in-memory registry and, if options are given, a queue declaration (`JS:111-132`, `JS:134-165`). A second registration of a type throws (`JS:122-126`). No I/O.

  | Job type (class)                       | Queue / concurrency                                       | What the handler calls                             | Instance needed at registration?                                                                        |
  | -------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | EmailAnalyticsFetchLatestJob           | own queue (= type), 2 (`register-job-handlers.ts:98-107`) | `newsletters.startFetch()`                         | captured: `emailAnalytics.getNewsletters()` (`BS:443`; asserts built, `email-analytics/index.ts:37-40`) |
  | EmailAnalyticsAutomationFetchLatestJob | own queue, 2                                              | `automationAnalytics.startFetch()`                 | captured: `getAutomations()` (`BS:442`)                                                                 |
  | EmailAnalyticsGiftFetchLatestJob       | own queue, 2                                              | `gifts.startFetch()`                               | captured: `getGifts()` (`BS:441`)                                                                       |
  | CleanTokensJob                         | default lane                                              | `memberJobs.cleanTokens()` (`:109-111`)            | module object; tasks looked up when the job runs (`members/jobs/index.js:50-52`)                        |
  | CleanExpiredCompedJob                  | default                                                   | `memberJobs.cleanExpiredComped()` (`:113-115`)     | looked up at run                                                                                        |
  | CleanGiftsJob                          | default                                                   | `giftService.cleanup()` (`:117-119`)               | captured: `giftService.service` (`BS:446`)                                                              |
  | SendGiftRemindersJob                   | default                                                   | `giftService.processReminders()` (`:121-123`)      | captured                                                                                                |
  | ExternalMediaInlinerJob                | default                                                   | `mediaInliner.inline(job.domains)` (`:125-127`)    | captured: `mediaInliner.service` (`BS:447`)                                                             |
  | ContentCSVImportJob                    | default                                                   | `contentImport.handleJob(job)` (`:129-131`)        | module; importer looked up at run (`content-import/index.ts:131-137`)                                   |
  | ContentImportJob                       | default                                                   | `siteImporter.executeImport(job)` (`:133-135`)     | captured: instance built in this step (`BS:434`)                                                        |
  | MembersImportJob                       | default                                                   | `membersService.handleImportJob(job)` (`:137-139`) | module object; property read at run, set by members init (`members/service.js:203`)                     |
  | UpdateCheckJob                         | default                                                   | `updateCheck({rethrowErrors:true})` (`:141-143`)   | module function; builds its service per run (`update-check/index.js:20-67`)                             |
  | CheckSigningKeysJob                    | default                                                   | `signingKeys.check()` (`:145-147`)                 | captured: `signingKeys.service` (`BS:456`)                                                              |
  | ClearExpiredAuthRowsJob                | default                                                   | `authCleanup.clearExpired()` (`:149-151`)          | module function; requires knex at run (`auth/better-auth/cleanup.ts:55-57`)                             |
  | ProcessWebmentionJob                   | `webmentions`, 3 (`:35,153-159`)                          | `mentionsController.processWebmention(job)`        | captured: `mentionsService.service.controller` (`BS:448`)                                               |
  | SendWebmentionsJob                     | `webmentions`, 3 (`:161-167`)                             | `mentionsSendingService.sendWebmentions(job)`      | captured (`BS:449`)                                                                                     |
  | SendEmailJob                           | `email`, 2 (`:40,169-173`)                                | `emailService.handleSendEmailJob(job)`             | captured: `emailService.service` (`BS:451`)                                                             |
  | TinybirdSyncJob                        | own queue, 1 (`:175-181`)                                 | `tinybirdSync.sync()`                              | module; service built on import                                                                         |

- Reads at start: gifts, email-analytics (x3), media-inliner, mentions (x2), email-service, signing-keys — each reads `.service` / getter once and the handler closes over the value (`BS:441-456`) — movable: yes, every one could be `() => x.service.method()` resolved when the job runs (the pattern already used for memberJobs, contentImport, membersService). Risk: failure moves from the boot asserts (`BS:435-439`) to the first job of that type.
- Stop: `clearHandlers()` exists for in-process restarts only (`JS:360-365`, called from `jobs-service/index.ts:24-27`).
- Class reason: a fixed list of 18 (type -> handler, queue) declarations. Nothing is run. The only real order dependency is the captured instances, all of which could be looked up at run time.
- Confidence: inferred
- Not determined: nothing

##### jobsService.start() — class E

- Root/step: `ghost/core/server/services/jobs-service/jobs-service.ts:242` (called `BS:459`)
- Effects — default configuration (in-memory backend, outbox off):
  - `other` — `backend.start({processor, queues, onSettled})` (`JS:243-247`). In `InMemoryJobsBackend.start` this validates declared concurrencies, stores the processor, clears the stopped flag and creates one `fastq` queue per declared queue (`IMB:89-110`). **No polling loop, no timer, no DB read, no network.** Work then flows only when something calls `enqueue` or a recurring timer ticks.
  - `other` — logs `jobs.started` (`JS:261-271`); warns if the outbox was requested but unavailable (`JS:255-259`).
- Effects — outbox active (config `services:jobs:outbox.enabled` AND MySQL, `jobs-service/index.ts:34-37`):
  - `load` — `#releaseSubmitted`: SELECT stale submitted rows from `jobs_outbox`, then UPDATE/DELETE them (`JS:249`, `JS:285-303`, `jobs-service/jobs-outbox.ts:176-202`). Awaited, so it is in the boot path.
  - `listen` — `relay.start()` starts a loop that drains the outbox and then sleeps `pollIntervalMs` (default 30000) or until woken (`JS:253`, `jobs-service/outbox-relay.ts:51-57,74-94`). Each drain is a transaction with `FOR UPDATE SKIP LOCKED` (`jobs-outbox.ts:99-119`).
  - `schedule` — lease timer, `setTimeout` every `leaseMs/4` (default 120000/4), renewing held rows and releasing stale ones (`JS:254`, `JS:309-340`).
- On import: `IMB:21` calls `later.date.localTime()` (global switch of the cron library to local time).
- Must handlers be registered before start? Partly:
  - The handler registry is read per delivery (`JS:389-390`), and `handle()` has no "already started" guard (`JS:111-132`), so a handler registered after start is found by later deliveries.
  - Queue declarations are handed to the backend only at start (`JS:245`). A type registered after start still gets its `routing.queue` stamped on dispatch (`JS:367-376`), but the in-memory backend creates that lane lazily at the default concurrency (3), not the declared one (`IMB:126-133`). So late registration silently loses declared concurrency.
  - With the outbox: `#releaseSubmitted` at start decides replay-vs-drop using `#notReplayed`, filled by `handle()` (`JS:128-130`, `JS:287`). A type registered after start is treated as "replays" at that moment.
  - A job delivered before its handler exists: `#process` throws `IncorrectUsageError` (`JS:389-397`); the in-memory backend logs it and settles it `dead`, with no retry (`IMB:150-154`). The job is lost. (Comment `JS:392-394` says a durable backend could retry; none exists in the repo.)
  - Before start, `enqueue` and `scheduleRecurring` on the in-memory backend throw (`IMB:121-125`, `IMB:183-187`).
- Reads at start: none beyond its own state and the DB handle.
- Stop: `shutdown(options)` (`JS:342-355`): stops the relay loop and waits for it (`outbox-relay.ts:67-72`); `backend.shutdown` sets stopped, clears every recurring `later` timer, `kill()`s each queue (drops jobs not yet started), waits for in-flight jobs up to `timeoutMs` (default 10000; boot passes `server:shutdownTimeout`), then discards queues, held ids, processor (`IMB:215-238`); finally clears the lease timer and awaits the last lease tick. Registered as a server cleanup task only when there is an HTTP server (`BS:132-148`). After shutdown `enqueue`/`scheduleRecurring` are silently dropped (`IMB:117-119,179-181`).
- Class reason: this is the worker. In the default setup "start" is one synchronous assignment; with the outbox it is a DB sweep plus a long-running relay loop and a lease timer. Nothing a web request reads is produced by it, but request code that calls `dispatch` on the direct path needs the in-process backend started (`IMB:121-125`).
- Confidence: inferred
- Not determined: `fastq` internals not read; `lib/after-commit` not read.

---

#### After jobs (`initAfterJobs`, `BS:467-491`)

##### automationsService.init({...}) — class E (subscriptions are B)

- Root/step: `ghost/core/server/services/automations/service.ts:35` (called `BS:480-486`); singleton built on import (`automations/index.ts:3`).
- Effects:
  - `wire` — `new SoonestTimer(enqueuePollNow)` (`service.ts:51`), `enqueuePollAt` closure (`:63-99`).
  - `subscribe` — `@tryghost/domain-events`: `StartAutomationsPollEvent` -> `poll(...)` (`:101-111`); `StartAutomationsPollEvent` -> `welcomeEmailAutomationPoll(...)` (`:113-121`); `LabelAddedToMembersEvent` -> `automationsApi.notify` (`:123-125`).
  - `register` — `schedulerAdapter.register(this)` (`:127`) so key rotation can call `rescheduleAll` (`:139-141`).
  - `other` (kicks off work) — `enqueuePollNow()` dispatches `StartAutomationsPollEvent` immediately (`:129`, `:49`). That runs both polls: DB read+lock of due steps (`automations/poll.ts:387`), email sends (`poll.ts:287`), `loadMemberWelcomeEmails()` and sends (`automations/welcome-email-automation-poll.ts:304,240`), and then `enqueueAnotherPollAt` which sets an in-memory timer and schedules a signed job on the scheduler adapter (`service.ts:73-92`). `init` is not async and does not await any of this.
- The claim "automation polling sends through the runner" (`BS:464-465`, `services.ts:122`): **not what the code does.** The poll sends through `memberWelcomeEmails.service.sendAutomationEmail` / `.send` directly (`poll.ts:287`, `welcome-email-automation-poll.ts:240`); no file under `services/member-welcome-emails` references the jobs service (grep). The only runner touchpoint is after a Mailgun send: `scheduleAutomationEmailAnalyticsJob()` (`poll.ts:334`) -> `emailAnalyticsJobs.scheduleRecurringAutomationsJob(true)` (`service.ts:29-30`) -> `jobsService.getInstance().scheduleRecurring` (`email-analytics/jobs/index.js:11-14`), which throws on a backend that is not started (`IMB:183-187`). That call is inside try/catch and only logged (`poll.ts:333-336`), and the scheduler un-marks the type so the next send retries (`email-analytics/jobs/email-analytics-job-scheduler.ts:144-149`). So the real requirement is "recurring analytics registration needs a started in-process backend", and its failure is non-fatal.
- Reads at start: `urlUtils.urlFor('api', …)` (`BS:478`) — captured string — movable: yes (getter). `settingsCache.get('site_uuid')` (`BS:485`) — captured for jitter — movable: yes. `internalKeys` service (`BS:477`) — captured, only used inside `enqueuePollAt` (`service.ts:78`) — already lazy in use. `schedulerAdapter` from boot state — captured. `memberWelcomeEmails.service` — read inside the event handlers (`service.ts:106,117`) — already lazy.
- Stop: none. The `SoonestTimer` and the domain-event subscriptions are never released.
- Class reason: the three subscriptions and the adapter registration are declarations (B). The immediate poll is recovery/worker work, not something a request needs. Lost if the subscriptions did not exist until first use: `LabelAddedToMembersEvent`s emitted earlier would not notify automations, and scheduler callbacks would dispatch into nothing.
- Confidence: inferred
- Not determined: whether `domainEvents.dispatch` runs handlers synchronously (package not read); `SoonestTimer` unref behaviour; contents of `sendAutomationEmail`.

##### postScheduling.rescheduleAll() (when `schedulerAdapter.rescheduleOnBoot`) — class E

- Root/step: `ghost/core/server/services/post-scheduling/post-scheduling.ts:127` (called `BS:488-490`)
- Effects:
  - `load` — two `models.Post.findAll` queries, `status:scheduled` posts and pages (`post-scheduling.ts:146-157`); `internalKeys.get('ghost-scheduler')` (`:129`).
  - `schedule` — for each resource `adapter.unschedule(..., {bootstrap:true})` (unless the adapter dedupes) then `adapter.schedule(...)` (`:134-143`). With the default adapter: unschedule with `bootstrap` is a no-op (`ghost/core/server/adapters/scheduling/scheduling-default.ts:81-84`); schedule either appends to an in-memory list (`:66-80`) or, if due within the offset, starts a `setTimeout` that pings the job URL over HTTP (`:55-61`, `:105-146`, `:149-183`).
- Gate: `rescheduleOnBoot` is `true` on the default adapter (`scheduling-default.ts:32`), read through the wrapper (`adapters/scheduling/error-capture.ts:68-70`).
- On import (earlier, `BS:311`): `post-scheduling/index.ts:9-13` builds the singleton, which subscribes 6 legacy-bus events `post|page.scheduled/rescheduled/unscheduled` (`post-scheduling.ts:39-97`) and calls `adapter.register(this)` (`:99`); it reads `urlUtils.urlFor` and `internalKeys.service` at import (`index.ts:10,12`).
- Reads at start: internal keys — `get('ghost-scheduler')` — movable: it is the work itself. Scheduler adapter from boot state.
- Why it blocks ready: the code gives no reason; the comment only says "posts are rescheduled last" (`BS:464-465`). From the code, nothing a request reads is produced by it. Until it runs, already-scheduled posts are simply not in the in-memory scheduler. Running it _before_ ready has one visible consequence: an overdue post is pinged against Ghost's own admin API while the app is still in maintenance mode, which returns 503 and is retried every 5s up to 30 times (`scheduling-default.ts:191-197`).
- Stop: none here (the default scheduler's timers are not cleared by this service).
- Class reason: scheduler-role work (rebuild an in-memory schedule from the DB). It needs neither the job runner nor to precede serving.
- Confidence: inferred
- Not determined: `internalKeys.get` internals (may read/create the key in the DB); behaviour of non-default scheduling adapters.

---

#### Ready (`initReady`, `BS:612-643`)

##### ready: maintenance off + mount ghostApp + notifyServerReady — class D

- Root/step: `ghost/bootstrap/transition/boot-steps.ts:612`
- Effects:
  - `other` — `rootApp.disable('maintenance')` (`BS:630`); the maintenance middleware set up in `ghost/core/app.js:72-73` stops answering 503.
  - `register` — `rootApp.use(config.getSubdir(), ghostApp)` mounts the full app (`BS:631`).
  - `other` — logs "booted", optional database warning, boot-time metric (`BS:635-640`).
  - `other` — `notifyServerReady()` (`BS:642`): once per process, `process.send({ready:true, debug})` if there is an IPC channel, and/or connect-and-send to `config.get('bootstrap-socket')` (`ghost/core/server/notify.js:31-66,72-74`). The returned promise is not awaited by `initReady`.
- Reads at start: none beyond foundation (config) and boot state (`rootApp`, `ghostApp`).
- Stop: none
- Class reason: this is the moment Ghost starts serving; before it every request gets the maintenance 503.
- Confidence: inferred
- Not determined: `lib/bootstrap-socket` not read.

---

#### Background (15) — `ghost/bootstrap/background.ts:23-51`

All but the first are skipped when `NODE_ENV` starts with `test` (`background.ts:9-10`). The framework runs them in order after ready and does not wait (`background.ts:12-18`).

"Schedule" entries all go through `JobsService.scheduleRecurring` (`JS:220-224`): validates the cron, builds the envelope, calls `backend.scheduleRecurring`. On the in-memory backend that is `later.setInterval` in this process, first schedule per type wins (`IMB:178-205`). **No DB and no network in the scheduling call itself**; the outbox is not involved. It throws if the backend is not started (`IMB:183-187`).

##### inactive themes — class C

- Root/step: `BG:20-23` -> `ghost/core/server/services/themes/index.js:25` -> `themes/loader.js:7-11`
- Effects: `load` — `packageJSON.readPackages(contentPath('themes'))` reads every theme's package metadata from disk, then `themeList.init(themes)` (`loader.js:8-10`).
- Reads at start: none beyond foundation (config path).
- Stop: none
- Class reason: fills the in-memory theme list after serving has begun, so no first request depends on it today. Could be loaded on first read of the list; risk: first theme-list request slower.
- Note: the step does not return the promise (`BG:22`), so the framework cannot see a failure; a rejection becomes an unhandled rejection.
- Confidence: inferred
- Not determined: `packageJSON.readPackages` and readers of `themeList` not read.

##### interrupted email sends — class E

- Root/step: `BG:26-29` -> `ghost/core/server/services/email-service/email-service.js:261`
- Effects:
  - `load` — two `Email.findAll` queries for `pending`/`submitting` rows, stale and fresh (`email-service.js:267-269,288-290`); status-lock UPDATEs flipping stale rows to `failed` (`:272-277`) and `submitting` -> `pending` (`:340-345`); per-email `EmailBatch.findAll` for a log breadcrumb (`:366-368`).
  - `other` (enqueue) — `batchSendingService.scheduleEmail(email)` -> `jobsService.dispatch(new SendEmailJob(...))` (`:360`, `email-service/batch-sending-service.js:231-232`).
- Reads at start: `emailService.service` (`BG:28`) — must be built; jobs service instance captured by the email service at its init (`email-service/email-service-wrapper.js:18,26,130`).
- Stop: none for this scan.
- Class reason: crash recovery for the worker. Needs a started in-process runner on the direct path (`IMB:121-125`); with the outbox it only writes rows.
- Confidence: inferred
- Not determined: `updateStatusLock` internals.

##### pending gift deliveries — class E

- Root/step: `BG:33-36` -> `ghost/core/server/services/gifts/index.ts:208-233`
- Effects:
  - `schedule` — if the scheduler adapter rebuilds on boot (`gifts/index.ts:151,215`): `giftDeliveryScheduler.rescheduleAll()` (`gifts/gift-delivery-service.ts:218-220`) = `internalKeys.get`, DB query of pending times, `adapter.unschedule`/`schedule` per time (`ghost/core/server/adapters/scheduling/signed-flush-scheduler.ts:124-154`, `gifts/index.ts:103-106`).
  - `load` + send — `deliveryService.recoverPending()`: loops DB batches of recoverable deliveries and sends each (`gift-delivery-service.ts:164-192`).
- Reads at start: gifts' own module state; scheduler adapter flag captured at gifts init.
- Stop: none
- Class reason: recovery plus scheduler rebuild; worker/scheduler role. Not awaited by the step (`BG:35`), errors are caught inside (`gifts/index.ts:216-232`).
- Confidence: inferred
- Not determined: `send()` path beyond `gift-delivery-service.ts:229-246`.

##### gift cleanup job — class B

- Root/step: `BG:38-41` -> `ghost/core/server/services/gifts/jobs/index.js:22-32`
- Effects: `schedule` — recurring `CleanGiftsJob`, daily at a random second/minute and hour 0-5 (`gifts/jobs/index.js:13-19,27-29`). Guarded by a module flag (`:23-25,31`).
- Schedule: computed with `Math.random()` at scheduling time; not from config or settings. Scheduling touches neither DB nor network.
- Reads at start: jobs service instance (`BG:17`).
- Stop: runner shutdown clears the timer (`IMB:219-221`).
- Class reason: a fixed declaration (type + "daily, off-peak, jittered").
- Confidence: inferred
- Not determined: nothing

##### gift reminder job — class B

- Root/step: `BG:43-46` -> `ghost/core/server/services/gifts/jobs/index.js:34-44`
- Effects: `schedule` — recurring `SendGiftRemindersJob`, same random off-peak daily cron (`:39-41`).
- Schedule: random, not config/settings. No DB/network.
- Reads at start: jobs service instance.
- Stop: runner shutdown.
- Class reason: fixed declaration.
- Confidence: inferred
- Not determined: nothing

##### member token cleanup job — class B

- Root/step: `BG:48-51` -> `ghost/core/server/services/members/jobs/index.js:71-81`
- Effects: `schedule` — recurring `CleanTokensJob`, daily at a random time, any hour (`:15-20,76-78`).
- Schedule: random, not config/settings. No DB/network.
- Reads at start: jobs service instance.
- Stop: runner shutdown.
- Class reason: fixed declaration.
- Confidence: inferred
- Not determined: nothing

##### expired comp cleanup job — class B

- Root/step: `BG:53-56` -> `ghost/core/server/services/members/jobs/index.js:58-69`
- Effects: `schedule` — recurring `CleanExpiredCompedJob`, daily at a random time between 00:00 and 05:59 (`:63-66`).
- Schedule: random, not config/settings. No DB/network.
- Reads at start: jobs service instance.
- Stop: runner shutdown.
- Class reason: fixed declaration.
- Confidence: inferred
- Not determined: nothing

##### signing key check job — class C

- Root/step: `BG:58-64` -> `ghost/core/server/services/signing-keys/index.ts:36-43`
- Effects:
  - `wire` — stores the jobs service in a module variable (`index.ts:37`) so that a later rotation (`onRotationStarted: schedule`, `index.ts:26`) can schedule the job at that time (`:46-56`).
  - `schedule` (conditional) — only if `signingKeys.service.isRotating()` (`index.ts:40`): recurring `CheckSigningKeysJob` hourly at a random second and minute (`:52-54`).
- Schedule: random; whether it is scheduled at all is computed from settings (key state). No DB/network in scheduling.
- Reads at start: signing keys service — `isRotating()` reads key settings from the settings cache (`signing-keys/signing-key-service.ts:203-207`, `:263`) — movable: no, not easily: the result decides whether to schedule. Could be removed by always scheduling (the job's `check()` is a no-op loop when nothing is due, `signing-key-service.ts:171-181`).
- Stop: runner shutdown.
- Class reason: reads another service to decide; small change = schedule unconditionally and hand the service a way to get the runner lazily. Risk: one extra hourly job per site.
- Confidence: inferred
- Not determined: nothing

##### auth cleanup job — class B

- Root/step: `BG:66-69` -> `ghost/core/server/auth/better-auth/cleanup.ts:67-77`
- Effects: `schedule` — recurring `ClearExpiredAuthRowsJob`, daily at a random time 00:00-05:59 (`cleanup.ts:73-75`).
- Schedule: random, not config/settings. No DB/network.
- Reads at start: jobs service instance.
- Stop: runner shutdown.
- Class reason: fixed declaration.
- Confidence: inferred
- Not determined: nothing

##### email analytics jobs — class C

- Root/step: `BG:72-75` -> `ghost/core/server/services/email-analytics/jobs/index.js:44-46` -> `email-analytics/jobs/email-analytics-job-scheduler.ts:69-80`
- Effects:
  - `check`(gate, not fatal) — config `emailAnalytics:enabled` and `backgroundJobs:emailAnalytics` (`email-analytics-job-scheduler.ts:58-63,128`).
  - `load` — up to three DB queries deciding whether there were sends in the last 30 days: `emails` count (`:91-93`), `automated_email_recipients` (`:104-107`), `gift_deliveries` (`:115-118`).
  - `schedule` — for each that has recent sends: recurring fetch job every 5 minutes at a random second and minute offset (`:142-145`, `jobs-service/cron.ts:3-10`).
- Schedule: cron is random; _whether_ each is scheduled is computed from config and from the database. Scheduling touches the DB (the three queries), not the network.
- Reads at start: jobs service via `getInstance()` per call (`email-analytics/jobs/index.js:11-14`) — already lazy.
- Stop: runner shutdown.
- Class reason: the DB check exists to avoid idle timers; the same schedulers are already re-invoked lazily when something is sent (`email-service/email-service.js:243`, `gifts/index.ts:114`, `automations/service.ts:29-30`). Change: drop the boot scan and rely on those, or schedule unconditionally. Risk: sites with recent sends but no new send get no analytics fetch until the next send (first option) or every site runs three 5-minute jobs (second).
- Confidence: inferred
- Not determined: nothing

##### activitypub — class C (subscriptions are B)

- Root/step: `BG:77-80` -> `ghost/core/server/services/activitypub/activity-pub-service-wrapper.js:10-55`
- Effects:
  - `wire` — `new ActivityPubService(knex, siteUrl, logging, identityTokenService)` (`:29-34`).
  - `subscribe` — legacy bus `lib/common/events`: `settings.labs.edited`, `settings.social_web.edited`, `settings.is_private.edited` -> `configureActivityPub` (`:50-52`).
  - `load` (conditional, not awaited, `:54`) — if `social_web_enabled`: `enable()` -> `initialiseWebhooks()` (`:37-40`, `activitypub/activity-pub-service.ts:132-134,152-198`): DB read of the integration, **network** fetch to `<site>/.ghost/activitypub/v1/site/` for the webhook secret (`activity-pub-service.ts:92-96,165`), DB read of webhooks, and if they differ DELETE + INSERT (`:172-197`).
- Reads at start: identity tokens — `IdentityTokenServiceWrapper.instance` must exist or init logs an error and returns (`wrapper.js:22-25`) — captured into the constructor — movable: yes (getter). Settings cache — `get('social_web_enabled')` (`:37`) — decides whether to reconcile — the read is inside the function that also runs on settings events. URL utils — `getSiteUrl()` (`:27`) — captured — movable: yes.
- Stop: none (listeners stay on the bus).
- Class reason: the subscriptions are declarations; the boot-time reconcile is a repair pass with a network call that no request waits for. Lost if the subscriptions did not exist until first use: toggling the social web setting would not add/remove webhooks.
- Confidence: inferred
- Not determined: `getOwnerUserToken`/`getWebhookSecret` beyond the lines cited.

##### tinybird sync job — class C

- Root/step: `BG:82-85` -> `ghost/core/server/services/tinybird-sync/tinybird-sync-service.ts:79-106`
- Effects:
  - `check`(gate) — `getIngestConfig({config, settingsCache})`; returns without scheduling when traffic analytics is not configured (`tinybird-sync-service.ts:88-91`, `tinybird-sync/get-ingest-config.ts:27-43`).
  - `schedule` — recurring `TinybirdSyncJob` every 5 minutes at a random offset (`:97-100`). Throws if already scheduled (`:82-86`).
- Schedule: cron random; whether it is scheduled is computed from config (`tinybird:tracker:endpoint`, `tinybird:sync_auth_key`) and the settings cache. No DB/network in scheduling.
- Reads at start: settings cache via `getIngestConfig` — movable: yes; the job re-checks the same config on every run and returns early (`tinybird-sync-service.ts:70-74`), so it could be scheduled unconditionally.
- Stop: runner shutdown.
- Class reason: config/settings read decides whether to declare; small change = always declare. Risk: an idle 5-minute tick on unconfigured sites.
- Confidence: inferred
- Not determined: nothing (settings read is `settingsCache.get('site_uuid')`, `tinybird-sync/get-ingest-config.ts:63`).

##### update check jobs — class B

- Root/step: `BG:87-90` -> `ghost/core/server/services/update-check/index.js:85-90`
- Effects:
  - `schedule` — recurring `UpdateCheckJob`, daily at a random second/minute/hour (`index.js:69-78`).
  - `other` (enqueue, conditional) — if config `updateCheck:forceUpdate`: `jobsService.dispatch(new UpdateCheckJob())` once at boot (`:80-83,87-89`).
- Schedule: random, not config/settings; the extra boot run is config-gated. Scheduling itself: no DB/network (the boot dispatch writes an outbox row when the outbox is active, `JS:180-190`).
- Reads at start: jobs service instance. On import the module requires all API endpoints (`index.js:1`).
- Stop: runner shutdown.
- Class reason: fixed declaration plus an optional one-off enqueue.
- Confidence: inferred
- Not determined: nothing

##### remote flags — class E when configured, otherwise nothing

- Root/step: `BG:93-96` -> `ghost/core/server/services/remote-flags/index.ts:35-95`
- Effects:
  - `check`(gate) — inert unless config `remoteFlags.enabled === true` and `url` set (`index.ts:40-44`); invalid URL or interval only warns (`:48-81`).
  - `listen` — `instance.start()` (`:92`): immediate `refresh()` (network fetch of the manifest) then a recurring unref'd `setTimeout` chain (`remote-flags/remote-flags-service.ts:200-218,224-231`). Applies overrides into `shared/labs-flag-overrides` (`index.ts:86`), which `shared/labs.js:20` reads.
- Schedule: interval computed from config (`pollInterval`, floor 60s) plus random jitter (`index.ts:62-81`, `remote-flags-service.ts:209`). Starting it touches the network, not the DB.
- Reads at start: settings cache — `get('site_uuid')` (`index.ts:46`) captured into the constructor — movable: yes (getter).
- Stop: `stop()` exists (`index.ts:101-106`) but nothing in `ghost/bootstrap` or `ghost/core/server` calls it (grep); the timer is unref'd.
- Class reason: a per-process poller that changes what `labs` answers in that process. Every process that evaluates flags needs its own.
- Confidence: inferred
- Not determined: `refresh()` body only skimmed.

##### milestones (`initAndRun`) — class B (the run itself is worker-role)

- Root/step: `BG:99-102` -> `ghost/core/server/services/milestones/service.js:116-120`
- Effects:
  - `subscribe` — `slack-notifications.init()` builds the Slack service and calls `subscribeEvents()` on `@tryghost/domain-events` (`service.js:35`, `milestones/slack-notifications/service.js:41-64`).
  - `wire` — repository, queries, `MilestonesService` (`service.js:44-58`).
  - `schedule` — one `setTimeout` that later runs the milestone checks (`service.js:101-106`). Delay is `JOB_TIMEOUT` = 0, 1, 2 or 3 days chosen with `Math.random()` at module load (`service.js:6`), or 5s in development (`:87-90`). Not unref'd, never cleared, fires once per process.
- Schedule: random constant, not config/settings. Scheduling touches neither DB nor network; the run does (`service.js:65-78`).
- Reads at start: config (`milestones`, `hostSettings`) and URL utils `getSiteUrl()` captured by the Slack service (`slack-notifications/service.js:47-61`) — movable: yes.
- Stop: none
- Class reason: a subscription and a one-off timer. Lost if the Slack subscription did not exist until first use: a milestone event from an earlier run would not be posted.
- Confidence: inferred
- Not determined: `subscribeEvents()` and `checkMilestones()` bodies not read.

---

#### Job runner as a separate role

##### What must be true before the runner starts today

- The runner object must exist: `jobs-service.init({knex, config})` (`BS:604-607`, `jobs-service/index.ts:19-73`). It resolves the `jobs` adapter and, if enabled on MySQL, builds the outbox store/relay. `getInstance()` throws before that (`index.ts:75-82`).
- Services that hold the runner captured it earlier and need the _same_ object: mentions reads `getInstance()` during its init (`mentions/index.ts:23`; reason stated at `jobs-service/index.ts:20-23`), the email service receives it at init (`email-service/email-service-wrapper.js:18,26,130`), the site importer in this step (`BS:434`).
- Handler registration captures already-built instances of 8 things: email-analytics newsletters/automations/gifts wrappers, gift service, media inliner, mentions controller, mentions sending service, email service, signing-key service (`BS:441-456`). Five are asserted (`BS:435-439`). The other handlers resolve at run time (table above). None of the captures is required by the runner; each could be a closure.
- Queue declarations must be registered before start to take effect (`JS:245`, `IMB:126-133`).

##### What starts after it and blocks ready, and does it need the runner in-process

- `automationsService.init` (`BS:480-486`): does not send through the runner. Its only runner use is a recurring-job registration after a Mailgun send, already try/caught (`poll.ts:333-336`). It needs the domain-events bus and the scheduler adapter, not the runner.
- `postScheduling.rescheduleAll()` (`BS:488-490`): uses the scheduling adapter and the DB only. No job-runner call anywhere in `post-scheduling.ts`.
- So neither blocking item needs the runner in the same process, and neither produces anything a request reads.

##### Who enqueues

One-off dispatch: 8 call sites in `ghost/core/server` (grep for `.dispatch(` on the jobs service), 7 outside boot:

- `ghost/core/server/services/mentions/mention-controller.js:131` — incoming webmention (described as triggered by unauthenticated requests, `register-job-handlers.ts:29-30`)
- `ghost/core/server/services/mentions/mention-sending-service.js:93`
- `ghost/core/server/services/members/service.js:87` — members CSV import
- `ghost/core/server/services/media-inliner/index.ts:43`
- `ghost/core/server/services/content-import/index.ts:87` — content CSV import
- `ghost/core/server/data/importer/import-manager.js:427` — site import upload
- `ghost/core/server/services/email-service/batch-sending-service.js:232` — newsletter send
- `ghost/core/server/services/update-check/index.js:82` — boot only

Recurring registration: 10 call sites of `scheduleRecurring`. Seven are boot-only (background list). Reached again at request/event time: `email-service/email-service.js:243` (after scheduling a newsletter), `gifts/index.ts:114` (gift delivery analytics), `automations/poll.ts:334`, and `signing-keys/index.ts:26,54` (on rotation start).
I did not trace each call site back to a specific HTTP endpoint.

Does enqueueing need a started runner in the same process?

- Direct path (outbox off — the schema default, `jobs-service/outbox-config.ts:4`): yes. `dispatch` calls `backend.enqueue` (`JS:198-202`, `JS:207-209`), which pushes onto a `fastq` queue in this process and throws if `start` has not run (`IMB:112-138`). The job only ever exists in the memory of the process that enqueued it.
- Outbox path (config `services:jobs:outbox.enabled` and MySQL, `jobs-service/index.ts:34-37`; enabled in `shared/config/env/config.development.json:5-9` and both testing configs, not in `defaults.json`): no. `dispatch` inserts a row into `jobs_outbox`, optionally in the caller's transaction, and wakes the local relay (`JS:180-190`, `jobs-outbox.ts:87-97`). Any process whose `JobsService` is started claims rows with `FOR UPDATE SKIP LOCKED` (`jobs-outbox.ts:99-119`) and hands them to _its own_ backend. The lease logic is written for several processes per site (`JS:282-284`). A relay in another process finds the row only on its poll (default 30s, `outbox-config.ts:11`), because `wake()` is in-process (`outbox-relay.ts:62-65`).
- `scheduleRecurring`: always needs the started in-process backend. There is no outbox path (`JS:220-224`) and the in-memory backend keeps a `later` timer per type per process (`IMB:194-204`).

Backends: the adapter type `jobs` is pluggable (`ghost/bootstrap/adapters.ts:27,48`; contract in `packages/adapters/jobs-base/src/base.ts:63-95`). The only implementation in the repo is `InMemoryJobsBackend` (`ghost/core/server/adapters/jobs/` has one file), and it is the default (`ghost/core/shared/config/defaults.json:70-75`). The DB-backed part is the outbox table in front of the backend, not a backend.

##### In-process state shared between a job handler and the web side

Proven:

- **Email analytics fetch state.** The Admin API reads and writes the newsletters wrapper's in-memory state: `analyticsStatus` returns `service.getStatus()` (`ghost/core/server/api/endpoints/emails.js:129-138`), `scheduleAnalytics` / `cancelScheduledAnalytics` set `#fetchScheduledData` (`emails.js:164,176`; `email-analytics/email-analytics-service.ts:315-350`). The job handler calls `startFetch()` on the same object, which runs `fetchScheduled` and updates that state (`email-analytics/email-analytics-service-wrapper.ts:222-293`, `:265`). In two processes the API would report and schedule on an object the job never sees.
- **Settings cache.** Default cache adapter is `MemoryCache` (`defaults.json:51-56`), kept current by the in-process legacy bus (`ghost/core/shared/settings-cache/cache-manager.js:289-291`). The signing-keys job writes key settings through `Settings.edit` in a transaction (`signing-keys/signing-key-service.ts:285-297`) and every reader takes keys from the settings cache (`signing-key-service.ts:263`). The update-check job calls `api.settings.edit` (`update-check/update-check-service.js:89,238`). A web process would keep the old values.
- **Legacy event bus.** The comp-cleanup job emits `member.edited` on `lib/common/events` (`members/jobs/clean-expired-comped-task.ts:200`); only listeners in the job's process see it.
- **Recurring registrations made from the web side** (list above) land in the calling process's backend.
- **Email send shutdown state** (`#shuttingDown`, `#inFlight`, `email-service/batch-sending-service.js:57-58,213-220`) lives with the handler; it is only an issue if shutdown hooks run in a different process from the send.

Not checked: URL service (it is `LazyUrlService` built over model lookups, `services/url/index.js:1-7`; grep found no event listeners under `services/url`, but I did not read it); what the import handlers (site import, members import, content import) change in memory; mentions and gift handlers' events; media inliner; any non-default cache adapter.

##### Is a separate runner role feasible in Ghost as it is

From the evidence above only:

- **With the default configuration (in-memory backend, outbox off): no.** A job exists only in the memory of the process that dispatched it, and dispatch throws in a process whose backend was not started (`IMB:121-125`).
- **With the outbox active (MySQL): one-off jobs already cross processes by design.** A web-role process would need the `JobsService` built (so `getInstance()` and `dispatch` work) but not started; a runner-role process would run `registerJobHandlers` + `start()`. The row is picked up on the runner's next poll (up to 30s by default).
- What it would take beyond that, each item tied to something read:
  1. The runner role still has to build nearly every service: 8 handlers capture live service instances and the rest reach members, gifts, importers, email, signing keys at run time (table above). It is the same application minus mounting/listening, not a thin worker.
  2. `scheduleRecurring` calls made at request/event time (4 sites) throw in a web role with an unstarted backend. Three are caught and logged; the result is that analytics fetch jobs would never be registered from the web side. They need a cross-process path or to be declared unconditionally in the runner.
  3. Recurring timers are per process (`IMB:194-204`): more than one runner process would each fire every recurring job.
  4. The proven shared state must be dealt with: email analytics status/schedule endpoints, settings written by jobs (signing keys, update check) reaching the web process's settings cache, and legacy-bus events emitted by jobs.
  5. Boot order: `initJobs` would have to become "register + start only in the runner role", and the background entries that schedule or recover (all but inactive themes, activitypub reconcile, remote flags) belong to that role. `remote flags` must run in every role that evaluates flags.
  6. Runner shutdown is registered only when an HTTP server exists (`BS:139-147`); a runner-only process needs its own shutdown path.
- I did not find anything that makes the two blocking after-jobs items (`automationsService.init`, `postScheduling.rescheduleAll`) depend on the runner being in the same process.
