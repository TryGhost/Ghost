import { IncorrectUsageError } from '@tryghost/errors';
import type { AdapterManagerOptions, BaseClassMap } from '@tryghost/kernel/adapter-manager';
import type { Clock } from '@tryghost/kernel/clock';
import type { Config } from '@tryghost/kernel/config';
import type { ServiceDefinition } from '@tryghost/kernel/define-service';
import type { Database } from '@tryghost/kernel/database';
import type { EventBus } from '@tryghost/kernel/events';
import type { Foundation } from '@tryghost/kernel/foundation';
import type { Logger } from '@tryghost/kernel/logging';
import { AdapterManager } from './adapter-manager';
import { createClock } from './clock';
import { createServices, type Services } from './services';

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
  // A shared module is handed what it is given; every other root ignores it.
  init(given?: any): Promise<void>;
  stop?(): Promise<void>;
  /** The started instance. Read only to hand it to a later shared module. */
  readonly service?: unknown;
}

/**
 * An entry in a list of modules the framework starts. The entry names the
 * module without loading it: `load` is called only when the step reaches it.
 */
export interface Module<StartRun> {
  readonly name: string;
  /**
   * A root with `init()`, which the step starts and waits for. Or, in the
   * services step, a service definition, which the step builds here and, when
   * it declares a `start`, starts.
   */
  readonly load: () => Startable | ServiceDefinition<any, any>;
  /** Skips the module for this start when it returns false. */
  readonly when?: (run: StartRun) => boolean;
  /**
   * Shared step only: the earlier shared modules this one is given, by name.
   * It receives `{ foundation, [name]: that module's instance }` and imports
   * neither.
   */
  readonly needs?: readonly string[];
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

/**
 * An entry in a step's list: a module the framework starts, or a slot for
 * work that has to sit between two modules and is not a module yet.
 */
export type Entry<StartRun> = Module<StartRun> | Slot<StartRun>;

interface ModuleStep<StartRun> extends Slots<StartRun> {
  /** Started one after another, in this order. */
  readonly modules: readonly Entry<StartRun>[];
}

/**
 * A service definition the application registers without building it: the
 * definition's listeners are attached, and the service is built when it is
 * first used or when one of its events arrives.
 */
export interface Declared {
  readonly name: string;
  readonly load: () => ServiceDefinition<any, any>;
}

interface ServicesStep<StartRun> extends ModuleStep<StartRun> {
  /**
   * Registered when the step begins, before `modules`, in no particular
   * order. Nothing here is built by the start sequence.
   */
  readonly declared?: readonly Declared[];
}

/**
 * What goes in each step of the start sequence. The framework owns the order
 * of the steps; the application supplies their contents.
 */
export interface Steps<StartRun> {
  /** 1. The framework builds config, logging, the database handle, the event bus and the clock. */
  readonly foundation?: Pick<Slots<StartRun>, 'after'>;
  /**
   * 2. The database is made ready: initialised or migrated. When the step has
   * finished, the framework validates the configured adapters.
   */
  readonly database?: RunStep<StartRun>;
  /**
   * 3. The shared modules, in the order listed. Each is handed the foundation
   * and the earlier shared modules it names in `needs`.
   */
  readonly shared?: ModuleStep<StartRun>;
  /**
   * 4. Everything that is neither foundation nor shared. Today that is a list
   * of service roots. Domains will start here: the step keeps its place and
   * its slots, and the list becomes the domains.
   *
   * From the beginning of this step until `stop()`, services are built from
   * their definitions on first use.
   */
  readonly services?: ServicesStep<StartRun>;
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
 * config, logging, database, events. The clock is built last and needs
 * nothing from the application.
 */
export interface ApplicationDefinition<
  AppConfig extends Config,
  Options = void,
  State = object,
  BaseClasses extends BaseClassMap = BaseClassMap,
> {
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
  /**
   * The application's values for the adapter manager: which adapter types
   * exist, where adapters are looked up, how one is loaded and how to read
   * their configuration. The framework builds the manager from them once, the
   * first time it is needed, and validates the configured adapters during
   * `start()`. Without it the application has no adapters.
   */
  readonly adapters?: (foundation: {
    readonly config: AppConfig;
  }) => AdapterManagerOptions<BaseClasses>;
  /** What runs in each step of `start()`. Without it, `start()` only builds the foundation. */
  readonly steps?: Steps<Run<AppConfig, Options, State>>;
}

export interface Application<
  AppConfig extends Config,
  Options = void,
  State = object,
  BaseClasses extends BaseClassMap = BaseClassMap,
> {
  readonly name: string;
  /**
   * The instances every part of the application is handed. Each is built the
   * first time it is read and kept for the life of the process.
   */
  readonly foundation: Foundation<AppConfig>;
  /**
   * The adapter manager, built the first time it is read and kept for the
   * life of the process. It is not part of the foundation and is not handed
   * out: the framework runs it. It is readable for the code that still looks
   * adapters up by importing a manager.
   */
  readonly adapters: AdapterManager<BaseClasses>;
  /**
   * What has been built from service definitions for this application. A
   * service is built the first time it is asked for here, once `start()` has
   * reached the services step, and forgotten by `stop()`.
   */
  readonly services: Services;
  /** Builds every foundation instance now, in order. Boot calls this first. */
  startFoundation(): Foundation<AppConfig>;
  /** Which foundation instances have been built so far, in the order they were. */
  built(): readonly string[];
  /** What the definition put in each step, for reading. Nothing is loaded by reading it. */
  readonly steps: Steps<Run<AppConfig, Options, State>>;
  /**
   * Runs the start sequence: foundation, database, adapter validation,
   * shared, services, jobs, ready, then the background work without waiting
   * for it. Rejects with the
   * error of the first step that fails; later steps do not run.
   *
   * It may be called again. A start that follows one nobody stopped stops it
   * first. The foundation is built once.
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

function isStartable(root: Startable | ServiceDefinition<any, any>): root is Startable {
  return typeof (root as Startable).init === 'function';
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
export function createApplication<
  AppConfig extends Config,
  Options = void,
  State = object,
  BaseClasses extends BaseClassMap = BaseClassMap,
>(
  definition: ApplicationDefinition<AppConfig, Options, State, BaseClasses>,
): Application<AppConfig, Options, State, BaseClasses> {
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
  const clock = tracked<Clock>('clock', createClock);

  // Not a foundation instance, so not in `built()`.
  const adapters = once(() => {
    if (!definition.adapters) {
      throw new IncorrectUsageError({
        message: `${definition.name} defines no adapters.`,
      });
    }
    return new AdapterManager(definition.adapters({ config: config() }));
  });

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
    get clock() {
      return clock();
    },
  };

  const services = createServices({ name: definition.name, foundation });

  function startFoundation() {
    config();
    logging();
    database();
    events();
    clock();
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

  async function runModules(
    step: ServicesStep<StartRun> | undefined,
    run: StartRun,
    { give = false } = {},
  ) {
    if (!give) {
      // What services read is ready: the foundation, the database and the
      // shared modules. Closing is the last thing `stop()` does for this step.
      stoppable.push({ name: 'services', stop: () => services.close() });
      services.open();
      for (const declared of step?.declared ?? []) {
        services.register(declared.load());
      }
    }
    await runSlots(step?.before, run);
    const started = new Map<string, Startable>();
    for (const entry of step?.modules ?? []) {
      if (!('load' in entry)) {
        await runSlots([entry], run);
        continue;
      }
      if (entry.when?.(run) === false) {
        continue;
      }
      const root = entry.load();
      if (!isStartable(root)) {
        // A definition: built here, started if it has a `start`, and stopped
        // with every other service when the application's services close.
        services.register(root);
        await services.start(root);
        continue;
      }
      stoppable.push({ name: entry.name, stop: () => root.stop?.() });
      if (!give) {
        await root.init();
        continue;
      }
      const given: Record<string, unknown> = { foundation };
      for (const name of entry.needs ?? []) {
        const needed = started.get(name);
        if (!needed) {
          throw new IncorrectUsageError({
            message: `${entry.name} needs ${name}, which no earlier entry in the same list started.`,
          });
        }
        given[name] = needed.service;
      }
      await root.init(given);
      started.set(entry.name, root);
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

  async function stopStarted() {
    const stopping = stoppable.reverse();
    stoppable = [];
    for (const { stop } of stopping) {
      try {
        await stop();
      } catch (error) {
        logging().error(error);
      }
    }
  }

  return {
    name: definition.name,
    foundation,
    get adapters() {
      return adapters();
    },
    services,
    startFoundation,
    built: () => [...order],
    steps: definition.steps ?? {},
    async start(options, state = {} as State) {
      const steps = definition.steps ?? {};
      // A start that follows one nobody stopped (a process that starts the
      // application again, as tests do) stops it first, so that each module's
      // `start` hook runs for this start too.
      await stopStarted();
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
      // A misconfigured adapter fails the start here, not on its first use.
      if (definition.adapters) {
        adapters().init();
      }
      await runModules(steps.shared, run, { give: true });
      await runModules(steps.services, run);
      await runStep(steps.jobs, run);
      await runStep(steps.ready, run);

      // Not awaited. The first entry begins before start() returns.
      finishBackground(runBackground(steps.background ?? [], run));

      return run;
    },
    stop: stopStarted,
  };
}
