import { ThreadMessagePort } from '@quilted/threads';
import {
  isContainedPath,
  isRecord,
  isStartContext,
  isTheme,
  type AppExports,
  type HostExports,
  type PathChangeOptions,
  type Place,
  type StartContext,
  type Theme,
} from '@tryghost/app-contracts';

import {
  GhostAppError,
  fromHostError,
  invalidArgument,
  invalidPath,
  sessionEnded,
} from './errors.ts';
import { toFetchRequest, toResponse } from './fetch.ts';
import { watchTitle } from './title.ts';
import type {
  Ghost,
  GhostFetchInit,
  GhostPath,
  Session,
  Site,
  Unsubscribe,
  User,
} from './types.ts';

type HostCall<K extends keyof HostExports> = (
  ...args: Parameters<HostExports[K]>
) => ReturnType<HostExports[K]>;

/** Calls a listener the app registered, so that one that throws cannot stop the others. */
function notify<T>(listeners: ReadonlySet<(value: T) => void>, value: T) {
  for (const listener of [...listeners]) {
    try {
      listener(value);
    } catch (error) {
      // Thrown again outside the SDK, where the page's own error handling sees it.
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

function subscribe<T>(listeners: Set<T>, listener: T): Unsubscribe {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface ChannelEvents {
  /** Admin started the app: the connection is ready for it. */
  started(ghost: Ghost): void;
  /** The channel ended, before or after the start. */
  ended(error: GhostAppError): void;
}

/**
 * The channel to Admin over the port it handed the page, and the `Ghost` object the app
 * holds once Admin has called `start`.
 *
 * The channel ends when the port closes, which browsers that fire `close` on a port (and
 * Node) report when Admin closes its end or its document goes away; when a call fails
 * because the thread has closed; or when Admin rejects a call with `session_ended`. From
 * then on every call rejects with the one same error.
 */
export class Channel implements Ghost {
  readonly #port: MessagePort;
  readonly #thread: ThreadMessagePort<HostExports, AppExports>;
  readonly #events: ChannelEvents;
  readonly #themeListeners = new Set<(theme: Theme) => void>();
  readonly #pathListeners = new Set<(path: string) => void>();
  readonly #endListeners = new Set<(error: GhostAppError) => void>();
  #context: StartContext | undefined;
  #theme: Theme | undefined;
  #path = '/';
  #ended: GhostAppError | undefined;
  #stopWatchingTitle: (() => void) | undefined;

  constructor(port: MessagePort, events: ChannelEvents) {
    this.#port = port;
    this.#events = events;
    this.#thread = new ThreadMessagePort<HostExports, AppExports>(port, {
      exports: {
        start: async (context) => this.#start(context),
        themeChanged: async (theme) => this.#themeChanged(theme),
        pathChanged: async (path) => this.#pathChanged(path),
      },
    });
    port.addEventListener('close', () => this.end(sessionEnded()));
    // A message that could not be read is a call that will never be answered.
    port.addEventListener('messageerror', () => this.end(sessionEnded()));
    port.start();
  }

  #start(context: unknown) {
    if (this.#context) {
      return;
    }
    if (!isStartContext(context)) {
      const error = new GhostAppError(
        'not_connected',
        "Ghost started the app with a context this SDK doesn't understand",
      );
      // Ended after Admin has had its answer, so it hears why rather than waiting it out.
      setTimeout(() => this.end(error), 0);
      throw error;
    }
    this.#context = context;
    this.#theme = Object.freeze({ ...context.theme });
    this.#path = context.path;
    // Reported before `start` answers, so Admin has the title by the time it shows the page.
    this.#stopWatchingTitle = watchTitle((title) => {
      this.#call('titleChanged', title).catch(() => {
        // An older Ghost without titles, or a title it refused, leaves Admin's own.
      });
    });
    this.#events.started(this);
  }

  #themeChanged(theme: unknown) {
    this.#assertStarted();
    if (!isTheme(theme)) {
      throw invalidArgument("Ghost sent a theme this SDK doesn't understand");
    }
    this.#theme = Object.freeze({ ...theme });
    notify(this.#themeListeners, this.#theme);
  }

  #pathChanged(path: unknown) {
    this.#assertStarted();
    if (!isContainedPath(path)) {
      throw invalidArgument("Ghost sent a path this SDK doesn't understand");
    }
    this.#path = path;
    notify(this.#pathListeners, path);
  }

  #assertStarted() {
    if (!this.#context) {
      throw new GhostAppError('not_connected', 'The app has not been started yet');
    }
  }

  async #call<K extends keyof HostExports>(
    name: K,
    ...args: Parameters<HostExports[K]>
  ): Promise<Awaited<ReturnType<HostExports[K]>>> {
    if (this.#ended) {
      throw this.#ended;
    }
    try {
      const call = this.#thread.imports[name] as HostCall<K>;
      return await call(...args);
    } catch (error) {
      if (this.#thread.closed) {
        throw this.end(sessionEnded());
      }
      const appError = fromHostError(error, name);
      if (appError.code === 'session_ended') {
        this.end(appError);
      }
      throw appError;
    }
  }

  /**
   * Ends the channel, once: pending and later calls reject with `error`. Returns the error
   * the channel ended with, which is the first one given.
   */
  end(error: GhostAppError): GhostAppError {
    if (this.#ended) {
      return this.#ended;
    }
    this.#ended = error;
    this.#stopWatchingTitle?.();
    this.#thread.close();
    this.#port.close();
    this.#events.ended(error);
    notify(this.#endListeners, error);
    this.#endListeners.clear();
    return error;
  }

  // The `Ghost` the app holds. Only handed out once `start` has set the context.

  get site(): Site {
    return (this.#context as StartContext).site;
  }

  get user(): User {
    return (this.#context as StartContext).user;
  }

  get theme(): Theme {
    return this.#theme as Theme;
  }

  get session(): Session {
    return (this.#context as StartContext).session;
  }

  get connected(): boolean {
    return this.#ended === undefined;
  }

  readonly path: GhostPath = this.#createPath();

  #createPath(): GhostPath {
    const current = () => this.#path;
    return Object.freeze({
      get current(): string {
        return current();
      },
      set: async (path: string, options?: PathChangeOptions): Promise<void> => {
        if (!isContainedPath(path)) {
          throw invalidPath('Expected a path within the app, starting with a single /');
        }
        if (options !== undefined && !isRecord(options)) {
          throw invalidArgument('Expected options such as { replace: true }');
        }
        await (options === undefined
          ? this.#call('pathChanged', path)
          : this.#call('pathChanged', path, options));
        this.#path = path;
      },
    });
  }

  onThemeChange(callback: (theme: Theme) => void): Unsubscribe {
    return subscribe(this.#themeListeners, callback);
  }

  onPathChange(callback: (path: string) => void): Unsubscribe {
    return subscribe(this.#pathListeners, callback);
  }

  onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe {
    const ended = this.#ended;
    if (ended) {
      queueMicrotask(() => callback(ended));
      return () => {};
    }
    return subscribe(this.#endListeners, callback);
  }

  async fetch(path: string, init?: GhostFetchInit): Promise<Response> {
    const request = toFetchRequest(path, init);
    return toResponse(await this.#call('fetch', request));
  }

  async open(place: Place): Promise<void> {
    if (!isRecord(place)) {
      throw invalidArgument('Expected a place such as { post: { id } }');
    }
    await this.#call('open', place);
  }
}
