import type { EventName, Site } from './site.ts';

/** What a module does when something happens. It is handed the site, then the event's arguments. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Listener = (site: Site, ...args: any[]) => unknown;

/** Work a module does in the background. It is handed the site. */
export type Job = (site: Site) => unknown;

/** Names a file without loading it: `() => require('./file')`. The file's default export is used. */
export type Load<T> = () => { readonly default: T };

export interface ListenerEntry {
  readonly event: EventName;
  readonly load: Load<Listener>;
}

export interface JobEntry {
  readonly name: string;
  /** When the job recurs. A job without one runs only when something dispatches it. */
  readonly cron: string | undefined;
  readonly load: Load<Job>;
}

/**
 * Lists what the application must call in a module. Everything else in the
 * module is reached by importing it.
 *
 * A provider names files and loads none, so a module's code is first loaded
 * when something in it is needed.
 */
export interface Provider {
  readonly name: string;
  readonly listeners: readonly ListenerEntry[];
  readonly jobs: readonly JobEntry[];
}

/** Lists a listener: `on('post.published', () => require('./listeners/file'))`. */
export function on(event: EventName, load: Load<Listener>): ListenerEntry {
  return Object.freeze({ event, load });
}

export function defineProvider(provider: {
  readonly name: string;
  readonly listeners?: readonly ListenerEntry[];
  /** Jobs by name. */
  readonly jobs?: Readonly<Record<string, { readonly cron?: string; readonly handle: Load<Job> }>>;
}): Provider {
  return Object.freeze({
    name: provider.name,
    listeners: Object.freeze([...(provider.listeners ?? [])]),
    jobs: Object.freeze(
      Object.entries(provider.jobs ?? {}).map(([name, job]) =>
        Object.freeze({ name, cron: job.cron, load: job.handle }),
      ),
    ),
  });
}
