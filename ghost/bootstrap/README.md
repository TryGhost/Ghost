# Bootstrap

Ghost, as an application of the framework. The framework's side is the
[kernel](../../tbd/kernel/README.md) and the [foundry](../../tbd/foundry/README.md);
this folder holds only what Ghost tells the foundry.

## What belongs here

- **The application**, [`app.ts`](app.ts): Ghost's one application. Importing it
  builds nothing and reads nothing.
- **The foundation**, [`foundation.ts`](foundation.ts): one function for each
  part, which the foundry calls when the part is first read. The logger and
  metrics are built here from Ghost's values and registered, so that
  `require('@tryghost/logging')` returns the same logger. Config, the database
  handle and the event bus are still built by legacy modules; see Transition.
- **Values**, [`values/`](values/): what Ghost hands the foundry, as plain
  functions and data. Logging options, and the adapter registry, search paths
  and configuration.
- **The lists** Ghost gives the application.
  [`start.ts`](start.ts) is Ghost's start: an ordered list of entries the foundry
  runs. Each entry is marked `framework`, meaning a Ghost that is stateless, runs
  as several processes and serves several sites would still run it, or
  `earmarked`, with what removes it. An entry with `role: 'worker'` runs only in
  a process with that role; `GHOST_ROLES` names a process's roles and the default
  is both.
  [`services.ts`](services.ts) names the service roots the application is told
  about: `listening`, the roots that declare listeners, and `background`, the
  roots whose `start` is work no request asks for. A list names a root and loads
  nothing until the start uses the list.
- **[`transition/`](transition/)**: code that Ghost needs for now and that would
  not exist in a Ghost that is stateless, runs as several processes and serves
  several sites. See below.

## What does not

- Nothing that knows product behaviour: no `if` about how a feature behaves.
- Nothing built for a single module. Wiring for one service belongs in its root.
- Nothing that runs on its own. Importing any file here has no effect.

## Transition

Everything in `transition/` is earmarked: it exists only because of how Ghost
works today, and each file says what removes it.

| File                                                      | Why it exists                                                                                                                                              | Leaves when                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`boot.ts`](transition/boot.ts)                           | What `ghost/index.js` and the tests call: times the start, and decides what a failed start does to the process                                             | The foundry owns the process: a failed start, the log flush and the exit                            |
| [`steps.ts`](transition/steps.ts)                         | The entries of Ghost's start. Each says whether it is framework or earmarked and what removes it                                                           | Each earmarked entry says so itself; the framework entries move to the module that declares them    |
| [`boot-steps.ts`](transition/boot-steps.ts)               | The phases of the old `core/boot.js` that several entries share, moved unchanged                                                                           | The entries that call them are gone                                                                 |
| [`define-service.ts`](transition/define-service.ts)       | Adds the `.service` getter to a definition, for the code that reads a service off the module it imports. The getter assumes one application in the process | Each reader is handed its service; a root then imports `#kernel/define-service`                     |
| [`legacy-foundation.ts`](transition/legacy-foundation.ts) | Config and the database handle build themselves when their legacy module is loaded; the foundation takes those                                             | The bootstrap builds them from values it names, and the legacy paths return what it built           |
| [`legacy-events.ts`](transition/legacy-events.ts)         | One event bus over `@tryghost/domain-events` and the string-named bus, and `legacyEvent()` to name an event of the second                                  | The foundry builds the bus, and nothing a service listens for is published on the string-named bus  |
| [`adapter-manager.ts`](transition/adapter-manager.ts)     | Builds Ghost's adapter manager when first loaded, because legacy modules ask it for adapters while they are imported                                       | Whatever needs an adapter is handed one; the application then builds the manager, one for each site |
