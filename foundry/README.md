# Foundry

The foundry is the framework's code for what must exist once per process. It
builds the instances that the [kernel](../kernel/README.md#foundation-types)'s
types describe, from values an application supplies, and assembles them into
an application. It knows nothing about Ghost and never imports Ghost code.

It is the `@tryghost/foundry` workspace package, outside the `ghost` package:

```ts
import { createApplication } from '@tryghost/foundry/application';
```

| File                                   | What it builds                                                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`logging.ts`](src/logging.ts)         | `createLogger(options)`: a logger from options, reading no options file                                                                  |
| [`database.ts`](src/database.ts)       | `createDatabase(options)`: the database handle from Knex options                                                                         |
| [`application.ts`](src/application.ts) | `createApplication(definition)`: builds config, the logger, the database handle and the event bus once each, in that order, on first use |

The instances together are the **foundation**. The foundation is handed out,
never imported.

Config loading and validation are framework code too, but have not moved here:
an application's definition supplies a function that loads its config.

## Who may import it

Only an application's bootstrap, and tests. None of these modules holds state,
but every one of them makes it when called: a second logger writing to the same
rotating file corrupts it, and a second database handle is a second connection
pool. Everything else is handed the instance and imports the kernel's type.
The `foundry-only-from-bootstrap` boundary rule checks this.

Ghost's bootstrap is [`ghost/bootstrap`](../ghost/bootstrap/README.md).

## Building

Like the kernel, the package is compiled to `build/` by its own `tsc`. Ghost
typechecks against that output and plain `node` loads it, so it must be built
first; Nx does that through `^build`. Running from source needs no build.
Its tests are in [`ghost/test/unit/foundry`](../ghost/test/unit/foundry/).
