# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and general-purpose dependencies, but
must not import from elsewhere in the Ghost package, including `shared`.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

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
