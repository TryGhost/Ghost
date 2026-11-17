# Bootstrap

Spike: see [the findings log](../../../docs/plans/domain-spike-findings.md).

Ghost, as an application of the framework. The framework's side is the
[kernel](../kernel/README.md) and the [foundry](../foundry/README.md);
this folder is what Ghost supplies, together with its config values in
[`shared/config`](../shared/config/).

- [`app.ts`](app.ts) defines the application and **holds it**: this is the one
  module where Ghost's config, logger, database handle and event bus live.
  Importing it builds nothing. `boot.js` calls `startFoundation()` first.
- [`logging-options.ts`](logging-options.ts) works the logger's options out
  from config. `loggingrc.js` returns the same options to the packages that
  read that file themselves.
- [`legacy-logging.ts`](legacy-logging.ts) and
  [`legacy-events.ts`](legacy-events.ts) make the application's logger and
  event bus the same ones that `@tryghost/logging` and
  `@tryghost/domain-events` hand to code that still imports them.
- [`domains/`](domains/index.ts) is the domain layer boot starts, how Ghost
  schedules a domain's job, and what the domains describe about themselves for
  the central registries.

## One instance

`shared/config` and `server/data/db/connection` keep their paths and return
what the application holds. Code that imports them and code that is handed the
foundation share one config, one logger and one database handle.

New code is handed these and does not import this folder.
