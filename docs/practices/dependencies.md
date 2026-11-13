# Dependencies

These rules decide what code in Ghost Core may import directly and what it must
be given by the code that composes it. They apply to new code everywhere in
Ghost Core. Services check them in CI; the
[services guide](../../ghost/core/server/services/README.md#dependency-boundaries)
explains how service roots wire dependencies and how existing violations are
tracked.

## Import only what is stateless

Import a library or shared file directly only when it, and everything it
imports, works only on what the caller gives it:

- It holds no state of the running application, such as config, settings,
  connections, subscriptions or registries.
- It does no I/O of its own: no files, network or database.

A class is fine when the caller builds the instance and passes in anything
stateful. Time, randomness and `DEBUG` tracing are not application state.

Everything else is an instance, and the code that composes the feature passes
it in. For a service, that is its root `index.ts`. Instances include logging,
config, settings, models, the database, event buses and other services. Shared
files built from them are instances too: URL utils, labs, Sentry and i18n are
built from config or settings. So is a file that imports any of these, and
anything that makes its own requests, such as `request-external`, `got` or the
mailer.

## Values that change while Ghost runs

Config is fixed when the process starts, so the composing code can read it
once. Settings can be edited while Ghost runs. When code needs a setting each
time it runs, pass a function that reads it rather than the value, such as
`getTimezone: () => settingsCache.get('timezone')`. Passing the value captures
it at startup, so later edits would not take effect.

## Specialist dependencies

A general dependency is a building block that any part of Ghost could use, such
as `@tryghost/errors`, `zod` or Node's `crypto`. It may be imported anywhere it
passes the stateless rule.

A specialist dependency serves one capability: a file format, a protocol or an
outside system. Most packages used in only one or two places are specialist,
such as CSV parsing, oEmbed metadata or one-time codes. Only the files or
folders that own its capability may import it. To use one somewhere else, use
the owning code, or add the new consumer to the owners so it gets reviewed.

When a specialist dependency does its own I/O, such as the Stripe SDK or a
payment protocol, only its provider client imports it. A provider client is the
one file or folder that wraps the SDK in the API Ghost needs. Everything else,
including service roots, uses the provider client. A provider client used by
one service lives in that service; one shared by several belongs in
`server/lib`.

## Import forms

Some libraries are allowed only in one form:

- **Lodash:** import individual functions, such as `lodash/pick`. The whole
  `lodash` package is not allowed. Plain JavaScript is often simpler.
- **Dates and times:** use the [kernel clock](../../ghost/core/kernel/clock.ts).
  Do not import Moment, Moment Timezone, Luxon or any other date library
  elsewhere. The clock's deprecated `moment` export keeps existing date logic
  working while it moves.
- **Files:** do not import `fs` or `fs-extra`. Code that needs files is given a
  loader limited to those files, like `readTemplate` in the
  [comments service root](../../ghost/core/server/services/comments/index.ts).
  A library that reads or writes files itself, such as `glob` or `gscan`, is
  passed in the same way.

## Where the rules are checked

`pnpm lint:boundaries` checks every service under `ghost/core/server/services`.
The [dependency-cruiser config](../../.dependency-cruiser.cjs) holds:

- the allowlist of general dependencies and shared files;
- `specialistDependencies`, which names each specialist dependency and its
  owners. The `specialist-dependencies` rule rejects an import from anywhere
  else in Ghost Core, including service roots;
- `serviceDependencyDecisions`, which records whether each rejected dependency
  must be injected or imported in another form.

`pnpm gx services report` groups the remaining violations by those decisions.
Apart from specialist dependencies, code outside services is not checked yet.
Apply the same rules when you change it.
