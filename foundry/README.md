# Foundry

Spike: see [the findings log](../docs/plans/domain-spike-findings.md).

The foundry is the framework's code for what exists once per process. It
builds the instances that the [kernel](../kernel/README.md)'s types describe,
from values an application supplies, and assembles them into an application.
It knows nothing about Ghost.

It is the `@tryghost/foundry` workspace package, outside the `ghost` package:

```ts
import { createApplication } from '@tryghost/foundry/application';
```

| File                                   | What it builds                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`config/`](src/config/index.ts)       | `loadConfigSources` layers an application's config files, arguments and environment into a tree. `createConfig` validates it against the application's schema and makes it read-only |
| [`logging.ts`](src/logging.ts)         | `createLogger(options)`: a logger from options, reading no options file                                                                                                              |
| [`database.ts`](src/database.ts)       | `createDatabase(options)`: the database handle from Knex options                                                                                                                     |
| [`events.ts`](src/events.ts)           | `createEventBus({ logging })`: an event bus keyed by class name                                                                                                                      |
| [`domains.ts`](src/domains.ts)         | `readDomains(root)`: reads the domains folder for the kernel's discovery                                                                                                             |
| [`application.ts`](src/application.ts) | `createApplication(definition)`: builds config, logging, database and events once each, in that order, on first use; hands them to each domain; starts the domains                   |

## Who may import it

Only an application's bootstrap, and tests. None of these modules holds state,
but every one of them makes it when called: a second logger writing to the same
rotating file corrupts it, and a second database handle is a second connection
pool. Everything else is handed the instance and imports the kernel's type.

Ghost's bootstrap is [`ghost/bootstrap`](../ghost/bootstrap/README.md). A second
application, used to check that nothing here is Ghost's, is in
[`test/utils/fixtures/second-application`](../ghost/test/utils/fixtures/second-application/bootstrap/app.ts).

## Adapter manager

[`adapter-manager/`](src/adapter-manager/index.ts) loads, validates and caches
adapter instances by type. It knows nothing about which adapters exist, where
they are installed or how they are configured: the application constructs
`AdapterManager` with its base-class registry, search paths, module loader and
a `getConfig` callback returning the [adapter configuration](../kernel/src/adapter-manager/types.ts)
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
[`resolveAdapterOptions`](../kernel/src/adapter-manager/options.ts) are exported for callers
that need resolution without a manager, such as the validation CLI.
