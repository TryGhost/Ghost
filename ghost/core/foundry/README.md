# Foundry

Spike: see [the findings log](../../../docs/plans/domain-spike-findings.md).

The foundry is the framework's code for what exists once per process. It
builds the instances that the [kernel](../kernel/README.md)'s types describe,
from values an application supplies, and assembles them into an application.
It knows nothing about Ghost.

| File                               | What it builds                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`config/`](config/index.ts)       | `loadConfigSources` layers an application's config files, arguments and environment into a tree. `createConfig` validates it against the application's schema and makes it read-only |
| [`logging.ts`](logging.ts)         | `createLogger(options)`: a logger from options, reading no options file                                                                                                              |
| [`database.ts`](database.ts)       | `createDatabase(options)`: the database handle from Knex options                                                                                                                     |
| [`events.ts`](events.ts)           | `createEventBus({ logging })`: an event bus keyed by class name                                                                                                                      |
| [`domains.ts`](domains.ts)         | `readDomains(root)`: reads the domains folder for the kernel's discovery                                                                                                             |
| [`application.ts`](application.ts) | `createApplication(definition)`: builds config, logging, database and events once each, in that order, on first use; hands them to each domain; starts the domains                   |

## Who may import it

Only an application's bootstrap, and tests. None of these modules holds state,
but every one of them makes it when called: a second logger writing to the same
rotating file corrupts it, and a second database handle is a second connection
pool. Everything else is handed the instance and imports the kernel's type.

Ghost's bootstrap is [`core/bootstrap`](../bootstrap/README.md). A second
application, used to check that nothing here is Ghost's, is in
[`test/utils/fixtures/second-application`](../../test/utils/fixtures/second-application/bootstrap/app.ts).
