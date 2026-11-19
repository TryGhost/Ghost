# Bootstrap

Ghost, as an application of the framework. The framework's side is the
[kernel](../../kernel/README.md) and the [foundry](../../foundry/README.md);
this folder holds only what Ghost tells the foundry.

## What belongs here

- **One application definition**, [`app.ts`](app.ts). It also holds the
  application object, so it is the one module where Ghost's config, logger,
  database handle, event bus and clock live. Importing it builds nothing. Boot calls
  `startFoundation()` first.
- **Ghost's values for the foundation instances**: where config is, the
  logger's options ([`logging-options.ts`](logging-options.ts)) and the
  database options. `loggingrc.js` returns the same logger options to the
  packages that read that file themselves.
- **The ordered lists and slots**: `steps` in `app.ts` says what runs in each
  step of the [start sequence](../../foundry/README.md#the-start-sequence),
  and in what order. An entry names what it runs and loads nothing until its
  step reaches it, so the HTTP server is listening in maintenance mode before
  anything heavy is loaded.
- **[`transition/`](transition/)**: code that is here because boot needs it but
  that is not yet shaped to these rules. See below.

## What does not

- Nothing that knows product behaviour: no `if` about how a feature behaves.
- Nothing that runs on its own. Importing any file here has no effect.
- No wiring for a single shared module or service. That belongs with the
  module.

Only boot and the legacy paths named in the `bootstrap-only-from-boot`
boundary rule import this folder. New code is handed what it needs.

Outside `transition/`, a file here imports nothing from `ghost/core` except
types, the config loader, the database options and the service roots the
services list names. The
`bootstrap-reaches-core-only-through-transition` boundary rule checks this.

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
- [`legacy-steps.ts`](transition/legacy-steps.ts) holds one wrapper for each
  step of the start sequence that the framework does not own yet. The steps
  themselves are still functions of [`core/boot.js`](../core/boot.js). A
  [test](../test/unit/bootstrap/steps.test.ts) checks that each step `boot.js`
  exports is listed exactly once.

## Adapters

[`adapters.ts`](adapters.ts) is Ghost's values for the foundry's adapter
manager: the base class of each adapter type, and where adapters are looked
up. The application definition hands them over with the loader and a function
that reads adapter configuration; the foundry builds the manager and validates
the configured adapters during start. How Ghost's config becomes adapter
configuration still knows about products (import storage, redirects, route
settings), so it stays in
[`core/server/services/adapter-manager/config.ts`](../core/server/services/adapter-manager/config.ts).

## The services list

[`services.ts`](services.ts) is what the services step starts: one ordered
list. A standard service root is one line, and the framework awaits its
`init()` and later calls its `stop()`. The entries named `legacy: …` are legacy
steps that still sit between services; the list says what each waits on.

## The shared list

[`shared.ts`](shared.ts) is what the shared step starts, before any service:
the modules every service may rely on, in an order that is real (settings
reads limits; signing keys and i18n read settings). The framework hands each
module the foundation and the instances of the earlier entries it names in
`needs`. Entries named `legacy: …` are shared modules not yet shaped as one.
The rules for a shared module are in [`ghost/shared`](../shared/README.md).

Nothing in `transition/` is automatic: whatever needs it calls it by name.
