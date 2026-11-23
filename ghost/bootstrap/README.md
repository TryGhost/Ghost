# Bootstrap

Ghost, as an application of the framework. The framework's side is the
[kernel](../../tbd/kernel/README.md) and the [foundry](../../tbd/foundry/README.md);
this folder holds only what Ghost tells the foundry.

## What belongs here

- **The application**, [`app.ts`](app.ts): Ghost's one application. Importing it
  builds nothing and reads nothing.
- **The lists** Ghost gives the application.
  [`services.ts`](services.ts) names the service roots the application is told
  about: `listening`, the roots that declare listeners, and `background`, the
  roots whose `start` is work no request asks for. A list names a root and loads
  nothing until boot uses the list.
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

| File                                                      | Why it exists                                                                                                                                              | Leaves when                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`define-service.ts`](transition/define-service.ts)       | Adds the `.service` getter to a definition, for the code that reads a service off the module it imports. The getter assumes one application in the process | Each reader is handed its service; a root then imports `#kernel/define-service`                    |
| [`legacy-foundation.ts`](transition/legacy-foundation.ts) | Hands the application the config, logger, database handle and event bus that legacy modules build for themselves on import                                 | The foundry builds the foundation from Ghost's values and the legacy paths return what it built    |
| [`legacy-events.ts`](transition/legacy-events.ts)         | One event bus over `@tryghost/domain-events` and the string-named bus, and `legacyEvent()` to name an event of the second                                  | The foundry builds the bus, and nothing a service listens for is published on the string-named bus |
