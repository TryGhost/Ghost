import { ThreadMessagePort } from '@quilted/threads';
import {
  ARGUMENT_MESSAGES,
  encodeBridgeError,
  type AppErrorCode,
  isContainedPath,
  isRecord,
  isStartContext,
  isTheme,
  normaliseAppPath,
  type AppExports,
  type HostExports,
  type PathChangeOptions,
  type Place,
  type Theme,
} from '@tryghost/app-contracts';

import {
  GhostAppError,
  fromHostError,
  invalidArgument,
  invalidPath,
  sessionEnded,
  unsupported,
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

/**
 * A refusal of one of Admin's calls. Only its message reaches Admin, so it leads with the
 * code, as Admin's own refusals do.
 */
function refusal(code: AppErrorCode, detail: string): Error {
  return new Error(encodeBridgeError(code, detail));
}

function subscribe<T>(listeners: Set<T>, listener: T): Unsubscribe {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What `start` keeps of Admin's context. The theme and path change, so they are kept apart. */
interface StartedContext {
  site: Site;
  user: User;
  session: Session;
}

export interface ChannelEvents {
  /** Admin started the app: the connection is ready for it. */
  started(ghost: Ghost): void;
  /** The channel ended, before or after the start. */
  ended(error: GhostAppError): void;
}

/**
 * The channel to Admin over the port it handed the page, and the `Ghost` object the app
 * holds once Admin has called `start`. The channel itself stays inside the SDK.
 *
 * The channel ends when the port closes, which browsers that fire `close` on a port (and
 * Node) report when Admin closes its end or its document goes away; when a call fails
 * because the thread has closed; or when Admin rejects a call with `session_ended`. From
 * then on every call rejects with the one same error.
 */
export class Channel {
  readonly #port: MessagePort;
  readonly #thread: ThreadMessagePort<HostExports, AppExports>;
  // What this Admin exports, from its connect message.
  readonly #hostExports: ReadonlySet<string>;
  readonly #events: ChannelEvents;
  readonly #themeListeners = new Set<(theme: Readonly<Theme>) => void>();
  readonly #pathListeners = new Set<(path: string) => void>();
  readonly #endListeners = new Set<(error: GhostAppError) => void>();
  #context: StartedContext | undefined;
  #theme: Readonly<Theme> | undefined;
  #path = '/';
  // Counts the paths Admin has sent, so a `path.set` answered after one keeps Admin's.
  #pathsFromAdmin = 0;
  #ended: GhostAppError | undefined;
  #stopWatchingTitle: (() => void) | undefined;

  constructor(port: MessagePort, hostExports: readonly string[], events: ChannelEvents) {
    this.#port = port;
    this.#hostExports = new Set(hostExports);
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
      const detail = "Ghost started the app with a context this SDK doesn't understand";
      // Ended after Admin has had its answer, so it hears why rather than waiting it out.
      setTimeout(() => this.end(new GhostAppError('invalid_context', detail)), 0);
      throw refusal('invalid_context', detail);
    }
    this.#context = {
      site: Object.freeze({ ...context.site }),
      user: Object.freeze({ ...context.user }),
      session: Object.freeze({ ...context.session }),
    };
    this.#theme = Object.freeze({ ...context.theme });
    this.#path = context.path;
    // Reported before `start` answers, so Admin has the title by the time it shows the page.
    // An older Ghost without titles keeps its own.
    if (this.#hostExports.has('titleChanged')) {
      this.#stopWatchingTitle = watchTitle((title) => {
        this.#call('titleChanged', title).catch(() => {
          // A title Admin refused leaves Admin's own.
        });
      });
    }
    this.#events.started(this.ghost);
  }

  #themeChanged(theme: unknown) {
    this.#assertStarted();
    if (!isTheme(theme)) {
      throw refusal('invalid_argument', "Ghost sent a theme this SDK doesn't understand");
    }
    this.#theme = Object.freeze({ ...theme });
    notify(this.#themeListeners, this.#theme);
  }

  #pathChanged(path: unknown) {
    this.#assertStarted();
    if (!isContainedPath(path)) {
      throw refusal('invalid_argument', "Ghost sent a path this SDK doesn't understand");
    }
    this.#pathsFromAdmin += 1;
    this.#path = path;
    notify(this.#pathListeners, path);
  }

  #assertStarted() {
    if (!this.#context) {
      throw refusal('invalid_context', 'Ghost has not started the app yet');
    }
  }

  async #call<K extends keyof HostExports>(
    name: K,
    ...args: Parameters<HostExports[K]>
  ): Promise<Awaited<ReturnType<HostExports[K]>>> {
    if (this.#ended) {
      throw this.#ended;
    }
    if (!this.#hostExports.has(name)) {
      throw unsupported(name);
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

  /**
   * The `Ghost` the app holds, handed out once `start` has set the context: only the members
   * the type declares, so nothing of the channel, such as `end`, is in the app's reach.
   */
  readonly ghost: Ghost = this.#createGhost();

  #createGhost(): Ghost {
    const context = () => this.#context as StartedContext;
    const theme = () => this.#theme as Readonly<Theme>;
    const connected = () => this.#ended === undefined;
    return Object.freeze({
      get site(): Site {
        return context().site;
      },
      get user(): User {
        return context().user;
      },
      get theme(): Readonly<Theme> {
        return theme();
      },
      get session(): Session {
        return context().session;
      },
      get connected(): boolean {
        return connected();
      },
      path: this.#createPath(),
      onThemeChange: (callback: (theme: Readonly<Theme>) => void): Unsubscribe =>
        subscribe(this.#themeListeners, callback),
      onPathChange: (callback: (path: string) => void): Unsubscribe =>
        subscribe(this.#pathListeners, callback),
      onSessionEnd: (callback: (error: GhostAppError) => void): Unsubscribe =>
        this.#onSessionEnd(callback),
      fetch: (path: string, init?: GhostFetchInit): Promise<Response> => this.#fetch(path, init),
      open: (place: Place): Promise<void> => this.#open(place),
    });
  }

  #createPath(): GhostPath {
    const current = () => this.#path;
    return Object.freeze({
      get current(): string {
        return current();
      },
      set: async (path: string, options?: PathChangeOptions): Promise<void> => {
        if (!isContainedPath(path)) {
          throw invalidPath(ARGUMENT_MESSAGES.appPath);
        }
        if (options !== undefined && !isRecord(options)) {
          throw invalidArgument(ARGUMENT_MESSAGES.pathChangeOptions);
        }
        const pathsFromAdmin = this.#pathsFromAdmin;
        await (options === undefined
          ? this.#call('pathChanged', path)
          : this.#call('pathChanged', path, options));
        // Admin may send where it is before answering, when it doesn't follow the app.
        if (this.#pathsFromAdmin === pathsFromAdmin) {
          // Kept as Admin keeps it, so it reads the same as the path Admin sends back after a
          // reload or a move of its own.
          this.#path = normaliseAppPath(path);
        }
      },
    });
  }

  #onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe {
    const ended = this.#ended;
    if (ended) {
      queueMicrotask(() => callback(ended));
      return () => {};
    }
    return subscribe(this.#endListeners, callback);
  }

  async #fetch(path: string, init?: GhostFetchInit): Promise<Response> {
    const request = toFetchRequest(path, init);
    return toResponse(await this.#call('fetch', request));
  }

  async #open(place: Place): Promise<void> {
    if (!isRecord(place)) {
      throw invalidArgument(ARGUMENT_MESSAGES.place);
    }
    await this.#call('open', place);
  }
}
