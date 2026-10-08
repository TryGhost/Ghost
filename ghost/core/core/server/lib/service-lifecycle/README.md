# Service lifecycle

`defineService` gives a service root one application-owned instance per boot.
Announcement-bar is the first root using it. Other roots still have their legacy
interfaces; see the [services guide](../../services/README.md).

```ts
const root = defineService({
  name: 'example',
  create({ onDispose }) {
    const instance = new Example();
    onDispose(() => instance.unsubscribe());
    instance.subscribe();
    return instance;
  },
});

const scope = {}; // One identity owned by this boot.
await root.init(scope);
root.service.doSomething();
await root.shutdown(scope);
```

Register cleanup before fallible resource acquisition. Creation may be async;
the instance becomes available only when it completes successfully. Cleanup
runs once in reverse registration order, attempting every disposer. A failed
start preserves its original error and reports cleanup failures separately.
Failed cleanup prevents another initialization over potentially leaked resources.

Boot explicitly calls and awaits `init(scope)`. Calls with the same active scope
join the same initialization; a different scope cannot replace it. After
successful shutdown, only a fresh scope can start the service. Shutdown from an
old scope cannot dispose a later boot. Shutdown during creation waits for it and
cleans up without publishing the candidate. There is no automatic retry or
service discovery.

Callers can retain `root.service` before boot. Reading its members or calling a
retained method while unavailable throws a service-named `IncorrectUsageError`.
Methods retain their receiver and synchronous return behaviour. Captured method
references forward to the current instance; ordinary property values are returned
unchanged, so captured nested objects keep their original identity across boots.
The facade does not support object reflection, mutation or thenable services.

The helper does not cancel or drain arbitrary business operations. A service
which starts work must arrange its own draining in its registered cleanup.

Real-server boots dispose managed roots through `GhostServer.stop()` after the
HTTP drain. A `server: false` boot still returns a callable Express app, with an
additional `stop()` method that enters maintenance and disposes its managed roots.
An owner which calls `app.listen()` must drain that listener before `app.stop()`.
This only covers roots migrated to this helper; it does not replace cleanup of
legacy services.
