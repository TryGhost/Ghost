# Foundry

The foundry builds an application from what the application gives it. It is a
workspace package, `@tryghost/foundry`, under the placeholder folder `tbd/`.
Ghost imports it as `#foundry/<module>`, a Node subpath import declared in
`ghost/package.json`. Its tests are in [`test/`](test/) and run on their own.

Only an application's bootstrap imports the foundry. For Ghost that is
[`ghost/bootstrap`](../../ghost/bootstrap/README.md). The foundry never imports
Ghost, and knows nothing about what Ghost is: it is told.

## Foundation

[`createFoundation(parts)`](src/foundation.ts) builds a
[foundation](../kernel/src/foundation.ts) from one function for each part:
config, logger, database handle and event bus, written by the application, and a
clock that defaults to the system's. A part is handed the parts before it. Each
is built once, when it is first read, so declaring a foundation builds nothing.

## Application

[`createApplication({ name, foundation })`](src/application.ts) returns an
application: its foundation and its services. Building one loads nothing, starts
nothing and reads nothing. Everything an application holds is inside the object,
so two applications in one process share nothing.

- **`start(steps, state)`** runs the steps the application supplies, in the order
  given, each to completion before the next. A step is a name and a function. It
  is handed the foundation, the services, `state` and `onStop(name, stop)` to
  register what has to be undone. The foundry names no step and has no slots
  before or after one: the order is the list. A step that fails ends the start
  with its error.
- **`stop()`** runs what the steps registered, last registered first, then closes
  the services. A failure is logged and the rest still run.

## Services

[`application.services`](src/services.ts) holds what the application has built
from [service definitions](../kernel/README.md#services). A definition holds no
instance; this does.

- **`register(definition)`** tells the application about a definition that
  declares listeners. From when services can be built until they close, the
  application listens for those events. Nothing is built.
- **`open()`** allows services to be built. The application calls it at the
  point in its start where building is safe.
- **`get(definition)`** returns the instance, building it on first use: its
  `needs` are built first and handed to `create` with the foundation.
- **`start(definition)`** builds the service if nothing has, then runs its
  `start` and waits for it. Starting a definition registers it.
- **`close()`** runs the `stop` of everything started, last started first, stops
  listening, and forgets every instance and registration. Building is refused
  until the next `open()`.

What it refuses, each with an `IncorrectUsageError`:

- building while services are not open;
- a definition that declares listeners or a `start` and was never registered,
  whose events would be missed without a sign;
- a `create` that returns a promise;
- a definition that needs itself, directly or through what it needs.

A failed build keeps nothing: the error reaches whoever used the service, or the
event bus when an event caused the build, and the next use builds again.

## Adapter manager

[`adapter-manager/`](src/adapter-manager/index.ts) loads, validates and caches
adapter instances by type. It knows nothing about which adapters exist, where
they are installed or how they are configured: the application constructs
`AdapterManager` with its base-class registry, search paths, module loader and
a `getConfig` callback returning the [adapter configuration](src/adapter-manager/types.ts)
keyed by type. Ghost's registry, search paths and configuration normalization
are values in [`ghost/bootstrap/values/adapters`](../../ghost/bootstrap/values/adapters/base-classes.ts);
`bin/validate-adapters.ts` shares the same loader and registry so a build-time
check resolves adapters exactly as the server does.

### Contract

- **Construction** registers base classes only. It reads no configuration and
  loads nothing.
- **`init()`** validates every configured adapter up front: it resolves each
  configured type and feature to a distinct class and options, loads the class,
  calls its optional static `validate`, and aggregates all failures into one
  error. It constructs no instances and does not touch cached ones. It is safe
  to call again.
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
