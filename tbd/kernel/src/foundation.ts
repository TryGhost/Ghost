import type { Knex } from 'knex';

/**
 * What an application is built on. The foundry builds it from values the application supplies and
 * hands it to whatever the application builds. It is handed in, never imported.
 *
 * These are types only. Nothing here says how many of each exist in a process: an application
 * serving several sites would hold some of them once for each site.
 */
export interface Foundation {
  readonly config: Config;
  readonly logger: Logger;
  readonly database: Database;
  readonly events: EventBus;
  readonly clock: Clock;
}

/** Read-only configuration, by key. A key names a nested value with `:` between its parts. */
export interface Config {
  get(key: string): unknown;
}

/** The few logging calls framework code makes. An application's own logger can do more. */
export interface Logger {
  debug(...messages: unknown[]): void;
  info(...messages: unknown[]): void;
  warn(...messages: unknown[]): void;
  error(...messages: unknown[]): void;
}

/** The database handle. Building it opens no connection. */
export type Database = Knex;

/** What an event is listened for under: the class of a typed event, or any object with a name. */
export interface EventKey {
  readonly name: string;
}

/** Stops a listener from being called. Safe to call more than once. */
export type Unsubscribe = () => void;

export interface EventBus {
  /**
   * Calls `handler` with whatever is dispatched under `event`, until the returned function is
   * called. An error the handler throws or rejects with is reported, not rethrown to whoever
   * dispatched.
   */
  // `never` lets each handler name the arguments it expects.
  subscribe(event: EventKey, handler: (...payload: never[]) => unknown): Unsubscribe;
  /** Hands the event to every listener of its class. */
  dispatch(event: object): void;
}

/** The current time. Date arithmetic is pure and lives in `clock.ts`. */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}
