import { ThreadMessagePort } from '@quilted/threads';
import {
  ARGUMENT_MESSAGES,
  encodeBridgeError,
  type AppErrorCode,
  isContainedPath,
  isRecord,
  isStartContext,
  isTheme,
  type AppExports,
  type HostExports,
  type PathMove,
  type Place,
  type Theme,
} from '@tryghost/app-contracts';

import {
  GhostAppError,
  fromHostError,
  invalidArgument,
  sessionEnded,
  unsupported,
} from './errors.ts';
import { toFetchRequest, toResponse } from './fetch.ts';
import { currentRoute, watchHistory, type HistoryWatch } from './history.ts';
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

/** Calls each listener the app registered, so that one that throws can't stop the others. */
function notify<T>(listeners: ReadonlySet<(value: T) => void>, value: T) {
  for (const listener of [...listeners]) {
    try {
      listener(value);
    } catch (error) {
      // Rethrown outside the SDK, where the page's own error handling sees it.
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

/**
 * An error that refuses one of Admin's calls. Only its message reaches Admin, so the message
 * starts with the code, as Admin's own refusals do.
 */
function refusal(code: AppErrorCode, detail: string): Error {
  return new Error(encodeBridgeError(code, detail));
}

/**
 * Returns the copy of an argument that will cross the channel, or throws `invalid_argument`
 * with `message` if it can't cross. The structured clone that carries a call only refuses a
 * symbol or a DOM node once the call is in progress, and the channel would proxy a function,
 * though no argument in the bridge's calls is a function. Cloning first refuses all of these
 * before anything is sent to Admin.
 */
function cloneArgument<T>(value: T, message: string): T {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new GhostAppError('invalid_argument', message, { cause: error });
  }
}

function subscribe<T>(listeners: Set<T>, listener: T): Unsubscribe {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The parts of Admin's start context that `start` keeps. The theme and path can change, so
 * they are stored separately.
 */
interface StartedContext {
  site: Site;
  user: User;
  session: Session;
}

export interface ChannelEvents {
  /** Admin started the app, and the connection is ready for it to use. */
  started(ghost: Ghost): void;
  /** The channel ended, before or after the start. */
  ended(error: GhostAppError): void;
}

/**
 * The channel to Admin over the port Admin handed the page, and the `Ghost` object the app
 * gets once Admin has called `start`. The channel itself stays inside the SDK.
 *
 * The channel ends in three cases: when the port closes, which browsers that fire `close` on
 * a port (and Node) report when Admin closes its end or its document goes away; when a call
 * fails because the thread has closed; or when Admin rejects a call with `session_ended`.
 * After that, every call rejects with the same error.
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
  #ended: GhostAppError | undefined;
  #stopWatchingTitle: (() => void) | undefined;
  #history: HistoryWatch | undefined;
  // Counts the page's moves, so an answer to one the page has since moved on from is ignored.
  #moves = 0;

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
      // End the channel only after Admin has received the refusal, so Admin learns why instead
      // of waiting for its timeout.
      setTimeout(() => this.end(new GhostAppError('invalid_context', detail)), 0);
      throw refusal('invalid_context', detail);
    }
    this.#context = {
      site: Object.freeze({ ...context.site }),
      user: Object.freeze({ ...context.user }),
      session: Object.freeze({ ...context.session }),
    };
    this.#theme = Object.freeze({ ...context.theme });
    // Admin owns the history from here on. The page's own address is its route: Admin loads a
    // new frame at its own path, so the two differ only when the page's server redirected it or
    // a form or link loaded another page in place, and then Admin follows the page.
    this.#history = watchHistory((route, move) => this.#moved(route, move));
    this.#path = currentRoute();
    if (this.#path !== context.path) {
      void this.#moved(this.#path, 'replace');
    }
    // Report the title before `start` returns, so Admin has it by the time it shows the page.
    // An older Admin without `titleChanged` keeps its own title.
    if (this.#hostExports.has('titleChanged')) {
      this.#stopWatchingTitle = watchTitle((title) => {
        this.#call('titleChanged', title).catch(() => {
          // If Admin refuses a title, it keeps showing its own.
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
    this.#path = path;
    this.#history?.follow(path);
    notify(this.#pathListeners, path);
  }

  /**
   * Reports a move the page made. Resolves once Admin has answered, with the path Admin now has
   * for the app, or has refused; a refused move leaves the page where it is.
   */
  async #moved(route: string, move: PathMove): Promise<void> {
    this.#path = route;
    this.#moves += 1;
    const thisMove = this.#moves;
    try {
      const adminPath = await this.#call('pathChanged', route, move);
      // Admin's answer, rather than `route`: it's Admin's own path when Admin didn't follow
      // the move, such as when the publisher is leaving the app, and Admin then moves the page
      // back with `pathChanged`. An answer to an earlier move is out of date.
      if (thisMove === this.#moves && isContainedPath(adminPath)) {
        this.#path = adminPath;
      }
    } catch {
      // Refused, or the session ended: either way there's nothing for the page to do.
    }
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
   * Ends the channel. Only the first call has an effect: pending and later calls reject with
   * its `error`. Returns the error the channel ended with.
   */
  end(error: GhostAppError): GhostAppError {
    if (this.#ended) {
      return this.#ended;
    }
    this.#ended = error;
    this.#stopWatchingTitle?.();
    this.#history?.stop();
    this.#thread.close();
    this.#port.close();
    this.#events.ended(error);
    notify(this.#endListeners, error);
    this.#endListeners.clear();
    return error;
  }

  /**
   * The `Ghost` object the app gets once `start` has set the context. It has only the members
   * its type declares, so no part of the channel, such as `end`, is reachable from the app.
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
    });
  }

  #onSessionEnd(callback: (error: GhostAppError) => void): Unsubscribe {
    const ended = this.#ended;
    if (ended) {
      // Notify it in a microtask, as an earlier subscriber would be, unless it has
      // unsubscribed by then.
      let left = false;
      queueMicrotask(() => {
        if (!left) {
          callback(ended);
        }
      });
      return () => {
        left = true;
      };
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
    await this.#call('open', cloneArgument(place, ARGUMENT_MESSAGES.place));
  }
}
