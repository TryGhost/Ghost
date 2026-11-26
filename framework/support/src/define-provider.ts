import type { Site } from './site.ts';

/** What a module does when something happens. It is handed the site, then the event's arguments. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Listener = (site: Site, ...args: any[]) => unknown;

/** Names a file without loading it: `() => require('./file')`. The file's default export is used. */
export type Load<T> = () => { readonly default: T };

/**
 * Lists what the application must call in a module. Everything else in the
 * module is reached by importing it.
 *
 * A provider names files and loads none, so a module's code is first loaded
 * when something in it is needed.
 */
export interface Provider {
  readonly name: string;
  /** The listeners to call for each event name. */
  readonly listeners: Readonly<Record<string, readonly Load<Listener>[]>>;
}

export function defineProvider(provider: {
  readonly name: string;
  readonly listeners?: Readonly<Record<string, Load<Listener> | readonly Load<Listener>[]>>;
}): Provider {
  const listeners: Record<string, readonly Load<Listener>[]> = {};
  for (const [event, load] of Object.entries(provider.listeners ?? {})) {
    listeners[event] = Object.freeze(typeof load === 'function' ? [load] : [...load]);
  }
  return Object.freeze({ name: provider.name, listeners: Object.freeze(listeners) });
}
