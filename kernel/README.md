# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

It is the `@tryghost/kernel` workspace package, outside the `ghost` package.
Import a file by name, from anywhere:

```ts
import { defineService } from '@tryghost/kernel/define-service';
```

Every file under [`src/`](src/) is importable this way. From source, the name
resolves to the TypeScript; from a build and in the release archive, to
`build/`, so the package is built before Ghost is.

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and the general-purpose dependencies
its own `package.json` declares. It cannot resolve the `ghost` package or the
foundry.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

## Clock

[`clock.ts`](src/clock.ts) exposes `getUnixTime()` for the current time in whole
seconds. Services may import it directly. Its deprecated `moment` export keeps
existing Moment Timezone operations available while services migrate; callers
can change their import without rewriting date logic. It shares the existing
library instance and leaves Ghost's timezone configuration unchanged.

## Adapter manager types

[`adapter-manager/`](src/adapter-manager/index.ts) holds what any code may
import about adapters: the types and the pure functions that work an adapter's
options out of [configuration](src/adapter-manager/types.ts). The
`AdapterManager` class and its loader read the disk and exist once per
process, so they are in the [foundry](../foundry/README.md#adapter-manager).

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

## Foundation types

Spike: see [the findings log](../docs/plans/domain-spike-findings.md).

Code that needs configuration, a logger, the database or the event bus is
handed one. These files say what it is handed. Each is a type, so importing one
builds nothing and reads nothing:

- [`logging.ts`](src/logging.ts): `Logger`, and `LoggerOptions` for whoever builds one.
- [`config.ts`](src/config.ts): `Config`, with `get` and `slice`. `parseConfigSlice`
  is the one function here: it parses a value with the schema its reader
  declares.
- [`database.ts`](src/database.ts): `Database`.
- [`events.ts`](src/events.ts): `EventBus`.
- [`foundation.ts`](src/foundation.ts): `Foundation`, the four together. A domain's
  `boot.ts` receives it.

The [foundry](../foundry/README.md) builds the instances. Nothing in the
kernel can.

## Testing

[`testing/`](src/testing/index.ts) holds fakes of what the foundation hands out,
for unit tests of code that is handed it: `createLoggerFake`,
`createConfigFake`, `createEventBusFake` and `createFoundationFake`. They are
written against the types above, use no test library and share nothing between
calls.

## Domains

Spike: see [the findings log](../docs/plans/domain-spike-findings.md).

[`domains/`](src/domains/) makes each kind of file in a domain folder work. It has
three parts, none of which knows anything about Ghost:

- [`definitions.ts`](src/domains/definitions.ts) holds `defineEvent`,
  `defineListener`, `defineJob`, `defineRoutes`, `defineSettings`,
  `definePermissions`, `defineSchema` and `defineDomain`. Each only describes:
  it tags and returns what it is given, so importing a file has no effect.
- [`discover.ts`](src/domains/discover.ts) works out what every domain contains
  from a listing of its fixed folders, and returns what it found. It reads and
  loads nothing: the caller says how a folder is listed and how a file is
  loaded, and each entry loads its file on first use. A layer folder may hold
  capability subfolders one level deep. `transition/` and `test/` are never
  listed.
- [`domain-layer.ts`](src/domains/domain-layer.ts) starts what was found, given
  the foundation, an event bus, a job scheduler and a logger: service roots in the order they
  declare within their domain, then listeners; after Ghost is ready, roots that
  do not block boot and jobs. It also hands a web layer the routes of a surface
  and a registry the fragments of a kind.

`defineService` takes two optional declarations that only the domain layer
reads: `startAfter`, naming other roots in the same domain, and
`blocking: false`. A root started by the domain layer receives what its
domain's `boot.ts` supplies as the argument to `create`. `boot.ts` is handed
the foundation; a domain without one hands it to its roots unchanged.

The [foundry](../foundry/README.md) reads the folders and assembles the
application whose domain layer boot starts.
