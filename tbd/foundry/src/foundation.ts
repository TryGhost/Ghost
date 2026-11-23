import type {
  Clock,
  Config,
  Database,
  EventBus,
  Foundation,
  Logger,
} from '@tryghost/kernel/foundation';

/**
 * How an application's foundation is built: one function for each part, written by the
 * application. A part is handed the parts before it, so the logger can be built from config and
 * the database handle from both.
 */
export interface FoundationParts {
  readonly config: () => Config;
  readonly logger: (built: Pick<Foundation, 'config'>) => Logger;
  readonly database: (built: Pick<Foundation, 'config' | 'logger'>) => Database;
  readonly events: (built: Pick<Foundation, 'config' | 'logger'>) => EventBus;
  /** The system clock unless the application supplies another. */
  readonly clock?: () => Clock;
}

/**
 * Builds a foundation from the application's parts. Each part is built once, when it is first
 * read, so that nothing is built by declaring a foundation and a part nobody reads is never
 * built. A part that fails to build is tried again on the next read.
 */
export function createFoundation(parts: FoundationParts): Foundation {
  const built: Partial<Record<keyof Foundation, unknown>> = {};
  function once<Part extends keyof Foundation>(part: Part, build: () => Foundation[Part]) {
    return (): Foundation[Part] => {
      if (!(part in built)) {
        built[part] = build();
      }
      return built[part] as Foundation[Part];
    };
  }

  const foundation: Foundation = Object.freeze({
    get config() {
      return config();
    },
    get logger() {
      return logger();
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
  });
  const config = once('config', parts.config);
  const logger = once('logger', () => parts.logger(foundation));
  const database = once('database', () => parts.database(foundation));
  const events = once('events', () => parts.events(foundation));
  const clock = once('clock', parts.clock ?? (() => ({ now: () => Date.now() })));
  return foundation;
}
