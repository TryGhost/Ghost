# defineService spike

A spike on `claude/define-service-spike`, cut from `claude/framework-boot-spike`
(`cc2953e`): what a better `defineService` looks like, built in the kernel and
foundry and proven on eight real roots. Companion to
[the framework and boot spike](framework-boot-spike.md) and
[the boot start inventory](boot-start-inventory.md).

Every claim is marked **verified** (it was run) or **inferred** (it was read).

The test for every choice: would this still exist once Ghost is stateless,
runs as several processes per site, and serves several sites per process?
Neither of the last two was built. The aim was not to close the door.

## Result in one paragraph

`defineService({ ... })` now returns a definition and holds nothing
(verified). The application holds what is built from definitions, builds each
service the first time it is used, and forgets every instance when it stops
(verified). Listeners are declared on the definition and attached by the
application before the service exists (verified). Eight roots were converted,
one or more of each kind in the inventory. Six entries left the list boot
starts. Twenty-two roots still use the older form and were not touched
(verified). One piece is kept only so that callers need not change: an
`alias()` that gives a definition a `.service` getter. It assumes one
application per process and is the thing to remove. Asynchronous `create` is
handled but not made lazy: Better Auth is still built at boot.

## Designs compared

| Design                                                                                                                     | Callers                                                                | Tests                                                                                                   | Several sites per process                                                                                          | Cost to adopt                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **(a)** The module still holds the instance; `.service` builds it on first read                                            | Unchanged                                                              | Unchanged. An instance built during one test is kept for the process, with whatever that test stubbed   | Closed. The instance and the "boot is done" flag are module state; the kernel would hold both                      | Lowest: about four lines in the kernel and one line removed from the list for each root                |
| **(b)** The application holds instances and builds them from definitions; the module's `.service` is an alias that asks it | Unchanged, through the alias                                           | A root's own tests change. Tests of callers open the application's services instead of calling `init()` | Open: two applications each hold their own instances. The alias is the one place that assumes a single application | A container in the foundry (230 lines) and the alias (24 lines)                                        |
| **(c)** Nothing is looked up. Every instance is handed in through `create(dependencies)` from a composition point          | Every caller has to be built by something that can hand it the service | Best: everything is built from what the test hands in                                                   | Open, with nothing left to remove                                                                                  | Not incremental. API endpoint modules are plain objects that nothing builds, so there is no such point |

Facts behind the table (verified by `grep`, counts are of lines and files that
match and include the legacy wrappers): `.service` is read on about 260 lines
in 97 files of `ghost/core`, 48 of them under `api/endpoints`; 33 test lines
replace a root's `.service` getter with a stub; 29 test files call a root's
`init()`.

**Chosen: (b), with (c) between services.**

- (a) is on the wrong side of the line. It keeps state in the module that
  another application in the same process would share.
- (c) is the destination, but one converted root would force every caller,
  and every caller of those, to be converted in the same change.
- (b) puts the instance where it belongs now. A definition's `needs` is (c)
  for the dependencies between services: the application is the composition
  point. The alias carries the callers that nothing composes yet.

## Final API

Kernel, [`kernel/src/define-service.ts`](../../kernel/src/define-service.ts):

```ts
function defineService<Service, Needs>(
  definition: ServiceDefinition<Service, Needs>,
): ServiceDefinition<Service, Needs>;

interface ServiceDefinition<Service, Needs = object> {
  readonly name: string;
  readonly needs?: Needs; // other definitions, or roots of the older form, by key
  readonly create: (given: Given<Needs>) => Service | Promise<Service>;
  readonly listeners?: readonly ServiceListener<Service>[];
  readonly start?: (service: Service, given: Given<Needs>) => unknown;
  readonly stop?: (service: Service) => unknown;
}

// { foundation } and the instance of each thing in `needs`
type Given<Needs>;

interface ServiceListener<Service> {
  readonly event: { readonly name: string };
  readonly handle: (service: Service, event: never) => unknown;
}
```

The function returns the object it is given. The older form,
`defineService(name, create)`, is unchanged.

Foundry, [`foundry/src/services.ts`](../../foundry/src/services.ts), held by
each application as `application.services`:

```ts
interface Services {
  register(definition): void; // attach declared listeners; build nothing
  open(): void; // the start sequence allows building
  get<Service>(needed): Service; // build on first use
  resolve<Service>(needed): Promise<Service>; // the same, awaiting an asynchronous create
  start(definition): Promise<void>; // build, then run `start`
  close(): Promise<void>; // run `stop`s, forget every instance, refuse to build
}
```

The start sequence gained one list, `steps.services.declared`, and one rule: a
definition named in `steps.services.modules` is built where it is named and
started if it declares a `start`.

**A root, before and after** (`services/tags-public/index.ts`):

```ts
// Before
export default defineService('Tags Public', () => {
  const adapterManager = require('../adapter-manager').default;
  const config = require('../../../shared/config');
  const events = require('../../lib/common/events');

  const cacheEnabled = z.coerce.boolean().parse(config.get('hostSettings:tagsPublicCache:enabled'));
  const cache: CacheBase | undefined = cacheEnabled
    ? adapterManager.getAdapter('cache:tagsPublic')
    : undefined;

  if (cache) {
    events.on('site.changed', () => {
      cache.reset();
    });
  }

  return { cache };
});
```

```ts
// After
export default alias(
  defineService({
    name: 'Tags Public',
    create: ({ foundation }) => {
      // The adapter manager is not something a definition can be handed yet.
      const adapterManager = require('../adapter-manager').default;

      const cacheEnabled = z.coerce
        .boolean()
        .parse(foundation.config.get('hostSettings:tagsPublicCache:enabled'));
      const cache: CacheBase | undefined = cacheEnabled
        ? adapterManager.getAdapter('cache:tagsPublic')
        : undefined;

      return { cache };
    },
    listeners: [{ event: legacyEvent('site.changed'), handle: ({ cache }) => cache?.reset() }],
  }),
);
```

**A caller, before and after** (`api/endpoints/tags-public.js`). It read the
instance when the file loaded, which only worked because the file is loaded
on the first request:

```js
// Before
browse: {
  cache: tagsPublicService.service.cache,

// After
browse: {
  // Read for each request: the service is built on first use, not when this file loads.
  get cache() {
    return tagsPublicService.service.cache;
  },
```

A caller that reads `.service` inside a function did not change. Gift links,
Integrations, Donations and Staff have such callers only.

**A dependency between services, before and after** (`services/staff/index.ts`):

```ts
// Before: inside create
const memberAttribution = require('../member-attribution').default;
// Boot awaits member attribution first; Staff keeps this instance.
memberAttributionService: memberAttribution.service,

// After: on the definition
needs: { memberAttribution },
create: ({ foundation, memberAttribution: memberAttributionService }) => …
```

## What is framework and what is earmarked

**Framework.** It stays.

| Piece                                    | Where                          | Size                 |
| ---------------------------------------- | ------------------------------ | -------------------- |
| The definition form and its types        | `kernel/src/define-service.ts` | about 60 lines added |
| The services of an application           | `foundry/src/services.ts`      | 230 lines            |
| `declared`, and definitions in `modules` | `foundry/src/application.ts`   | about 60 lines added |

The kernel holds no instance for a definition: the function returns its
argument (verified by test, and the kernel's lint rules pass).

**Earmarked.** Each exists only so that roots can move one at a time.

| Piece                                                                                                       | Why it exists                                                                                         | What removes it                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alias()` in `ghost/core/shared/service-alias.ts`, and its exception in the `bootstrap-only-from-boot` rule | Callers and tests read `root.service`. It asks Ghost's one application, so it assumes one per process | For each root: every reader is handed the service (`needs`, or an endpoint that is handed the application's services). Then the root drops `alias()` |
| The older form `defineService(name, create)` and the root it returns                                        | 22 roots, the shared modules and their callers                                                        | The last root converted                                                                                                                              |
| `Needed` accepting a root of the older form (`{ service }`)                                                 | A definition can need a root that has not been converted                                              | The same                                                                                                                                             |
| `legacyEvent()` and the branch for it in `bootstrap/transition/legacy-events.ts`                            | Tags Public and Posts Public listen on the legacy bus (`site.changed`)                                | Nothing publishing on the legacy bus                                                                                                                 |
| A definition in `services` only because it is built asynchronously (Better Auth)                            | Its readers cannot wait                                                                               | Its readers awaiting `resolve()`, or a synchronous `create`                                                                                          |
| `test/utils/services.ts`                                                                                    | Unit tests read `.service` through the alias without booting Ghost                                    | The alias going. A test then builds its own services from a fake foundation, as the gift links test does                                             |
| The definition exemption in `boot-awaits-service-init` and in `standard-services.test.ts`                   | Both check the older form                                                                             | The rule and the test going with the older form                                                                                                      |
| `require()` inside `create` for the model registry, the adapter manager, settings cache, labs, url utils    | The foundation does not hold them and they are not definitions                                        | Each becoming something a definition can name in `needs`                                                                                             |

## Roots converted

| Root           | Inventory class | What changed                                                                                                                                            | Listed in                  | Why this one                                                                |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `gift-links`   | A               | The database comes from the foundation                                                                                                                  | nowhere                    | The inventory's experiment; needs the database                              |
| `integrations` | A               | Shape only                                                                                                                                              | nowhere                    | The inventory's experiment                                                  |
| `donations`    | A               | Shape only                                                                                                                                              | nowhere                    | The inventory's experiment; read by a legacy service (Stripe)               |
| `tags-public`  | B               | The `site.changed` subscription is a declared listener. The endpoint reads the cache for each request                                                   | `declared`                 | Read at the top level of an endpoint; listens on the legacy bus             |
| `posts-public` | B               | The same                                                                                                                                                | `declared`                 | The same, read twice                                                        |
| `staff`        | C               | Member attribution is a `need`. Four subscriptions are declared listeners. `subscribeEvents()` became `notify()`. The "partly subscribed" guard is gone | `declared`                 | Captures another service; subscribes to four events and never released them |
| `better-auth`  | C, asynchronous | The database and config come from the foundation. `create` is still asynchronous                                                                        | `services`                 | The asynchronous `create` named in the brief                                |
| `explore-ping` | E               | Stats is a `need`. The ping is a `start`, run only in a process that does the work of the worker role                                                   | `services`, `when: worker` | Work at start that nothing reads                                            |

`recommendations` and `mentions` (the `addMapper` registration) were not
converted. How they would go is under [Adoption](#adoption-root-by-root).

## The hard cases

Each row names the test that proves it. "Framework" tests are in
`ghost/test/unit/foundry/services.test.ts`. All verified.

| Case                                                  | Result                                                                                                                                                                             | Framework test                                                                                                                             | On a real root                                                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An event published before the service exists          | Delivered. The event builds the service, then the listener runs                                                                                                                    | "deliver an event published before the service exists, building it then"                                                                   | Tags Public and Posts Public (`public-response-caches.test.ts`), Staff (`staff/root.test.ts`), and a booted Ghost (`service-definitions.isolated.test.ts`) |
| A build attempted before boot is done                 | Refused: "Gift Links was used while Ghost is not started. A service is built on first use, once the start sequence has reached the services step and until the application stops." | "refuses to build before the application has opened its services"; "refuses a service used before the services step"                       | Gift links, Better Auth, Staff root tests                                                                                                                  |
| A failed build                                        | Thrown to whoever used the service, or handed to the event bus when an event caused it. Nothing is kept; the next use builds again                                                 | "reports a failed build to whoever used the service"; "rejects with a failed build" (asynchronous); "hand a failed build to the event bus" | Staff ("fails to build while member attribution is unavailable"), Better Auth ("fails its build … and can be built again")                                 |
| `stop()` releases what `start` acquired               | The `stop` of each started service runs, in reverse order, and of nothing else. A failing `stop` is logged and the rest run                                                        | "releases on close what start acquired, and only that"; "stops a service whose start failed"; "logs a failing stop"                        | Through the application: "builds nothing that is only declared, and starts what the list names"                                                            |
| Ghost booted twice in one process                     | Each start builds its own instances. Listeners are attached once                                                                                                                   | "gives each start its own instances, as a process that starts twice needs"                                                                 | A booted Ghost ("builds a service on first use, and gives the next boot its own"); the three database suites                                               |
| A stubbed dependency does not leak into the next test | Closing forgets every instance, so the next start builds from what is there then                                                                                                   | "forgets every instance on close, so the next start builds its own"                                                                        | Staff, unit and booted ("does not keep what one boot stubbed for the next")                                                                                |
| Two sites in one process each have their own instance | Two `createServices()` over two foundations: one definition, two instances, events of one not seen by the other                                                                    | "gives two applications in one process their own instance of one definition"                                                               | Not applicable. Multi-site was not built                                                                                                                   |

Two more rules came out of the work (verified by test):

- A definition that needs itself, directly or through its needs, is refused.
- A definition that declares listeners or a `start` and was never registered
  is refused on first use, so a forgotten list entry cannot lose events
  without a sign.

## What breaks for callers and tests

**Callers.**

- A caller that reads `root.service` inside a function: nothing changes.
- A caller that reads it at the top level of a module has to read it later.
  Three reads in two endpoint files were changed to getters.
- A read before the services step, or after Ghost stops, now throws. Under the
  older form a root kept its instance after `stop()`. No test in the database
  suites depended on that (verified by the suites passing).
- `root.init()` and `root.stop()` do not exist on a definition. TypeScript
  callers fail to compile; JavaScript callers fail when they run.
- Reading a service that is built asynchronously, when boot has not built it,
  starts the build and throws. Under the older form the read threw and built
  nothing. Better Auth under `auth:engine: legacy` is the one case (verified:
  `better-auth-boot.isolated.test.ts` was changed for it).

**Behaviour.**

- A converted service is built once per start, not once per process.
- Tags Public and Posts Public listen for `site.changed` whether or not their
  cache is on. With the cache off the first event builds the service and
  resets nothing.
- Staff's four listeners are attached by the application. The guard against a
  partial subscription is gone: there is nothing left to subscribe in `create`.
- A failure that used to fail boot now fails the first use. For the eight
  roots that is: no database (Gift links), the Staff email renderer, and
  Member attribution being unavailable to Staff. Better Auth and the explore
  ping are still built at boot.

**Tests changed deliberately.** Each asserted the rule that changed.

| Test file                                                  | Change                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `test/unit/boot/init-core.test.ts`                         | The two "waits for Integrations" tests removed. The i18n test now names App installations as the next root, not Gift links          |
| `test/unit/boot/init-services.test.ts`                     | "waits for member attribution before staff" removed. Donations and Staff removed from the "waits for … before jobs" table (4 tests) |
| `test/unit/boot/standard-services.test.ts`                 | Skips roots that are definitions                                                                                                    |
| `test/unit/bootstrap/steps.test.ts`                        | The list of entries; `declared` added; the Staff order pair removed; a test that explore-ping is skipped without the worker role    |
| `test/unit/server/services/gift-links/index.test.ts`       | Builds from a fake foundation; "used before init" replaced by the refusal before start and the missing database                     |
| `test/unit/server/services/integrations/index.test.ts`     | Opens services in place of `init()`                                                                                                 |
| `test/unit/server/services/donations/index.test.ts`        | The same                                                                                                                            |
| `test/unit/server/services/public-response-caches.test.ts` | Listener is always attached; event before first use; second start                                                                   |
| `test/unit/server/services/staff/root.test.ts`             | The "exports and initialization" block rewritten for a definition; `init()` replaced elsewhere                                      |
| `test/unit/server/services/staff/notifications.test.ts`    | Registers and opens in place of `init()`                                                                                            |
| `test/unit/server/services/staff/index.test.js`            | The same                                                                                                                            |
| `test/unit/server/services/staff/staff-service.test.js`    | `subscribeEvents` tests replaced by `notify` tests                                                                                  |
| `test/unit/server/services/explore-ping/index.test.ts`     | Starts the root as boot does in place of `init()`                                                                                   |
| `test/unit/server/auth/better-auth/index.test.ts`          | Refusal before start; a failed build and a second build                                                                             |
| `test/unit/api/cache-invalidation.test.ts`                 | No longer initializes the two public roots: loading an endpoint reads nothing                                                       |
| `test/unit/api/endpoints/utils/gift-link-access.test.ts`   | Opens services in place of two `init()` calls                                                                                       |
| `test/unit/api/endpoints/utils/public-cache-keys.test.ts`  | The same, one call                                                                                                                  |
| `test/unit/frontend/helpers/get.test.ts`                   | The same, one call                                                                                                                  |
| `test/e2e-server/better-auth-boot.isolated.test.ts`        | The message of the refused read under `legacy`                                                                                      |
| `test/e2e-server/boot-explore-ping.isolated.test.ts`       | Wraps the definition's `start` in place of the root's `init`                                                                        |
| `test/e2e-server/shared-step.isolated.test.ts`             | Passes the new `worker` option                                                                                                      |
| `tools/scripts/test/service-root-shape.test.ts`            | Cases for the definition form and `alias()`                                                                                         |
| `tools/scripts/test/boot-awaits-service-init.test.ts`      | A definition is not asked for in boot                                                                                               |

No test of what a service does was changed.

## Adoption, root by root

One root is one change:

1. Rewrite `index.ts` as `alias(defineService({ … }))`. Take the database,
   config, logger and event bus from the foundation. Name other roots in
   `needs`, converted or not.
2. Move each subscription out of `create` into `listeners`.
3. Move work that runs with no request behind it into `start`.
4. Change the lists: remove the root from `services`; add it to `declared` if
   it has listeners; keep it in `services` if it has a `start`.
5. Change the root's own test and the boot tests that named it. The
   definitions test says which list is wrong.
6. Callers do not change, unless one reads `.service` at the top level of a
   module.

Later, and separately for each root: hand the service to its readers and drop
`alias()`.

Order does not matter between roots: a definition can need a root of the
older form, and a root of the older form reads a definition through its alias
(verified for both directions: Staff needs Member attribution; Stripe and
Gifts, which are legacy, read Staff and Donations).

What the two roots not converted would need (inferred):

- **Mentions.** Six legacy-bus subscriptions become listeners. It captures the
  job runner, which is not a definition, so that stays a `require` or becomes
  a getter.
- **Recommendations.** It adds a mapper to Mentions inside `create`. Built
  lazily, the mapper would be missing until Recommendations is first used.
  The mapper is a pure function of a URL, so Mentions can import it and add
  it itself. Then Recommendations is one listener, and a `start` for its two
  delayed refreshes, listed with `when: worker`.

## What happens to boot

Entries in the list boot starts, `services` in `ghost/bootstrap/services.ts`
(verified by `steps.test.ts`):

|                                                           | Before | After |
| --------------------------------------------------------- | ------ | ----- |
| Entries in `services`                                     | 42     | 36    |
| of them, legacy steps                                     | 12     | 12    |
| of them, roots whose `init()` boot awaits                 | 30     | 22    |
| of them, definitions boot builds                          | 0      | 2     |
| Entries in `declared` (listeners attached, nothing built) | —      | 3     |
| Definitions in no list                                    | —      | 3     |

Six entries left `services`: Gift links, Integrations and Donations are in no
list; Staff, Tags Public and Posts Public moved to `declared`. Better Auth and
the explore ping stay, as definitions.

**Projection, not run.** If every class A, B and C root were converted, using
the inventory's classes for the 30 roots (14 A, 4 B, 10 C, 2 E):

| Outcome                                               | Roots | Which                                                                                           |
| ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| In no list                                            | 18    | The 14 class A; and of class C: app-installations, stripe-checkout-config, stats, media-inliner |
| In `declared`                                         | 8     | The 4 class B; and of class C: link-redirection, mentions, staff, member-welcome-emails         |
| Still in `services`, built asynchronously             | 2     | better-auth, tiers                                                                              |
| Still in `services`, for a `start` in the worker role | 2     | explore-ping, recommendations (which is also in `declared`)                                     |

`services` would go from 42 entries to 16: the 12 legacy steps and 4
definitions. The count of 8 in `declared` depends on indexnow-ping and
slack-ping turning their `start` subscriptions into listeners, and on the
inventory's reading of which class C roots subscribe; neither was run. Three
checks that fail boot today (the `config.apps` check, the Stripe metafields
check, the media-inliner storage adapters) would fail on first use instead,
unless they become checks the framework runs.

## Enforcement

**What replaces `boot-awaits-service-init` for a definition.** Three things,
cheapest first:

1. **The application refuses** to build a definition that declares listeners
   or a `start` and was never registered (verified by test, and seen for real:
   the first unit tests that opened services without registering failed with
   this error).
2. **One unit test**, `test/unit/bootstrap/definitions.test.ts`, loads every
   root that is a definition and checks it against the lists: a `start` means
   `services`; listeners mean `declared`; neither means no list; `declared`
   holds only definitions.
3. **The two oxlint rules** were taught the new form. `service-root-shape`
   accepts `defineService({ … })` and `alias(defineService({ … }))`, and
   rejects a definition not written in place and `alias()` around the older
   form. `boot-awaits-service-init` leaves definitions out.

Deliberate violations, each made on the real tree and reverted (verified):

| Violation                                                        | Caught by                         | Message                                                                                                |
| ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `alias()` around a root of the older form                        | oxlint `service-root-shape`       | "Use defineService({ name, create, ... }) for a definition, or the older …"                            |
| A new root of the older form that no list starts                 | oxlint `boot-awaits-service-init` | "Nothing starts zz-violation. Add it to the services list …" (the rule still works for the older form) |
| A new definition with a listener, in no list                     | definitions test                  | "zz-violation declares listeners that nothing attaches. Add it to `declared` …"                        |
| A new definition with a `start`, in no list                      | definitions test                  | "zz-violation declares a start that nothing runs. Add it to `services` …"                              |
| Staff removed from `declared`                                    | definitions test                  | "staff declares listeners that nothing attaches. Add it to `declared` …"                               |
| Gift links added to `services`                                   | definitions test                  | "gift-links has nothing boot must build. Remove it from `services` …; it is built on first use."       |
| Opening services in a unit test without registering Posts Public | the application, at run time      | "Posts Public declares listeners or a start, but Ghost does not register it. …"                        |

oxlint says nothing about the last five: it cannot see what a definition
declares without loading it.

**What is not enforced.** A listener subscribed inside `create` instead of
declared. Nothing detects it; it would work until the service is built late.
`gx services verify` was not updated: for a definition it would look for a
boot test that fails when boot stops waiting, and there is none.

**Proposed wording for the skills** (the skills were not changed).

`migrate-service`, in place of the steps about `init()` and the services list:

> Write the root as a definition: `alias(defineService({ name, create, … }))`.
> A definition builds nothing when it is imported and holds no instance. The
> application builds it the first time it is used.
>
> - Take the database, config, the logger and the event bus from
>   `foundation`. Name every other service the root uses in `needs`. Do not
>   read another root's `.service` inside `create`.
> - Do not subscribe to an event inside `create`. Declare it in `listeners`
>   and add the root to `declared` in `ghost/bootstrap/services.ts`. A service
>   built late would otherwise miss every event published before its first use.
> - Put work that runs with no request behind it in `start`, release it in
>   `stop`, and add the root to `services`, with `when: worker` if a web-only
>   process should not do it. A root with no such work declares neither and
>   is in no list.
> - Find every read of `.service` at the top level of a module and move it
>   into the function that uses it.
> - `test/unit/bootstrap/definitions.test.ts` tells you which list is wrong.
>   Remove the root from the boot tests that waited for its `init()`.
> - Keep `alias()` until nothing reads `.service` on the root.

`add-service`, in place of "add it to the services list":

> A new service is a definition. It is not added to boot. If it declares
> listeners, add it to `declared`; if it declares a `start`, add it to
> `services`. Otherwise add it nowhere: it is built the first time it is used.
> Do not write a test that boot starts it. Write one that it builds from what
> it is handed.

## Asynchronous `create`

**2 of the 30 roots: Better Auth and Tiers.**

- Verified for 29 of them by logging, in a throwaway copy of the kernel,
  whether each `create` returned a promise during one boot of the base branch
  (built JS, production, `auth:engine: legacy`): Tiers did, 28 did not.
- Better Auth is not built under `legacy`. Its `create` is an `async`
  function (inferred from the source; its unit test awaits the build).
- Outside the 30, one root in the shared list is asynchronous too: Signing
  keys (verified in the same run).

What the design does for one:

- `resolve(definition)` awaits the build. Concurrent callers share one build.
  Whatever needs the service becomes asynchronous too.
- `get(definition)` throws until the build has finished, and says to await
  `resolve()`. It does not return a promise.
- A listener waits for the build before it handles its event.
- When the readers cannot wait, the application names the definition in
  `services` and boot builds it there. This is what Better Auth does: it has
  five places that read `.service` without waiting (the Admin API app, the
  session endpoint, staff sessions, Stripe Connect state, `authenticate.ts`).
  It is therefore not built on first use, and its self-check still fails boot.

So building on first use is simple only when `create` is synchronous, as the
brief expected. For the two asynchronous roots the choice is: make the readers
await, make `create` synchronous (Better Auth could move `await auth.$context`
to a `start`; tiers could load its products on first read), or keep building
at boot.

## Roles

A role is decided by the `when` an entry already has. No mechanism was added
to the framework (verified: "lets a role decide which starts run, through the
entry's when"). Ghost's boot options gained `worker`, true by default, and the
explore ping is listed with `when: worker`. Nothing sets it to false today.
Listeners are attached in every role; only a `start` is skipped.

## Checks

All verified, on the branch as pushed unless a row says otherwise.

| Check                                                                                               | Result                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                                                 | Pass                                                                                                                              |
| `pnpm lint` (oxlint, ESLint in every project, boundaries, dependencies, packages, versioning, docs) | Pass                                                                                                                              |
| `pnpm nx run ghost:test:types` (source, tests, scripts)                                             | Pass                                                                                                                              |
| Unit, `ghost`                                                                                       | 839 files. 12,158 passed, 34 failed, all 34 in the three mail files                                                               |
| Unit, base branch, rerun here                                                                       | 837 files. 34 failed in the same three files (1 in `ghost-mailer`, 31 in `mailgun-client`, 2 in `mailgun-email-suppression-list`) |
| `tools/scripts` and `tools/gx` unit tests, through nx                                               | Pass                                                                                                                              |
| Integration, MySQL 8.4.13                                                                           | 81 files passed, 6 skipped. 1,314 tests passed, 105 skipped. The same counts as the base                                          |
| e2e, MySQL 8.4.13                                                                                   | 225 files. 3,565 passed, 6 expected failures, **1 failed**; see below                                                             |
| Legacy, MySQL 8.4.13                                                                                | 35 files, 464 tests passed                                                                                                        |
| `auth:engine: better-auth`: three files (`session`, staff lifecycle, device verification)           | 29 tests passed                                                                                                                   |

The one e2e failure was real and is fixed.
`test/e2e-server/shared-step.isolated.test.ts` runs Ghost up to the shared
step and asserted that reading Staff then throws "used before init". It now
throws the refusal to build before the services step, which is the guard
working in a real Ghost. The assertion was changed, and one was added that a
root of the older form still throws the old error. The file was rerun alone
and passes; the full e2e suite was not rerun after that change, which touches
only the test. The second commit on the branch was pushed before this was
found, so that commit has this one failing e2e test; the third fixes it.

`tools/scripts` showed 35 failures when run with a bare `node --test` while
the database suites were running. Run through nx afterwards it passed. The
bare run was not repeated on a quiet machine.

**Requests to a running Ghost** (verified, before and after, from source and
from tsc-built JS): the first request to each of the Content API
(`/ghost/api/content/tags/`, `/posts/`, with a key), the Admin API
(`/ghost/api/admin/site/`), members (`/members/api/site/`) and the front end
(`/`) answered 200 in every run.

**A new test in a booted Ghost**,
`test/e2e-server/service-definitions.isolated.test.ts` (verified, 4 tests): a
service is built on first use and the next boot gets its own; a read after
stop is refused; `site.changed` emitted before anything used Tags Public
builds it and resets its cache; what one boot stubbed is not kept for the
next.

## Timings

Eight boots of each, interleaved before and after, existing database, one
warm-up boot each not counted. "Before" is `cc2953e`; "after" is the second
commit. Each boot is a new process. Requests were made in this order after
"Ghost booted": Content API tags, the same again, Content API posts, Admin
API site, members site, front end. So only the tags request is the first
request the process serves; it also pays for loading the Content API app. All
verified.

From source (`node --conditions=source --import=tsx`, `NODE_ENV=testing-mysql`):

|                                                             | Before                   | After                    |
| ----------------------------------------------------------- | ------------------------ | ------------------------ |
| "Ghost booted in"                                           | 2.69–3.11 s, median 2.91 | 2.65–2.93 s, median 2.81 |
| "Ghost server started in"                                   | 0.95–1.20 s              | 0.93–1.07 s              |
| First Content API tags request (builds Tags Public after)   | 118–169 ms, median 128   | 116–158 ms, median 123   |
| Second tags request                                         | 10–14 ms                 | 11–15 ms                 |
| First Content API posts request (builds Posts Public after) | 24–32 ms, median 28      | 24–34 ms, median 25      |
| First Admin API request                                     | 82–127 ms                | 89–117 ms                |
| First members request                                       | 8–13 ms                  | 8–12 ms                  |
| First front end request                                     | 190–242 ms               | 182–246 ms               |

From tsc-built JS (plain `node`, `NODE_ENV=production`):

|                                 | Before                   | After                    |
| ------------------------------- | ------------------------ | ------------------------ |
| "Ghost booted in"               | 1.52–1.79 s, median 1.66 | 1.57–1.75 s, median 1.65 |
| "Ghost server started in"       | 0.53–0.62 s              | 0.53–0.61 s              |
| First Content API tags request  | 75–126 ms, median 82     | 83–117 ms, median 89     |
| Second tags request             | 10–13 ms                 | 10–14 ms                 |
| First Content API posts request | 18–22 ms, median 20      | 19–28 ms, median 23      |
| First Admin API request         | 58–102 ms                | 55–106 ms                |
| First members request           | 6–10 ms                  | 6–9 ms                   |
| First front end request         | 123–172 ms               | 129–156 ms               |

The ranges overlap in every row. No difference can be claimed either way, in
boot or in the first request. Six small roots leaving boot is too little to
see at this sample size.

## Not verified

- Browser E2E (Playwright), Admin in a browser, Ghost-CLI, the release
  archive, SQLite, `Dockerfile.production`.
- The full `test:e2e:better-auth` suite. Three of its files were run.
- The full e2e suite after the last test fix (see Checks).
- `gx services verify` and `gx services report` on a converted root. Expected
  to need changes; not run.
- `tools/gx generate service` still writes a root of the older form.
- A process started with `worker: false`. The `when` was tested; nothing
  boots Ghost that way.
- Whether a migration, which runs in the database step, reads a converted
  root. It would now be refused. None was found by the suites; the migration
  files were not searched.
- Sentry or any other reader that calls a converted root after Ghost stops.
- The effect of always attaching the `site.changed` listeners on a site with
  the public caches off, beyond the unit tests.
- The projection in [What happens to boot](#what-happens-to-boot).
- The memory cost of rebuilding converted services on each start in tests.
- Each of the two code commits was not checked alone with the full checks.
  The checks above were run on the working tree that became the first two
  commits together, and again where stated.

## Commits

| Commit | Subject                                                               |
| ------ | --------------------------------------------------------------------- |
| 1      | Added a defineService form that describes a service and holds nothing |
| 2      | Changed eight service roots into definitions built on first use       |
| 3      | This document, the test in a booted Ghost, and the shared-step fix    |

The eight roots are one commit. As pull requests they would be one per root,
after the first commit and one for the Ghost-side pieces (the alias, the
`declared` list, the definitions test).
