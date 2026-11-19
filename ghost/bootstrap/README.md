# Bootstrap

Ghost, as an application of the framework. The framework's side is the
[kernel](../../kernel/README.md) and the [foundry](../../foundry/README.md);
this folder holds only what Ghost tells the foundry.

## What belongs here

- **One application definition**, [`app.ts`](app.ts). It also holds the
  application object, so it is the one module where Ghost's config, logger,
  database handle and event bus live. Importing it builds nothing. Boot calls
  `startFoundation()` first.
- **Ghost's values for the foundation instances**: where config is, the
  logger's options ([`logging-options.ts`](logging-options.ts)) and the
  database options. `loggingrc.js` returns the same logger options to the
  packages that read that file themselves.
- **[`transition/`](transition/)**: code that is here because boot needs it but
  that is not yet shaped to these rules. See below.

## What does not

- Nothing that knows product behaviour: no `if` about how a feature behaves.
- Nothing that runs on its own. Importing any file here has no effect.
- No wiring for a single shared module or service. That belongs with the
  module.

Only boot and the legacy paths named in the `bootstrap-only-from-boot`
boundary rule import this folder. New code is handed what it needs.

## One instance

`shared/config` and `server/data/db/connection` keep their paths and return
what the application holds. Code that imports them and code that is handed the
foundation share one config, one logger and one database handle.

## Transition

Everything directly in this folder is TypeScript and follows the rules above.
Anything that does not yet is in `transition/`, so that it cannot be mistaken
for the pattern to copy:

- [`legacy-logging.ts`](transition/legacy-logging.ts) makes the application's
  logger the one `@tryghost/logging` hands to code that still imports the
  package. It relies on where the package caches its instance, which the
  package does not promise.
- [`legacy-events.ts`](transition/legacy-events.ts) adapts
  `@tryghost/domain-events`, a class with one static emitter, to the
  foundation's event bus, so there is one bus either way.

Nothing in `transition/` is automatic: whatever needs it calls it by name.
