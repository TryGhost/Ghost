# Framework spike 2: tests changed in stage 3

These are the reports of the five delegated passes that adapted unit tests and tooling tests to the
changed `defineService`, as they were handed back. Status: **inferred**. Each pass ran the files it
names; the lists were not re-checked line by line afterwards. The full unit suite and the MySQL
suites were run on the result (see the main report).

## Batch A

All nine assigned files pass (59 tests) and have no type errors; formatted with tools/scripts/format.ts. The additional run (editor-presence, segments, posts-public, tags-public, audience-feedback, members, gifts, link-tracking, email-service) passes as it stands: 88 files, 1702 tests, so I changed nothing there. No tests were deleted outright and no source files were touched.

All paths below are under ghost/test/unit/server/services/.

**member-attribution/index.test.ts** — passes

- `openServices()` added to `beforeEach`; every `await root.init()` removed; `init()` dropped from the local `Root` type.
- "retains the same usable graph across repeated initialization" is now "retains the same usable graph across repeated use". The "throws before init" assertions and the second `init()` are gone; it still asserts the same service, builder and tagger on repeated reads and their behaviour.
- "allows initialization to retry after a URL prerequisite throws" is now "fails the first use when a URL prerequisite throws, and builds on a later use". The first read of `root.service` throws the failure and the next read builds.
- "retries a failed composition after its helpers have been created" is now "builds again after a composition that failed once its helpers had been created", converted the same way.
- "captures parser URLs at init while retaining live tracking callbacks" is retitled "captures parser URLs when built ...".

**comments/index.test.ts** — passes

- `openServices()` in `beforeEach`, `init()` lines removed.
- "resolves the current Email renderer only when creating an unsubscribe link" now builds by reading `root.service.api.emails`, then asserts the renderer getter was not called.

**users/index.test.ts** — passes

- "loads the users endpoint through the API registry before the service is ready" is now "... before services can be built". The endpoints are loaded while services are still closed, then `openServices()`. The "throws before init" assertion is removed.
- "passes the boot-owned instance to resetAuthentication on every reset" is now "passes the application's instance ...", with `init()` replaced by `openServices()`.
- "shares the boot-owned instance between both endpoints" is now "shares one instance between both endpoints", converted the same way.

**audience-feedback/index.test.ts** — passes

- `openServices()` in `beforeEach`.
- "captures the home URL at initialization and retains the complete composition on repeated init" is now "captures the home URL on first use and retains the complete composition on later use". Repeated `init()` became repeated reads; it still asserts `urlFor` is called once.
- "keeps the retained controller connected to its repository and live URL routing" only lost its `init()` calls.
- "propagates home URL construction failure and permits a later initialization attempt" is now "fails the first use when the home URL cannot be built, and builds on a later use".

**stripe-checkout-config/index.test.ts** — passes

- "acquires the database only at init, and keeps the same services across later inits" is now "acquires the database only on first use, and keeps the same services afterwards". knex is not read after `openServices()`, is read once on first use, and stays at once on a later read.
- "refuses to start before the custom fields services are set up" is now "refuses to build before the custom fields services are set up, and builds once they are". It asserts the root's own `IncorrectUsageError` message, so it cannot be confused with the "cannot build services" error, then sets bindings and fields and asserts the next use builds.
- The fake metafields object declares both keys up front as `undefined`, because the root's `import *` copy only reads keys that existed at load time.

**export-requests/root.test.ts** — passes

- `beforeEach` now calls `openServices()` and reads `root.service` while the transport is still substituted, so the service captures the stub. No test bodies or titles changed.

**upgrades/index.test.ts** — passes

- "constructs one service backed by the configured adapter" now uses `openServices()` and drops the second `init()`.
- The root and `UpgradeService` are loaded with `require` instead of `import`. An ESM `import` in a test loads a second copy of the root, bound to a different application than the one `openServices()` opens, which gave "cannot build services" and a failing `instanceof`.

**newsletters/index.test.ts** — passes

- `beforeAll(init)` became `beforeEach(openServices)`. No test changes.

**internal-keys/index.test.ts** — passes

- `beforeAll(init)` became `openServices()` plus `internalKeys = root.service` in `beforeEach`. No test changes.
- The existing save/restore of map entries around each test is now redundant, since each test gets a fresh map; I left it for minimal change.

**Source problems found:** none. One hazard worth knowing for the other batches: any unit test that takes a service root (or a class it checks with `instanceof`) through an ESM `import` rather than `require` gets a separate module copy and a separate application, so `openServices()` has no effect on it. `test/utils/services.ts` documents this for the application itself, but not for roots imported by tests.

## Batch B

All 10 assigned files pass (86 tests), have no type errors, and are formatted. Only those 10 files were touched.

### Per file

**stats/index.test.ts** — passes (15)

- Deleted: `guards the service until init has resolved` (old "throws before init / init resolves undefined" contract).
- Deleted: `retains the first aggregate on repeated init, even once the cache is enabled` (second `init()` keeps the instance).
- Rewritten: `rejects init without publishing when the database connection is unavailable, then allows a retry` is now `fails the first use when the database connection is unavailable, and builds on a later use`.
- Rewritten: `rejects init without publishing when the cache adapter fails, then retries the whole aggregate` is now `fails the first use when the cache adapter fails, and builds the whole aggregate on a later use`.
- Retitled: `lets the Admin stats endpoint load before init…` is now `…before services can be built…`; it still asserts the endpoint rejects with `IncorrectUsageError` while services are closed.
- Retitled: `…keeps the Tinybird instance from init…` is now `…it was built with…`.
- Other tests: `init()` replaced by `openServices()`, with side-effect assertions (adapter lookup, Tinybird init) moved after the first read of `root.service`.

**tiers/index.test.ts** — passes (9)

- Deleted: `exports one root, with nothing published or loaded before init` (old contract).
- Deleted: `keeps the same repository and API across later init calls, reading nothing` (repeat `init()`).
- Deleted: `settles overlapping init calls with an API reading through the published repository` (concurrent `init()`).
- Rewritten: `refuses to start before the custom fields services are set up` is now `fails its first use before the custom fields services are set up, and builds once they are`.
- Rewritten: `publishes no API when its construction fails, and builds one on the next init` is now `fails the first use when the API cannot be constructed, and builds one on the next use`.
- Retitled: `…saves through the one given at init` is now `…the one it was built with`.

**tiers/consumers.test.ts** — passes (7)

- Stripe Checkout previews test: `root.init()` replaced by `openServices()`.
- The `DomainEvents.subscribe` stub now returns a function.

**invites/index.test.ts** — passes (12)

- `beforeEach` uses `openServices()`.
- Retitled: `retains one initialized instance without rendering…` is now `builds one instance without rendering…`.

**app-installations/index.test.ts** — passes (11)

- `openServices()` is called at the top of `beforeEach`, before `db.knex` is stubbed. Opening loads the listening roots, which read `db.knex`; that consumed the stub's first call and broke the call counts. With the stub in place, vitest's reporter also crashed with an unrelated-looking source-map JSON error instead of reporting the failure.
- Rewritten: `acquires the database only at init and retains one instance without queries or requests` is now `acquires the database only on first use and builds without queries or requests`.
- Rewritten: `leaves the root unpublished after a dependency failure and permits a later init` is now `fails the first use when the database is not ready, and builds on a later use`.
- Rewritten: `refuses to start with trusted origins that aren't origins` is now `refuses to build with…`; it and the two `names a … trusted origin without its credentials` tests assert the throw on first use.
- Retitled: `lets the controllers loaded before init use the initialized instance` is now `…loaded before services can be built use the built instance`.

**media-inliner/root.test.ts** — passes (8)

- Deleted: `rejects use before init without resolving storage adapters at import` (old contract). Its "no adapter lookup at import" assertion moved into the next test.
- Deleted: `keeps the published inliner and does not resolve storage again on a later init` (repeat `init()`).
- Rewritten: `publishes one ready inliner once init resolves…` is now `builds one ready inliner on first use, resolving the storage adapters then and not at import`.
- Rewritten: `does not publish after storage resolution fails and allows an explicit retry` is now `fails the first use when a storage adapter cannot be resolved, and builds on a later use`.
- Rewritten: `retains the published inliner on repeated init, so the registered job handler keeps using it` is now `runs external media inliner jobs through the inliner handed to the job handlers` (re-init dropped).
- `lets each import run cache downloads…`: mid-test re-init removed.

**media-inliner/service.test.ts** — passes (4)

- `beforeEach` uses `openServices()`.

**custom-theme-settings/index.test.ts** — passes (7)

- Deleted: `waits for custom settings initialization before theme startup or resolving frontend initialization`. Boot no longer inits this root in `initServicesForFrontend`, so the order doesn't exist.
- Deleted: `propagates the original custom settings initialization error without starting themes`. It stubbed `root.init` rejecting, which has no equivalent now.
- Rewritten: `initializes before theme startup and activates on every boot through retained consumers` is now `is built by theme startup and activates on every boot…`. It asserts the outcome: the controller and `root.service` see the settings theme startup loaded.
- Rewritten: `keeps an in-flight activation usable after another init…` is now `…after the services are closed and reopened…`. The re-init became `services.close()` plus `openServices()`, and it asserts a new instance is built while the retained one finishes.
- Rewritten: `constructs without querying settings…` is now `builds on first use without querying settings…`.
- The root was removed from the boot harness module map, since boot no longer requires it there.

**signing-keys/index.test.ts** — passes (8)

- `beforeEach` calls `openServices(root)` for the fresh root; `init()` became `startAsBoot(root)` throughout.
- Deleted: `shares one pending key check between concurrent initialization calls` (concurrent `init()`).
- Rewritten: `does not check keys on import and rejects access before init` is now `does not check keys on import or when the service is first used`.
- Rewritten: `publishes the instance only after the initial key check and reuses it on repeated init` is now `does not finish starting until the key check completes`.
- Rewritten: `propagates the initial check error without publication and permits a later retry` is now `fails the start with the key check error, and checks again when started again`.

**identity-tokens/index.test.ts** — passes (6)

- This root is still the legacy wrapper (`init()` / `.instance`), so only the signing-keys side changed: `signingKeys.init()` became a local `startSigningKeys()` helper (`openServices(signingKeys)` then `startAsBoot(signingKeys)`).
- Rewritten: `can retry after signing keys are initialized, without publishing early` is now `can retry once signing keys can be built, without publishing early`; it expects `/Signing keys was used while Ghost cannot build services/`.

### Source observations (not changed)

1. **App installations config check moved off boot.** `core/server/services/app-installations/index.ts` still says "Checked now, so a mistake in it is found at boot" and "Constructed by init() at boot". Boot no longer builds this root, so an invalid `apps.trustedOrigins` no longer stops Ghost starting; it fails the first request that uses the service. If failing at boot matters, the root needs a `start` or boot must touch it.
2. **Stale comments elsewhere.** `media-inliner/index.ts` ("fails init rather than the first import"), `stripe-checkout-config/index.ts` ("Constructed by init() at boot") and `tiers/index.ts` ("Boot sets up the custom fields services first") describe the old flow.
3. **Signing keys stay readable after a failed check.** A failed `start` leaves the built instance in place, so `signingKeys.service` returns a service whose key check failed. Boot aborts on the rejection, so this only matters to anything that catches it.
4. **`startAsBoot` does not open services.** A test must call `openServices(...)` first or it gets the "cannot build services" error; the brief's helper description doesn't say so.
5. **`openServices()` loads every listening root.** In a test that has already stubbed `db.knex` or `config.get`, those module loads go through the stubs. Other batches may hit the same call-count surprise I did in app-installations.

## Batch C

All 17 assigned files pass together (17 files, 356 tests), with no type errors and no lint errors in them. Formatted with `tools/scripts/format.ts`. Nothing was skipped.

### Per file (under `ghost/test/unit/`)

**`server/services/staff/root.test.ts`** — passes. Substantially rewritten; nothing deleted.

- It now uses the registered Staff root instead of a fresh copy per test, and publishes real events with `DomainEvents.dispatch` + `allSettled` instead of stubbing `DomainEvents.subscribe`.
- Member attribution is a `need`, so stubbing `memberAttribution.service` no longer has any effect. The fake is injected with `sandbox.stub(memberAttribution, 'create')`.
- Rewritten tests:
  - "default-exports a definition that builds nothing until the service is first used" (was "…refuses until Ghost has started"): new refusal text; counts attribution builds.
  - "declares the four notification listeners, and an event is delivered once however often services are opened" (was "…which boot attaches once…"): asserts `root.listeners` and a single mail after opening twice.
  - "is refused when Ghost was not told about it…": the only test still using a fresh, unregistered copy.
  - "fails to build while member attribution is unavailable, and builds on a later use": now through the `create` stub.
  - "keeps using the attribution instance it was built with for as long as Ghost runs" (was "…after the attribution root changes").
  - "is built again after Ghost stops and starts, with the attribution built then, and delivers an event once" (was "…listens only once"): also asserts nothing is delivered while closed.
  - Both "consumers" tests: Gifts and Stripe are still reloaded, Staff is not.
  - The three milestone tests publish the real event.

**`server/services/staff/notifications.test.ts`** — passes. Same changes to setup (registered root, `openServices()`, attribution via `create` stub); every `handlerFor(Event)(event)` became `publish(event)`. Titles unchanged, nothing deleted.

**`server/services/staff/index.test.js`** — passes. Only change: the attribution fake moved from the `.service` stub to a `create` stub.

**`server/services/staff/staff-service.test.js`** — passes as it was; no change from me. The prototype patch had already replaced the two `subscribeEvents` tests with two `notify` tests.

**`server/services/public-response-caches.test.ts`** — passes. Uses the registered Posts Public and Tags Public roots with `openServices()`; only the endpoints are reloaded.

- `siteChanged()` now calls every `site.changed` listener Ghost attached on open, so it reaches both roots and Link redirection. As a result three assertions were loosened from "adapter called once / never" to "called with / never called with this resource's adapter".
- "is built only once, and a site change resets its cache once" (was "…and listens only once"): asserts `cache.reset` is called once.
- "is built again after Ghost stops and starts, and a site change still resets its cache once" (was "…still listens only once"): also asserts no listeners remain while closed.

**`server/services/gift-links/index.test.ts`** — passes.

- Rewritten: back to stubbing `db.knex` and using Ghost's application via `openServices()`, because the root reads `data/db`, not `foundation.database`.
- Deleted: "refuses to build without a database, or before the application is started". The "needs a database" refusal does not exist in the source; the "cannot build services" refusal is now asserted in the first test.

**`server/services/donations/index.test.ts`** — passes. One comment and one title reworded ("…through the repository built on first use").

**`server/services/integrations/index.test.ts`** — passes, unchanged.

**`server/services/explore-ping/index.test.ts`** — passes.

- Uses the registered root. Stats is injected with `sandbox.stub(statsRoot, 'create')` in place of `statsRoot.init()`.
- "builds nothing until it is first used, and pings nothing until boot starts it": extended to show first use builds without pinging and `startAsBoot` then pings once.
- Renamed for start instead of init: "finishes starting before payload and request completion, reading the Stats API it was handed when ready", "fails to start with the original Posts construction error", "finishes starting while an unexpected payload error rejects its detached ping".

**`api/cache-invalidation.test.ts`** — passes. The prototype patch had removed the setup entirely, and the test then crashed. Added `beforeEach(openServices)`.

**`api/endpoints/utils/gift-link-access.test.ts`**, **`api/endpoints/utils/public-cache-keys.test.ts`**, **`frontend/helpers/get.test.ts`** — pass. `beforeAll(openServices)` + `afterAll(close)` became `beforeEach(openServices)`, since the unit setup closes services after every test.

**`frontend/helpers/ghost-head.test.js`, `content-api-key.test.ts`, `comments.test.js`, `comment-count.test.ts`** — pass. The `beforeAll` with `init()` is gone; `beforeEach` now opens services, reads `internalKeysRoot.service` and sets the key. The `clear()` calls were dropped because each test gets a fresh instance. In `comment-count.test.ts` the root is now `require`d instead of `import`ed, otherwise it asks a different application than the one the helper opens.

### Source and helper problems found, not fixed

1. **`openServices(freshRoot)` leaks listeners across the worker.** The application's registered set never shrinks and the unit project runs with `isolate: false`. Every fresh copy of a listening root that a test registers therefore listens again on every later `open()` in that worker. For Staff that would mean one extra mail per copy for every later test that dispatches a member event. I avoided it by using the registered roots; any other file that follows the brief's `openServices(freshRoot)` pattern for a listening root will cause this. The helper or `Services` needs a way to unregister.

2. **The public endpoints read a service while loading.** `core/server/api/endpoints/tags-public.js` (line 23) and `posts-public.js` (lines 28, 84) evaluate `…Service.service.cache` at module load. Requiring either before services open throws "cannot build services", and the captured cache belongs to whichever instance existed at load, so it goes stale after close and reopen. This is why `cache-invalidation`, `get`, `gift-link-access` and `public-cache-keys` need `openServices()` just to load controllers. A getter would remove both issues.

3. **A failed endpoint load crashes vitest's reporter.** When a `.js` endpoint throws at require time, vitest dies with `SyntaxError: Unexpected token … is not valid JSON` from `convert-source-map` and reports "Errors 1" with no test result. The real error is hidden; other agents may hit this.

4. **Stubbing `.service` on a root that is another root's `need` silently does nothing.** The application builds needs through `definition.create`, not the getter. Stub `create` instead. The brief's line that the `.service` stub "still works" holds only for direct readers.

5. **Stale comment** in `core/server/services/gift-links/index.ts`: "Constructed by init() at boot".

## Batch D

All 10 assigned files pass (150 tests; also green with shuffled file order and inside a full `vitest run test/unit/server/services` run, where only the known mailgun-email-suppression-list file fails). No type errors in the test files, and they are formatted. Only the assigned files were edited.

Two things apply across the batch:

- **Cached roots, not fresh copies.** The root tests no longer delete the root from `require.cache`. A definition holds nothing now, and a registered fresh copy is never forgotten by the application, so it would keep listening for the rest of the worker.
- **Local `silenceOtherRoots(sandbox)` helper** in the slack-ping, indexnow-ping, mentions and link-redirection root tests. `openServices()` registers every listening root, and several share events (`post.published`: slack-ping, indexnow-ping, mentions; `site.changed`: link-redirection, posts-public, tags-public). Without it, the slack tests failed inside IndexNow with `model.get is not a function`. The helper stubs the other roots' `create` and listener `handle` before `openServices()`.

### Per file (all under `ghost/test/unit/server/services/`)

**slack-ping/index.test.ts** — passes

- Rewritten: "wires the shared dependencies once and exposes the instance only after initialization" → "builds the service with the shared dependencies on first use and keeps it" (no `events` dependency, no listener-identity or init assertions).
- Rewritten: "stops listening on stop and delivers to the same instance once after the next init" → "stops handling events when services close, and an event after they reopen builds a new instance" (`services.close()`, reopen, event before first use builds a new instance).
- Deleted: "removes its subscriptions when post.published / slack.test registration fails and allows an explicit retry" (2 tests) — the root no longer subscribes; attaching is the application's job.
- The other tests only lost their `init()` lines.

**slack-ping/slack-ping-service.test.js** — passes

- Deleted: "subscribeEvents() > registers listeners for post.published and slack.test" — method removed. The `events` double is gone too.

**indexnow-ping/index.test.ts** — passes

- Rewritten: "subscribes only at init and delivers each event once after repeated init" → "builds one service that handles each post event once".
- Rewritten: "stops listening on stop and delivers to the same instance once after the next init" → "stops handling events when services close, and an event after they reopen builds a new instance".
- Renamed: "keeps the initialized listener while…" → "keeps handling events with one instance while…".
- Deleted: "removes a partial subscription after failure and retries without disturbing other listeners" — the root no longer subscribes.

**indexnow-ping/indexnow-ping-service.test.js** — passes

- Deleted: "subscribeEvents() > registers listeners for post.published and post.published.edited" — method removed. The `events` double is gone too.

**mentions/index.test.ts** — passes

- Deleted: "publishes nothing and registers no listeners before init" and "retains the same instances and listeners across repeated init" — old root contract.
- Rewritten: "publishes the api, repository, controller, metadata and sending service once init resolves" → "builds … on first use".
- Rewritten: "registers one bound sendForPost listener for each post and page event" → "hands each post and page event to the sending service, building it for the first one" (emits all six real events, no prior read).
- Rewritten: "publishes nothing when construction fails and allows an explicit retry" → "fails the first use when the site URL is invalid, and builds on a later use".
- Titles changed from "at init"/"during init" to "when the service is built"; the privacy and site-URL tests now emit the real `post.published`.
- Added: "asks for metadata about the recommending site when a mention comes from its recommendations file" — covers the mapper the Mentions root now adds.
- The jobs service is still freshly loaded per test.

**mentions/mention-sending-service.test.js** — passes

- Deleted: "listen > Called on all events we listen to" — `listen()` removed.

**link-redirection/index.test.js** — passes

- Deleted: "rejects service and repository access before init" — old contract.
- Rewritten: "retains the first service and repository across repeated init" → "keeps one service, and hands link tracking the repository that service was built with".
- Rewritten: "does not resolve a cache adapter or listen for site changes when caching is disabled" → "…or reset a cache on site changes…" (emits the real `site.changed`).
- Rewritten: "resets the cache through one site.changed listener" → "resets the cache once for each site.changed event".
- Added: "builds the service for a site.changed event that arrives before its first use".
- Rewritten: "publishes nothing when the cache adapter cannot be resolved and allows an explicit retry" → "fails the first use when the cache adapter cannot be resolved, and builds on a later use" (also checks `extras.linkRedirectRepository()` fails the same way).

**link-redirection/link-redirect-repository.test.js** — passes

- Rewritten: "should clear cache on site.changed event" → "should clear cache when resetCache() is called".
- Added: "should do nothing on resetCache() without a cache".
- `EventRegistry` dependency removed from the factory.

**member-welcome-emails/index.test.ts** — passes

- Deleted: "exposes only init, stop and a guarded service getter" and "retains the same instance and listener across repeated init" — old contract.
- Rewritten: "rejects init while link tracking is not ready and leaves no locale listener behind" → "fails while link tracking is not ready, and builds once it is".
- Deleted: "builds the service for the configured locale with one locale listener once dependencies are ready" — folded into the test above plus the locale tests.
- Rewritten: "renders with the translator it built for the configured locale and follows locale edits" — emits the real `settings.locale.edited` instead of calling a captured listener.
- Added: "builds the service for a locale edit that arrives before its first use, and follows the edit".
- `core/bridge.js`, `core/shared/i18n` and the email-service wrapper also listen for `settings.locale.edited` on the shared bus, so each test sets their listeners aside and restores them afterwards.
- The describe "initialization" is now "first use"; `initRoot()` became `openRoot()`.

**recommendations/index.test.ts** — passes

- Mentions and Staff are handed in through `needs`, which bypasses the `.service` getter. The test therefore stubs `mentionsRoot.create`, `staff.create` and `staff.needs` (to `{}`) instead of the getters. `DomainEvents.subscribe` is no longer stubbed; tests dispatch a real `MentionCreatedEvent` and wait on `DomainEvents.allSettled()`.
- Deleted: "exports one root whose service is unavailable before init" and "retains the first graph and installs the mapper and subscriber once across repeated init" — old contract.
- Deleted: "rejects init when the click event model lookup / the incoming notification mailer throws, … builds a fresh graph on retry" (2 tests) — they guarded "no side effect before construction finishes"; `create` has no side effects now and retry is the application's contract. The Mentions test below keeps a root-specific first-use failure.
- Rewritten: "publishes repositories, services and controllers…" → "builds …" (keys now include `notifyOfMention` and `refreshInBackground`).
- Rewritten: "rejects init without publishing anything while Mentions is not ready, and initializes once it is" → "fails its first use while Mentions cannot be built, and is handed the Mentions service once it can".
- Added: "does not refresh in the background on first use".
- Rewritten to `startAsBoot(root)`: the two "starts both background refreshes without awaiting them when boot starts it…" cases, "skips both background refreshes and logs when the config disables them", and "logs a background refresh rejection instead of failing the start".
- Rewritten: "maps recommendation well-known URLs to their site for mentions metadata" — now tests `recommendationSourceUrl` directly.
- Rewritten: "emails a verified recommendation mention…" → "…, building the service for a mention published before its first use"; the two "does not email…" cases dispatch the real event.
- Rewritten: "sends incoming recommendation emails … the staff renderer read at send time" → "… the Staff service it is handed".

### Source problems found, not fixed

1. **Type error in source:** `core/server/services/recommendations/index.ts(103,80)`: TS2322, `Type 'Staff' is not assignable to type '{ emails: { renderHTML(...): Promise<string>; renderText(...): Promise<string> } }'`. The Staff root types `emails` as `Record<string, (...args: never[]) => unknown>`, which does not satisfy `IncomingRecommendationEmailRenderer`. It shows up in `tsc -p test/tsconfig.json`.
2. **`openServices()` registers every listening root**, so a unit test that emits a shared legacy event reaches every root listening for it. That is why the local `silenceOtherRoots` helper exists in four files; it would be better as a shared option in `test/utils/services.ts`, for example opening with only the named roots registered.
3. **`Services.register` is permanent and the unit project runs with `isolate: false`.** Any test that registers a freshly loaded root copy (the `openServices(freshRoot)` pattern, or `declare()` in `staff/root.test.ts`) leaves it listening on every later `open()` in that worker. There is no `unregister`. My files avoid fresh copies for this reason.
4. **Possible breakage outside my files:** the old Mentions root test noted that "the sending-service HTTP tests find and wrap these listeners by name" (`bound sendForPost`). Those listeners no longer exist under that name, so any e2e or integration test that looks them up will need changing.

## gx and tooling tests

Tools are updated for the new service-root flow, and everything you asked me to run passes: `@internal/scripts` unit tests (397), `@internal/gx` unit tests (155 before a final one-identifier rename, after which I re-ran only the services-verify, create-service and cli files: 49 pass), `pnpm lint:oxlint`, eslint in both packages and `test:types` in both.

I also generated a throwaway service in the real repo, ran its starter test under the real unit setup (2 pass), and removed it.

### Files changed (all under `tools`)

- `scripts/test/service-root-shape.test.ts`
- `gx/create-service.ts`, `gx/test/create-service.test.ts`
- `gx/services-verify.ts`, `gx/test/services-verify.test.ts`
- `gx/README.md`, `scripts/README.md`, `configs/README.md`, `configs/eslint/README.md`
- Two files outside your list, both small:
  - `gx/cli.ts`: the help text "Scaffold a boot-owned service." now reads "Scaffold a Ghost Core service."
  - `gx/package.json`: added `ghost/bootstrap/**/*` and `ghost/test/utils/services.ts` to the `serviceGenerator` nx inputs, because the generator test now copies them; without this the nx cache could go stale. Revert if you prefer.

`scripts/test/oxlint.test.ts` and `gx/services.ts` (and its test) needed no change: neither referenced the deleted rule or boot `init()`.

### What changed in behaviour

- **Generator:** the root imports from the transition path and is a plain `defineService('Name', () => {...})`, with a commented options example showing `needs`, `listeners`, `start` and `stop`. The starter test and printed next steps are as you specified. The exported `bootLines()` helper is gone.
- **`services verify`:** `mutateBootInit` and the `boot-waits-for-init` check are removed. The new check is `registered-with-application`, for standard services only.
  - It fails when a root declares `listeners` or `start` and `ghost/bootstrap/services.ts` does not contain `../core/server/services/<name>`.
  - The signing-keys exception applies only to a root with `start` and no `listeners`.
  - It is a source check, so it also runs under `--static`; the old check did not.
  - Against the real tree it finds the 9 listening roots and 3 starting roots, with no problems.
- **Detection limit:** "declares `listeners`/`start`" is a regex on the root source (exported as `declaredByRoot`). A `start:` key on some other object literal in a root file would be a false positive, and the check would fail and ask for registration. No current root trips it.

### Tests deleted (removed behaviour)

- `services-verify.test.ts`:
  - "the boot mutation stops boot waiting but keeps rejections" — `mutateBootInit` is gone.
  - "the boot mutation follows a binding only within its own phase" — same.
  - "the boot check fails when tests survive the mutation and restores boot.js" — the check is gone.
  - "the boot check says how to write the call when it cannot find one" — same.
- `create-service.test.ts`:
  - "the boot call the generator prints and the guides show is the one services verify finds" — tested `bootLines`/`mutateBootInit`. This was the test that asserted `init()` wording in `ghost/core/server/services/README.md`, `tbd/kernel/README.md` and the add-service skill. No gx test depends on that wording now.

### Tests rewritten or added

- `service-root-shape.test.ts`:
  - The default helper import is the transition path, with one case proving `#kernel/define-service` is accepted.
  - The `defaultExport` message regex follows the rule's new text ("Export a default definition created by defineService").
  - The config assertion checks `helperImports` equals the two paths.
  - New accept case: a root with `needs`, `listeners`, `start` and `stop`.
  - New reject cases: async `create` (callback, options, method and via a local const), `events.on`, `DomainEvents.subscribe`, and `.once` inside `start`.
- `services-verify.test.ts`:
  - The fixture boot and bootstrap lists use the new form.
  - New tests cover `declaredByRoot`, `registrationProblems` (including the signing-keys exception) and the check inside `verifyService` (fail, then pass once registered, and skipped for a legacy service).
  - Two runners no longer fake a failing `test/unit/boot` run.
- `create-service.test.ts`:
  - Template and printed-output assertions match the new form.
  - The end-to-end test copies `ghost/bootstrap/app.ts`, `transition/*` and `ghost/test/utils/services.ts` into the fixture.
  - The fixture gets a stub `ghost/bootstrap/services.ts` with empty lists, because the real lists name roots the fixture does not have.

### Outside my scope

- `.agents/skills/add-service/SKILL.md` still describes "boot initialization", and probably `migrate-service` and `verify-service-change` do too. The skill listing says add-service finishes "boot initialization".
- `tools/gx/README.md` still links to `ghost/core/server/services/README.md#creating-a-service`, and `tools/configs/eslint/README.md` to `#standard-and-legacy-services`. Check those anchors survive the README rewrite. I removed the `#initialization` link.
- The generated root's comments point at `legacyEvent` without importing it; that is deliberate, since it is a commented example.
