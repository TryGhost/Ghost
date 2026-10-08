# Service initialization

`defineService` gives service roots one construction and access pattern.
Boot initializes the root explicitly; callers retain `root.service`.
Announcement-bar is the first converted root. Other services still use their
legacy interfaces; see the [services guide](../../services/README.md).

A service that only assembles dependencies needs just `create`:

```ts
const root = defineService({
  name: 'example',
  create: () => new Example(dependencies),
});

await root.init();
root.service.doSomething();
```

Repeated `init()` calls share initialization and retain the same instance.
There is no `shutdown` export unless the service supplies a shutdown hook.
Composition-only services do not need empty lifecycle methods or a cleanup task.
Their dependencies must remain usable across repeated boots in the same process;
check captured dependencies when converting each root.

Services that acquire resources can add `start` and `shutdown`:

```ts
const root = defineService({
  name: 'subscriber',
  create: () => new Subscriber(dependencies),
  start: instance => instance.subscribe(),
  shutdown: instance => instance.stop(),
});
```

`create` constructs the instance; put fallible resource acquisition in `start`
so `shutdown` has the instance needed to clean up a partial start. Both creation
and startup may be asynchronous. The instance becomes available only after they
succeed. A `start` hook does not require a shutdown hook if it acquires no resources.

Failed startup runs the shutdown hook once and preserves the original failure.
Cleanup failures are reported separately and prevent reinitialization over leaked
resources. A later explicit `init()` can retry after successful cleanup; there is
no automatic retry. Shutdown removes the published instance immediately, waits
for pending startup, and cleans up once. Initialization during shutdown is
rejected. After successful shutdown, `init()` constructs a fresh instance.

Boot uses `initializeService` to await initialization and register cleanup only
when `shutdown` exists. The initializer memoizes each cleanup callback, so repeating an
old boot's cleanup cannot stop a later initialization. Resource owners must have
a cleanup owner before initialization. Real-server boot uses `GhostServer`;
`server: false` has no cleanup owner yet and cannot initialize a resource-owning
root through this adapter. Composition-only roots work in both modes. This helper
does not support concurrent independent Ghost boots sharing resource-owning roots.

Callers can retain `root.service` before boot. Member reads and retained method
calls before readiness or after resource shutdown throw a service-named
`IncorrectUsageError`. Methods preserve their receiver and synchronous return
behavior. Captured methods forward to the current instance; ordinary property
values are returned unchanged, so captured nested objects keep their original
identity. The facade does not support object reflection, mutation or thenable
services.

The helper does not cancel or drain business operations. A service that starts
work must arrange its own draining in its shutdown hook.
