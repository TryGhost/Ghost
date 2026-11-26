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

/** The part of an event emitter that listeners are subscribed through. */
export interface Events {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
}
