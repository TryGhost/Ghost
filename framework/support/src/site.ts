/**
 * One site and the base services for it.
 *
 * It is what every entry point is handed first: a listener, a controller, a job.
 * Code never imports a site. It is passed one, and passes it on.
 */
export interface Site {
  /** Identifies the site. It is public, so it can be sent to other systems. */
  readonly id: string;
  readonly config: Config;
  readonly log: Logger;
  readonly events: Events;
}

export interface Config {
  get(key: string): unknown;
}

export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** An event is named by a string, or by the class its instances are made from. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventName = string | (abstract new (...args: any[]) => object);

/** The part of an event bus that listeners are subscribed through. */
export interface Events {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: EventName, listener: (...args: any[]) => unknown): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener(event: EventName, listener: (...args: any[]) => unknown): unknown;
}

/** The part of a job runner that an application's jobs are registered with. */
export interface Jobs {
  /** Says what to run for a job. */
  handle(name: string, handler: () => unknown): void;
  /** Runs a job again and again, on a cron schedule. */
  scheduleRecurring(name: string, schedule: { readonly cron: string }): unknown;
}
