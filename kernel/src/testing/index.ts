import type { Config } from '../config';
import { parseConfigSlice } from '../config';
import type { Database } from '../database';
import type { EventBus } from '../events';
import type { Foundation } from '../foundation';
import type { Logger } from '../logging';

/**
 * Fakes of what the foundation hands out, for unit tests of code that is
 * handed it. Each is plain: no test library, nothing shared between calls,
 * nothing read from the process.
 *
 * @see [Testing](../README.md#testing)
 */

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerFake extends Logger {
  /** Every call, in order. */
  readonly entries: readonly { readonly level: Level; readonly args: readonly unknown[] }[];
  /** The first argument of each call at one level. */
  logged(level: Level): unknown[];
}

/** A logger that records what it is given and writes nothing. */
export function createLoggerFake(): LoggerFake {
  const entries: { level: Level; args: unknown[] }[] = [];
  const at =
    (level: Level) =>
    (...args: unknown[]) => {
      entries.push({ level, args });
    };
  const fake = {
    entries,
    logged: (level: Level) =>
      entries.filter((entry) => entry.level === level).map((entry) => entry.args[0]),
    trace: at('trace'),
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
    fatal: at('fatal'),
    // A bound logger records into the same entries.
    child: () => fake,
  };
  return fake as unknown as LoggerFake;
}

/** A config holding exactly the tree it is given. `slice` parses as the real one does. */
export function createConfigFake(tree: Record<string, unknown> = {}): Config {
  const config: Config = {
    get(key?: string): unknown {
      if (key === undefined) {
        return tree;
      }
      let node: unknown = tree;
      for (const segment of key.split(':')) {
        if (node === null || typeof node !== 'object' || !(segment in node)) {
          return undefined;
        }
        node = (node as Record<string, unknown>)[segment];
      }
      return node;
    },
    slice: (path, schema) => parseConfigSlice(config.get(path), path, schema),
  };
  return config;
}

export interface EventBusFake extends EventBus {
  /** Every event dispatched, in order. */
  readonly dispatched: readonly object[];
}

/** An event bus that records what is dispatched and delivers it to subscribers at once. */
export function createEventBusFake(): EventBusFake {
  const dispatched: object[] = [];
  const handlers = new Map<string, ((event: unknown) => unknown)[]>();
  return {
    dispatched,
    subscribe(event, handler) {
      handlers.set(event.name, [...(handlers.get(event.name) ?? []), handler]);
    },
    dispatch(event) {
      dispatched.push(event);
      for (const handler of handlers.get(event.constructor.name) ?? []) {
        void handler(event);
      }
    },
  };
}

export interface FoundationFake extends Foundation {
  readonly logging: LoggerFake;
  readonly events: EventBusFake;
}

/**
 * A foundation for a test: a recording logger and event bus, the config tree
 * given, and no database unless one is given.
 */
export function createFoundationFake(
  options: { config?: Record<string, unknown>; database?: Database } = {},
): FoundationFake {
  return {
    config: createConfigFake(options.config),
    logging: createLoggerFake(),
    database: options.database,
    events: createEventBusFake(),
  };
}
