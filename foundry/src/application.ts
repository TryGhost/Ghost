import type { Config } from '@tryghost/kernel/config';
import type { Database } from '@tryghost/kernel/database';
import type { EventBus } from '@tryghost/kernel/events';
import type { Foundation } from '@tryghost/kernel/foundation';
import type { Logger } from '@tryghost/kernel/logging';

/**
 * What an application supplies. Each function is called at most once per
 * process, the first time what it builds is needed, in this order: config,
 * logging, database, events.
 */
export interface ApplicationDefinition<AppConfig extends Config> {
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
}

export interface Application<AppConfig extends Config> {
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
export function createApplication<AppConfig extends Config>(
  definition: ApplicationDefinition<AppConfig>,
): Application<AppConfig> {
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

  return {
    name: definition.name,
    foundation,
    startFoundation() {
      config();
      logging();
      database();
      events();
      return foundation;
    },
    built: () => [...order],
  };
}
