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

`createApplication` also returns `start()` and `stop()`: see
[the start sequence](#the-start-sequence).

The instances together are the **foundation**. The foundation is handed out,
never imported.

Config loading and validation are framework code too, but have not moved here:
an application's definition supplies a function that loads its config.

## The start sequence

`application.start(options)` runs seven steps. The foundry owns their order;
the application's definition supplies what goes in each one, under `steps`.

| Step            | What the foundry does                                                 |
| --------------- | --------------------------------------------------------------------- |
| 1. `foundation` | Builds config, the logger, the database handle and the event bus      |
| 2. `database`   | Calls the application's `run`, which initialises or migrates          |
| 3. `shared`     | Starts each entry of `modules`, one after another, in the order given |
| 4. `services`   | The same, for everything else. Domains will start here                |
| 5. `jobs`       | Calls the application's `run`, which starts its job runner            |
| 6. `ready`      | Calls the application's `run`                                         |
| 7. `background` | Starts work that `start()` does not wait for                          |

- **Slots.** Every step may have `before` and `after` lists (`foundation` has
  only `after`). A slot is a name and a `run` function, with an optional
  `stop`. The foundry runs each in order without knowing what it is. Slots are
  declared only in the application definition.
- **Modules** are named without being loaded: an entry is a name and a `load`
  function, called only when the step reaches the entry. What it returns needs
  an `init()` and may have a `stop()`, as a `defineService` root does.
- **A slot may sit in a `modules` list**, between two modules, for work that
  has to happen there and is not a module yet. It runs in its place.
- **`when`** on a slot or a module skips it for one start.
- **A failure** in steps 1 to 6 rejects `start()` with that error, and nothing
  after it runs.
- **Background** entries run one after another once the application is ready.
  A failing entry is logged and the next still runs. `start()` resolves with
  the run; its `background` promise settles when the entries have finished.
- **The run** is made new by each `start()`: the options it was called with,
  the foundation, and a `state` object the application's own steps use to hand
  values to each other. `start()` may be called again after `stop()`; the
  foundation is still built once.
- **`stop()`** calls the `stop` of every slot and module the last `start()`
  reached, in reverse order. A failing stop is logged and the rest still run.

The foundry installs no signal handlers and never exits the process. The
application decides when to call `stop()`.

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
