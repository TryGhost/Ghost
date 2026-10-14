import {
  type PathChangeOptions,
  type Place,
  type StartContext,
  type Theme,
  normaliseAppPath,
} from '@tryghost/app-contracts/bridge';
import type { AdminApiFetch } from './bridge-fetch';
import { type AppFrameHost, bindAppFrame } from './bridge-host';
import { appFrameTimeouts } from './frame';

export type AppFrameStatus = 'loading' | 'ready' | 'failed';

export interface AppFrameState {
  /** Loading until the app has started, which is when its frame is shown. */
  status: AppFrameStatus;
  /** The page's own title, once it has given one. */
  title?: string;
  /** Which load of the page this is. Each load needs a frame of its own. */
  attempt: number;
  /** When this load began, to say how long the app has gone without answering. */
  startedAt: Date;
}

/** How Admin follows the app to one of its routes. */
export interface AppMoveOptions extends PathChangeOptions {
  /**
   * The move's number, which the location Admin makes for it carries back to `pathChanged`,
   * so the session can tell Admin arriving there from Admin moving on its own.
   */
  move: number;
}

export interface AppFrameSessionOptions {
  /** The origin of the app's page, the only one a hello is accepted from. */
  surfaceOrigin: string;
  /** Admin as it is now. Read when the page connects, so the app starts with it. */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  /**
   * The app moved to another of its routes, which Admin isn't on yet: Admin follows, and
   * says whether it did. It doesn't while the publisher is on their way out of the app.
   */
  navigate: (path: string, options: AppMoveOptions) => boolean;
  /** The app asked for a place in Admin, already checked to be one Admin offers. */
  open: (place: Place) => void;
}

export interface AppFrameSession {
  /** The same object until something changes, for `useSyncExternalStore`. */
  getState: () => AppFrameState;
  /** Calls `listener` whenever the state changes. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  /**
   * Binds the session to the frame of the current load, or lets go of it with `null`. Its
   * shape is a ref callback's, which is how the frame is given: the clock starts as the
   * frame mounts, and unmounting it ends what it was running.
   */
  attach: (frame: HTMLIFrameElement | null) => void;
  /** Loads the app's page again, in a fresh frame, within the same session. */
  restart: () => void;
  /**
   * Admin's location within the app changed. `move` is the number of the app's move the
   * location was made for, if it was; otherwise Admin moved on its own, by back, forward or
   * a link, and the app follows. Called for every location Admin commits, as a render can
   * fold several moves into one, ending where an earlier one did.
   */
  pathChanged: (path: string, move?: number) => void;
  /** Admin's theme changed: the app is told. */
  themeChanged: (theme: Theme) => void;
  /** Ends the session: the frame is let go of, and nothing further is heard from it. */
  dispose: () => void;
}

/**
 * How many times within `RESTART_WINDOW_MS` Admin loads an app's page afresh on its own
 * before it calls the app unresponsive instead. A page that leaves, or reloads itself, each
 * time it starts would otherwise loop between the spinner and the app, never getting to
 * Try again.
 */
const AUTOMATIC_RESTARTS = 3;
const RESTART_WINDOW_MS = 60_000;

// Numbers the moves Admin makes for apps, from when Admin loaded, so a history entry made
// before, which keeps the number it was made with, never matches a move made since.
let lastMove = Date.now();

const sameTheme = (a: Theme | undefined, b: Theme) =>
  a?.mode === b.mode && a.accent_color === b.accent_color;

/**
 * The lifecycle of an app's frame, apart from how it's shown. Each load of the app's page
 * gets a frame of its own, bound to Admin by the bridge, and a clock: a page that doesn't
 * start in time (`appFrameTimeouts.ready`) has failed, one that has started stays started.
 * A started page whose frame holds a new document, after a reload, a form post or a link,
 * is hidden again while the new document starts in place, in the same frame and with the
 * same time to do it; one that doesn't, or that Admin can't start in place (see
 * `bindAppFrame`), is loaded afresh in a new frame, up to `AUTOMATIC_RESTARTS` times a
 * minute; after that it has failed, until Try again. Path and theme changes are passed on
 * in both directions, each once: what the app was last told, or told Admin, is never
 * echoed back to it, even when Admin is still catching up with routes it has since left.
 */
export function createAppFrameSession(options: AppFrameSessionOptions): AppFrameSession {
  let state: AppFrameState = { status: 'loading', attempt: 0, startedAt: new Date() };
  const listeners = new Set<() => void>();
  let disposed = false;

  let frame: HTMLIFrameElement | null = null;
  let host: AppFrameHost | null = null;
  let timer: number | undefined;
  // When Admin loaded the page afresh on its own, within the last `RESTART_WINDOW_MS`.
  let restarts: number[] = [];

  // Where Admin is within the app, and what the app last heard or said about where it is.
  let adminPath: string | undefined;
  let appPath: string | undefined;
  let appTheme: Theme | undefined;
  // The moves Admin made to follow the app, in order, that it hasn't arrived at yet. The app
  // can move again before Admin has, so where Admin is, as it says, can be a route the app
  // has left: a location made for one of these is Admin catching up, not moving on its own.
  let following: { path: string; move: number }[] = [];

  const update = (next: Partial<AppFrameState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) {
      listener();
    }
  };

  const detach = () => {
    window.clearTimeout(timer);
    timer = undefined;
    host?.dispose();
    host = null;
    frame = null;
  };

  const restart = () => {
    if (disposed) {
      return;
    }
    detach();
    update({
      status: 'loading',
      title: undefined,
      attempt: state.attempt + 1,
      startedAt: new Date(),
    });
  };

  /** Loads the page afresh because of something it did, unless it keeps making Admin. */
  const restartOnItsOwn = () => {
    if (disposed) {
      return;
    }
    const now = Date.now();
    restarts = [...restarts.filter((at) => now - at < RESTART_WINDOW_MS), now];
    if (restarts.length > AUTOMATIC_RESTARTS) {
      detach();
      update({ status: 'failed', title: undefined });
      return;
    }
    restart();
  };

  const bind = (element: HTMLIFrameElement) => {
    frame = element;
    const bound = bindAppFrame({
      frame: element,
      surfaceOrigin: options.surfaceOrigin,
      context: () => {
        const context = options.context();
        adminPath = context.path;
        appPath = context.path;
        appTheme = context.theme;
        // A new page starts where Admin is; where Admin is still headed for an old one is
        // news to it.
        following = [];
        return context;
      },
      fetchAdminApi: options.fetchAdminApi,
      handlers: {
        titleChanged: (title) => update({ title }),
        pathChanged: (next, { replace }) => {
          const normalised = normaliseAppPath(next);
          // Where Admin is headed, if it's still following the app; where it is otherwise.
          if (normalised === (following.at(-1)?.path ?? adminPath)) {
            appPath = normalised;
            return;
          }
          lastMove += 1;
          if (options.navigate(normalised, { replace, move: lastMove })) {
            following.push({ path: normalised, move: lastMove });
            appPath = normalised;
          } else if (adminPath !== undefined) {
            // Admin stays where it is, for now, and the app hears where that is.
            appPath = adminPath;
            host?.pathChanged(adminPath);
          }
        },
        open: (place) => options.open(place),
        // The started page gave way to a new document, which is hidden until it has
        // started in its place, and has as long to as the first had.
        documentChanged: () => {
          if (host === bound) {
            window.clearTimeout(timer);
            update({ status: 'loading', title: undefined, startedAt: new Date() });
            timer = window.setTimeout(restartOnItsOwn, appFrameTimeouts.ready);
          }
        },
        documentStarted: () => {
          if (host === bound) {
            window.clearTimeout(timer);
            update({ status: 'ready' });
          }
        },
        // The frame holds a document Admin can't start in place. The page is started in a
        // new frame, at its own address and with Admin's route, as a reload of Admin would.
        reloaded: restartOnItsOwn,
      },
    });
    host = bound;

    const fail = () => {
      if (host === bound) {
        bound.dispose();
        update({ status: 'failed', title: undefined });
      }
    };
    // The clock runs from the frame's mount, and stops the moment the app has started, so
    // nothing can call a started app unresponsive.
    timer = window.setTimeout(fail, appFrameTimeouts.ready);
    bound.ready.then(
      () => {
        if (host === bound) {
          window.clearTimeout(timer);
          update({ status: 'ready' });
        }
      },
      () => {
        if (host === bound) {
          window.clearTimeout(timer);
          fail();
        }
      },
    );
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attach: (element) => {
      if (disposed || element === frame) {
        return;
      }
      detach();
      if (element && state.status === 'loading') {
        bind(element);
      }
    },
    restart: () => {
      // The publisher asked: the count starts over.
      restarts = [];
      restart();
    },
    pathChanged: (path, move) => {
      adminPath = path;
      const caughtUp = following.findIndex((entry) => entry.move === move);
      if (caughtUp !== -1) {
        // Admin arrived where the app went, or somewhere on its way there, past any moves
        // a render folded into this one: the app has been there already, and needn't hear
        // of it.
        following = following.slice(caughtUp + 1);
        return;
      }
      following = [];
      if (host?.connected && appPath !== path) {
        appPath = path;
        host.pathChanged(path);
      }
    },
    themeChanged: (theme) => {
      if (host?.connected && !sameTheme(appTheme, theme)) {
        appTheme = theme;
        host.themeChanged(theme);
      }
    },
    dispose: () => {
      detach();
      disposed = true;
      listeners.clear();
    },
  };
}
