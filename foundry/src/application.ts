import type { Config } from '@tryghost/kernel/config';
import type { Database } from '@tryghost/kernel/database';
import type { EventBus } from '@tryghost/kernel/events';
import type { Foundation } from '@tryghost/kernel/foundation';
import type { Logger } from '@tryghost/kernel/logging';
import type { DomainManifest } from '@tryghost/kernel/domains/discover';
import {
  createDomainLayer,
  type DomainLayer,
  type ScheduledJob,
} from '@tryghost/kernel/domains/domain-layer';
import { readDomains } from './domains';
import { createEventBus } from './events';

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
  readonly database?: (foundation: {
    readonly config: AppConfig;
    readonly logging: Logger;
  }) => Database | undefined;
  /** Builds the event bus. Defaults to the framework's own. */
  readonly events?: (foundation: { readonly logging: Logger }) => EventBus;
  readonly domains?: {
    /** The folder that holds one folder per domain. */
    readonly root: string;
    /** Runs a domain's job on its schedule. Without it, jobs are not scheduled. */
    readonly schedule?: (job: ScheduledJob, foundation: Foundation<AppConfig>) => void;
  };
}

export interface Application<AppConfig extends Config> {
  readonly name: string;
  /**
   * The instances every part of the application is handed. Each is built the
   * first time it is read and kept for the life of the process.
   */
  readonly foundation: Foundation<AppConfig>;
  /** What the domains folder contains. Read once; loads no domain code. */
  readonly manifest: DomainManifest;
  /** The domain layer: start(), ready(), stop(), routes(), fragments(). */
  readonly domains: DomainLayer;
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
 * of boot: the order instances are built in, building each once, what a domain
 * is handed, and starting the domains. It knows nothing about any one
 * application and keeps nothing outside the object it returns.
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
    definition.database?.({ config: config(), logging: logging() }),
  );
  const events = tracked(
    'events',
    () => definition.events?.({ logging: logging() }) ?? createEventBus({ logging: logging() }),
  );

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

  // Without a domains folder there is nothing to find, and nothing is read.
  const manifest = once<DomainManifest>(() =>
    definition.domains
      ? readDomains(definition.domains.root)
      : { root: '', domains: [], files: [], load: () => undefined },
  );
  const domains = once(() =>
    createDomainLayer({
      manifest: manifest(),
      foundation,
      subscribe: (event, handler) => events().subscribe(event, handler),
      schedule: (job) => definition.domains?.schedule?.(job, foundation),
      logging: { error: (...values) => logging().error(...values) },
    }),
  );

  return {
    name: definition.name,
    foundation,
    get manifest() {
      return manifest();
    },
    get domains() {
      return domains();
    },
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
