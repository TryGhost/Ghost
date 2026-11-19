import type { Config } from '@tryghost/kernel/config';
import type { Database } from '@tryghost/kernel/database';
import type { EventBus } from '@tryghost/kernel/events';
import type { Foundation } from '@tryghost/kernel/foundation';
import type { Logger } from '@tryghost/kernel/logging';

/**
 * One start of the application. `start()` makes a new one each time it is
 * called; the foundation inside it is the same for the life of the process.
 */
export interface Run<AppConfig extends Config, Options, State> {
  /** What `start()` was called with. */
  readonly options: Options;
  readonly foundation: Foundation<AppConfig>;
  /** What the application's own steps hand to each other during this start. */
  readonly state: State;
  /** Settles when the non-blocking work has finished. It never rejects. */
  readonly background: Promise<void>;
}

/**
 * Something the framework runs at a named point in the start sequence without
 * knowing what it is. Slots are declared only in the application definition.
 */
export interface Slot<StartRun> {
  readonly name: string;
  /** Skips the slot for this start when it returns false. */
  readonly when?: (run: StartRun) => boolean;
  run(run: StartRun): unknown;
  /** Releases what `run` acquired. Called by `stop()`, in reverse order. */
  stop?(run: StartRun): unknown;
}

/** What a list entry loads: a root with `init()`, as `defineService` returns. */
export interface Startable {
  init(): Promise<void>;
  stop?(): Promise<void>;
}

/**
 * An entry in a list of modules the framework starts. The entry names the
 * module without loading it: `load` is called only when the step reaches it.
 */
export interface Module<StartRun> {
  readonly name: string;
  readonly load: () => Startable;
  /** Skips the module for this start when it returns false. */
  readonly when?: (run: StartRun) => boolean;
}

interface Slots<StartRun> {
  /** Run in order before the step's own work. */
  readonly before?: readonly Slot<StartRun>[];
  /** Run in order after the step's own work. */
  readonly after?: readonly Slot<StartRun>[];
}

interface RunStep<StartRun> extends Slots<StartRun> {
  /** The step's own work, supplied by the application. */
  readonly run?: (run: StartRun) => unknown;
}

interface ModuleStep<StartRun> extends Slots<StartRun> {
  /** Started one after another, in this order. */
  readonly modules: readonly Module<StartRun>[];
}

/**
 * What goes in each step of the start sequence. The framework owns the order
 * of the steps; the application supplies their contents.
 */
export interface Steps<StartRun> {
  /** 1. The framework builds config, logging, the database handle and the event bus. */
  readonly foundation?: Pick<Slots<StartRun>, 'after'>;
  /** 2. The database is made ready: initialised or migrated. */
  readonly database?: RunStep<StartRun>;
  /** 3. The shared modules, in the order listed. */
  readonly shared?: ModuleStep<StartRun>;
  /**
   * 4. Everything that is neither foundation nor shared. Today that is a list
   * of service roots. Domains will start here: the step keeps its place and
   * its slots, and the list becomes the domains.
   */
  readonly services?: ModuleStep<StartRun>;
  /** 5. The job runner starts. */
  readonly jobs?: RunStep<StartRun>;
  /** 6. The application is ready to serve. */
  readonly ready?: RunStep<StartRun>;
  /**
   * 7. Work that does not block `start()`. Each entry runs after the one
   * before it has settled; a failure is logged and the rest still run.
   */
  readonly background?: readonly Slot<StartRun>[];
}

/**
 * What an application supplies. Each foundation function is called at most
 * once per process, the first time what it builds is needed, in this order:
 * config, logging, database, events.
 */
export interface ApplicationDefinition<AppConfig extends Config, Options = void, State = object> {
  readonly name: string;
  /** Loads the application's config from its own values. */
  readonly config: () => AppConfig;
  /** Builds the logger, usually with `createLogger` and options read from config. */
  readonly logging: (config: AppConfig) => Logger;
  /** Builds the database handle, or returns undefined when none is configured. */
  readonly database: (foundation: {
    readonly config: AppConfig;
    readonly logging: Logger;
  }) => Database | undefined;
  /** Builds the event bus. */
  readonly events: (foundation: { readonly logging: Logger }) => EventBus;
  /** What runs in each step of `start()`. Without it, `start()` only builds the foundation. */
  readonly steps?: Steps<Run<AppConfig, Options, State>>;
}

export interface Application<AppConfig extends Config, Options = void, State = object> {
  readonly name: string;
  /**
   * The instances every part of the application is handed. Each is built the
   * first time it is read and kept for the life of the process.
   */
  readonly foundation: Foundation<AppConfig>;
  /** Builds every foundation instance now, in order. Boot calls this first. */
  startFoundation(): Foundation<AppConfig>;
  /** Which foundation instances have been built so far, in the order they were. */
  built(): readonly string[];
  /** What the definition put in each step, for reading. Nothing is loaded by reading it. */
  readonly steps: Steps<Run<AppConfig, Options, State>>;
  /**
   * Runs the start sequence: foundation, database, shared, services, jobs,
   * ready, then the background work without waiting for it. Rejects with the
   * error of the first step that fails; later steps do not run.
   *
   * It may be called again after `stop()`. The foundation is built once.
   *
   * @param state - The object this start's steps share. Pass one to keep a
   * reference to it when `start()` rejects.
   */
  start(options: Options, state?: State): Promise<Run<AppConfig, Options, State>>;
  /**
   * Stops what the last `start()` started, in reverse order. A failing stop
   * is logged and the rest still run. Calling it again does nothing.
   */
  stop(): Promise<void>;
}

function once<Value>(build: () => Value): () => Value {
  let built: { readonly value: Value } | undefined;
  return () => (built ??= { value: build() }).value;
}

/**
 * Assembles an application from what it supplies. This is the framework's side
 * of boot: the order the foundation is built in, and building each instance
 * once. It knows nothing about any one application and keeps nothing outside
 * the object it returns.
 *
 * Call it once, from the application's bootstrap, and keep the result there.
 */
export function createApplication<AppConfig extends Config, Options = void, State = object>(
  definition: ApplicationDefinition<AppConfig, Options, State>,
): Application<AppConfig, Options, State> {
  type StartRun = Run<AppConfig, Options, State>;
  const order: string[] = [];
  const tracked = <Value>(name: string, build: () => Value) =>
    once(() => {
      const value = build();
      order.push(name);
      return value;
    });

  const config = tracked('config', definition.config);
  const logging = tracked('logging', () => definition.logging(config()));
  const database = tracked('database', () =>
    definition.database({ config: config(), logging: logging() }),
  );
  const events = tracked('events', () => definition.events({ logging: logging() }));

  const foundation: Foundation<AppConfig> = {
    get config() {
      return config();
    },
    get logging() {
      return logging();
    },
    get database() {
      return database();
    },
    get events() {
      return events();
    },
  };

  function startFoundation() {
    config();
    logging();
    database();
    events();
    return foundation;
  }

  // What the last start() started and can be stopped, in the order it started.
  let stoppable: { readonly name: string; readonly stop: () => unknown }[] = [];

  async function runSlots(slots: readonly Slot<StartRun>[] | undefined, run: StartRun) {
    for (const slot of slots ?? []) {
      if (slot.when?.(run) === false) {
        continue;
      }
      if (slot.stop) {
        stoppable.push({ name: slot.name, stop: () => slot.stop?.(run) });
      }
      await slot.run(run);
    }
  }

  async function runStep(step: RunStep<StartRun> | undefined, run: StartRun) {
    await runSlots(step?.before, run);
    await step?.run?.(run);
    await runSlots(step?.after, run);
  }

  async function runModules(step: ModuleStep<StartRun> | undefined, run: StartRun) {
    await runSlots(step?.before, run);
    for (const entry of step?.modules ?? []) {
      if (entry.when?.(run) === false) {
        continue;
      }
      const root = entry.load();
      stoppable.push({ name: entry.name, stop: () => root.stop?.() });
      await root.init();
    }
    await runSlots(step?.after, run);
  }

  async function runBackground(slots: readonly Slot<StartRun>[], run: StartRun) {
    for (const slot of slots) {
      try {
        if (slot.when?.(run) === false) {
          continue;
        }
        if (slot.stop) {
          stoppable.push({ name: slot.name, stop: () => slot.stop?.(run) });
        }
        await slot.run(run);
      } catch (error) {
        logging().error(error);
      }
    }
  }

  return {
    name: definition.name,
    foundation,
    startFoundation,
    built: () => [...order],
    steps: definition.steps ?? {},
    async start(options, state = {} as State) {
      const steps = definition.steps ?? {};
      stoppable = [];
      let finishBackground: (work: Promise<void>) => void = () => {};
      const run: StartRun = {
        options,
        foundation,
        state,
        background: new Promise<void>((resolve) => {
          finishBackground = resolve;
        }),
      };

      startFoundation();
      await runSlots(steps.foundation?.after, run);
      await runStep(steps.database, run);
      await runModules(steps.shared, run);
      await runModules(steps.services, run);
      await runStep(steps.jobs, run);
      await runStep(steps.ready, run);

      // Not awaited. The first entry begins before start() returns.
      finishBackground(runBackground(steps.background ?? [], run));

      return run;
    },
    async stop() {
      const stopping = stoppable.reverse();
      stoppable = [];
      for (const { stop } of stopping) {
        try {
          await stop();
        } catch (error) {
          logging().error(error);
        }
      }
    },
  };
}
