# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

This directory is a temporary home for `defineService` while we prove the service
migration approach. The helper's shape and location may evolve as more services
migrate.

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and general-purpose dependencies, but
must not import from elsewhere in the Ghost package, including `shared`.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

## Clock

[`clock.ts`](clock.ts) exposes `getUnixTime()` for the current time in whole
seconds. Services may import it directly. Its deprecated `moment` export keeps
existing Moment Timezone operations available while services migrate; callers
can change their import without rewriting date logic. It shares the existing
library instance and leaves Ghost's timezone configuration unchanged.

## Adapter manager

[`adapter-manager/`](adapter-manager/index.ts) loads, validates and caches
adapter instances by type. It knows nothing about which adapters exist, where
they are installed or how they are configured: the application constructs
`AdapterManager` with its base-class registry, search paths, module loader and
a `getConfig` callback returning the [adapter configuration](adapter-manager/types.ts)
keyed by type. Ghost's registry, search paths and configuration normalization
live in [`server/services/adapter-manager`](../server/services/adapter-manager/index.ts),
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

[`loadAdapterClass`](adapter-manager/loader.ts) and
[`resolveAdapterOptions`](adapter-manager/options.ts) are exported for callers
that need resolution without a manager, such as the validation CLI.

## Service initialization

[`defineService(name, create)`](define-service.ts) gives a service root `init()`
and a `.service` getter. `name` identifies the service in the error raised when
it is used before initialization. The `create` callback runs when `init()` is
called, not when the service root is declared.

### Responsibilities

- **Boot** calls and awaits `init()` in the appropriate startup phase, before
  code uses the service. It must await `init()` even when `create` returns
  synchronously.
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

See the [service-author example](../server/services/README.md#initialization)
for IndexNow's partial-subscription cleanup and its test. This failure handling
is separate from normal shutdown. Shutdown and background job registration
remain with their existing owners; `defineService` does not provide those hooks.

### Transitional extras

An optional third argument preserves helpers that still accompany a service root:

```ts
const example = defineService('Example', createService, { isAvailable });
example.extras.isAvailable();
```

The supplied object and its member types are retained. Without that argument the
root exposes only `init` and `service`. The helper never invokes extras or assigns
them lifecycle meaning. They do not change readiness, initialization retries or
resource ownership; each caller must respect the extra's documented timing.

This is a temporary migration interface. The [services guide](../server/services/README.md)
describes how to catalogue extras while their eventual ownership is established.
