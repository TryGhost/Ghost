# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

It is the `@tryghost/kernel` workspace package. Import a module by name, such as
`@tryghost/kernel/define-service`. The package is compiled to `build/`; its tests
are in [`ghost/test/unit/kernel`](../ghost/test/unit/kernel).

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and general-purpose dependencies, but
must not import from the Ghost package, including `shared`.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

## Foundation types

Code that needs configuration, a logger, the database or the event bus is
handed one. These files say what it is handed. Each is a type, so importing one
builds nothing and reads nothing:

- [`logging.ts`](src/logging.ts): `Logger`, and `LoggerOptions` for whoever builds one.
- [`config.ts`](src/config.ts): `Config`.
- [`database.ts`](src/database.ts): `Database`.
- [`events.ts`](src/events.ts): `EventBus`.
- [`foundation.ts`](src/foundation.ts): `Foundation`, the four together.

The [foundry](../foundry/README.md) builds the instances. Nothing in the
kernel can.

## Clock

[`clock.ts`](src/clock.ts) exposes `getUnixTime()` for the current time in whole
seconds. Services may import it directly. Its deprecated `moment` export keeps
existing Moment Timezone operations available while services migrate; callers
can change their import without rewriting date logic. It shares the existing
library instance and leaves Ghost's timezone configuration unchanged.

For calendar dates and site timezones, `clock.ts` also exposes Temporal-based
helpers that take ISO `YYYY-MM-DD` dates and IANA timezone names:
`resolveTimeZone()`, `startOfLocalDay()`, `localDateOf()`, `addDays()` and
`daysBetween()`. `startOfLocalDay()` follows the timezone's daylight saving
rules, so a day whose midnight is skipped starts at the transition.

## Adapter manager

[`adapter-manager/`](src/adapter-manager/index.ts) loads, validates and caches
adapter instances by type. It knows nothing about which adapters exist, where
they are installed or how they are configured: the application constructs
`AdapterManager` with its base-class registry, search paths, module loader and
a `getConfig` callback returning the [adapter configuration](src/adapter-manager/types.ts)
keyed by type. Ghost's registry, search paths and configuration normalization
live in [`server/services/adapter-manager`](../ghost/core/server/services/adapter-manager/index.ts),
which exports the configured instance; `bin/validate-adapters.ts` shares the
same loader and registry so a build-time check resolves adapters exactly as the
server does.

### Contract

- **Construction** registers base classes only. It reads no configuration and
  loads nothing.
- **`init()`** validates every configured adapter up front: it resolves each
  configured type and feature to a distinct class and options, loads the class,
  calls its optional static `validate`, and aggregates all failures into one
  error. It constructs no instances and does not touch cached ones. Boot calls
  it before anything uses an adapter; it is safe to call again.
- **`getAdapter(name)`** resolves `name` (`type` or `type:feature`) through
  `getConfig()` on every call, loads the class, and constructs and validates the
  instance on first use. Instances are cached by requested name and class, so a
  changed option reaches a new instance only after `clearCache()`, while
  switching the active class and back returns the earlier instance. A cached
  lookup still resolves and loads, so a class that can no longer be loaded
  throws even for a cached name. There is no readiness guard: lookups before
  `init()` work and are not validated up front.
- **`clearCache()`** drops the manager's references so the next lookup
  constructs afresh. It is not disposal: adapters own their resources, and
  consumers that retained an instance keep it.

[`loadAdapterClass`](src/adapter-manager/loader.ts) and
[`resolveAdapterOptions`](src/adapter-manager/options.ts) are exported for callers
that need resolution without a manager, such as the validation CLI.

## Service initialization

[`defineService(name, create)`](src/define-service.ts) gives a service root `init()`,
`stop()` and a `.service` getter. `name` identifies the service in the error raised
when it is used before initialization. The `create` callback runs when `init()` is
called, not when the service root is declared.

### Responsibilities

- **Boot** binds the root and awaits `init()` in the appropriate startup phase,
  before code uses the service. It must await `init()` even when `create`
  returns synchronously:

  ```js
  const example = require('./server/services/example').default;
  await example.init();
  ```

- **The author of the `create` callback** constructs the instance, completes
  any required startup work, and returns the ready instance. The callback may
  return it synchronously or through a promise. It must not recursively
  initialize its own service root.
- **Consumers** use `.service` after initialization. Reading it earlier throws.

### Readiness and retries

Concurrent calls to `init()` share one attempt. After successful initialization,
subsequent calls retain the same instance. If `create` throws or rejects,
`init()` rejects with that error and `.service` remains unavailable. A later
explicit call to `init()` invokes `create` again; there is no automatic retry.

The callback author must release resources acquired during a failed attempt
before passing the error back. For example, remove listeners already registered,
stop timers already started, or close connections opened by that attempt. Await
any asynchronous cleanup before rejecting so another attempt cannot overlap it.

`defineService` resets its own initialization state after failure. It cannot
release those resources: it has no knowledge of the callback's startup work and
has not received a ready instance. Without cleanup, a retry could leave both the
failed and successful instances listening for the same event.

A service that acquires resources can leave this cleanup to `defineService` by
acquiring them in a `start` hook instead.

### Starting and stopping

Pass an object instead of a callback to separate what a service builds once from
what it acquires on each boot:

```ts
defineService('Example', {
  create: () => new ExampleService(dependencies),
  start: (service) => service.subscribeEvents(),
  stop: (service) => service.unsubscribeEvents(),
});
```

- **`create`** runs once per process. The instance survives `stop()`, so consumers
  that hold it keep a valid reference.
- **`start`** runs after `create`, and again on each `init()` that follows a
  `stop()`. `.service` is unavailable until the first `start` resolves.
- **`stop`** drains pending work and releases what `start` acquired. `root.stop()`
  does nothing unless the service is started. `.service` stays readable afterwards.

Call `stop()` only after `init()` has resolved, and `init()` only after a `stop()`
has resolved. Overlapping the two is not supported.

If `start` fails, `defineService` calls `stop` and rejects `init()` with the
original error, so `stop` must be safe after a partial `start`. A retry runs
`start` again without calling `create`. If that cleanup throws, its error
replaces the original. If `stop` fails, `stop()` rejects and a later `init()`
still starts the service.

`defineService` does not know when the application stops. Boot connects the two,
for example by registering `root.stop()` as a server cleanup task. Hooks run with
no deadline of their own. A root without hooks has a `stop()` that does nothing.

See the [service-author example](../ghost/core/server/services/README.md#initialization)
for IndexNow's hooks and their tests. Background job registration remains with its
existing owners; `defineService` does not provide that hook.

### Transitional extras

An optional third argument preserves helpers that still accompany a service root:

```ts
const example = defineService('Example', createService, { isAvailable });
example.extras.isAvailable();
```

The supplied object and its member types are retained. Without that argument the
root exposes only `init`, `stop` and `service`. The helper never invokes extras or assigns
them lifecycle meaning. They do not change readiness, initialization retries or
resource ownership; each caller must respect the extra's documented timing.

This is a temporary migration interface. The [services guide](../ghost/core/server/services/README.md)
describes how to catalogue extras while their eventual ownership is established.
