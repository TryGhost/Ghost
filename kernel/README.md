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

## No state, no reads

A kernel module holds no state, reads no files, environment or time, runs
nothing when it is imported and exports no instances. That is what lets any
code import it. The kernel's [ESLint configuration](eslint.config.mjs) checks
what a linter can:

- The top level of a file holds imports, types, functions, classes and `const`
  literals only: no `let`, no object, call or `new` at the top level, no
  default-exported value, no static class members.
- No Node built-in module is imported, no `require()` or `import()` is called,
  and `process`, `globalThis`, `__dirname` and `fetch` are not used.
- `@tryghost/logging` and `knex` are imported for their types only.
- `Date.now()`, `new Date()` without an argument and `Temporal.Now` are not
  used. A function that needs the time takes it as an argument.

It cannot check the rest, which is for review:

- A read made by a dependency, or through an alias (`const D = Date`).
- The host's timezone and locale, which `Intl` reads when none is passed.
- `Math.random()` and other sources of values that differ between calls.
- State written onto something imported, or onto a function's own properties.

## Foundation types

Code that needs configuration, a logger, the database, the event bus or the
time is handed one. These files say what it is handed. Each is a type, so importing one
builds nothing and reads nothing:

- [`logging.ts`](src/logging.ts): `Logger`, and `LoggerOptions` for whoever builds one.
- [`config.ts`](src/config.ts): `Config`.
- [`database.ts`](src/database.ts): `Database`.
- [`events.ts`](src/events.ts): `EventBus`.
- [`clock.ts`](src/clock.ts): `Clock`.
- [`foundation.ts`](src/foundation.ts): `Foundation`, the five together.

The [foundry](../foundry/README.md) builds the instances. Nothing in the
kernel can.

## Clock

Nothing in the kernel reads the time. [`clock.ts`](src/clock.ts) has the `Clock`
type, whose `now()` returns epoch milliseconds, and functions that work on a
time they are given. The [foundry](../foundry/README.md) builds the one clock a
process has, and it is handed out as `foundation.clock`.

`toUnixTime()` turns epoch milliseconds into whole seconds. Ghost code that
imports the current time instead of being handed the clock uses
[`ghost/core/shared/clock.ts`](../ghost/core/shared/clock.ts), which reads the
foundation's clock and also holds the deprecated `moment` export.

For calendar dates and site timezones, `clock.ts` exposes Temporal-based
helpers that take ISO `YYYY-MM-DD` dates and IANA timezone names:
`resolveTimeZone()`, `startOfLocalDay()`, `localDateOf()`, `addDays()` and
`daysBetween()`. `startOfLocalDay()` follows the timezone's daylight saving
rules, so a day whose midnight is skipped starts at the transition.

## Adapter types

[`adapter-manager/`](src/adapter-manager/index.ts) has what code needs to talk
about adapters without loading one: the `Adapter` and configuration
[types](src/adapter-manager/types.ts), the options an adapter manager is built
from, and [`resolveAdapterOptions`](src/adapter-manager/options.ts), which
works out an adapter's class name and options from configuration it is given.

The adapter manager itself, and the loader that reads adapters from disk, are
in the [foundry](../foundry/README.md#adapter-manager): a manager is built once
and reads files, so it is not kernel code.

## Service initialization

[`defineService(name, create)`](src/define-service.ts) gives a service root `init()`,
`stop()` and a `.service` getter. `name` identifies the service in the error raised
when it is used before initialization. The `create` callback runs when `init()` is
called, not when the service root is declared.

### Responsibilities

- **The application** starts the root and awaits `init()` before code uses the
  service, even when `create` returns synchronously. In Ghost the root is an
  entry in the services list, and the start sequence awaits it:

  ```ts
  { name: 'example', load: () => require('../core/server/services/example').default },
  ```

- **The author of the `create` callback** constructs the instance, completes
  any required startup work, and returns the ready instance. The callback may
  return it synchronously or through a promise. It must not recursively
  initialize its own service root.
- **Consumers** use `.service` after initialization. Reading it earlier throws.

A root may declare what it is handed instead of importing it:
`defineService<Service, Dependencies>(name, (dependencies) => …)`. `create`
receives what the first `init(dependencies)` was called with. Only the start
sequence supplies it, and today only to the modules of the shared step, which
are given the foundation and the earlier shared modules they name. A `start`
hook receives it as its second argument, on every start.

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
