# Kernel

The kernel contains application-independent framework primitives. It has no
knowledge of Ghost's features, domain models, business rules or configuration.

It is a workspace package, `@tryghost/kernel`, under the placeholder folder
`tbd/`. Ghost imports it as `#kernel/<module>`, a Node subpath import declared in
`ghost/package.json`. Its tests are in [`test/`](test/) and run on their own.

Application code depends on the kernel; the kernel does not depend on application
code. Kernel modules may use one another and general-purpose dependencies, but
must not import from the Ghost package.

Helpers specific to a feature stay with that feature. Shared use alone does not
make a helper part of the kernel.

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

## Services

[`defineService(name, definition, extras?)`](src/define-service.ts) describes how
to build a service. It returns the description and keeps nothing: no instance, no
flag, no registry. Whoever builds from a definition holds what it built, so one
definition can be built once for each application that uses it. Ghost's
application builds each service the first time it is used; see the
[foundry](../foundry/README.md#services).

```ts
export default defineService('Example', () => new ExampleService());
```

`definition` is a `create` callback, or an object that adds the options a service
uses. A service that uses none of them is complete without them.

```ts
export default defineService('Example', {
  needs: { store },
  create: ({ foundation, store }) => new ExampleService({ store, logger: foundation.logger }),
  listeners: [{ event: PostPublished, handle: (service, event) => service.record(event) }],
  start: (service) => service.poll(),
  stop: (service) => service.stopPolling(),
});
```

- **`needs`** names other definitions. Their instances are handed to `create`
  under the same names, with the [foundation](src/foundation.ts).
- **`create`** builds the instance, synchronously. A `create` that returns a
  promise does not compile. It reads what it is given and builds; it does not
  subscribe, schedule or wait.
- **`listeners`** declares the events the service handles, so that an application
  can listen before the service exists and build it when an event arrives.
- **`start`** is work that runs with no caller behind it. It runs only when an
  application starts the service, and may be awaited. **`stop`** releases what
  `start` acquired, and also runs after a failed `start`.

### Transitional extras

An optional third argument keeps helpers that still accompany a service root:

```ts
const example = defineService('Example', createService, { isAvailable });
example.extras.isAvailable();
```

The object and its member types are kept as given. Nothing invokes extras or
gives them lifecycle meaning. This is a temporary migration interface. The
[services guide](../../ghost/core/server/services/README.md) describes how to
catalogue extras while their eventual ownership is established.

## Foundation

[`foundation.ts`](src/foundation.ts) holds the types of what an application is
built on: config, a logger, the database handle, the event bus and a clock. They
are types only. The [foundry](../foundry/README.md) builds a foundation and hands
it to what the application builds; nothing imports one.
