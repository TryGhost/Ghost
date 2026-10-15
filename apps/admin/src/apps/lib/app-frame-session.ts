import { type Place, type StartContext, type Theme } from '@tryghost/app-contracts/bridge';
import type { AdminApiFetch } from './bridge-fetch';
import { type AppFrameHost, bindAppFrame } from './bridge-host';
import { appFrameTimeouts } from './frame';

export type AppFrameStatus = 'loading' | 'ready' | 'failed';

export interface AppFrameState {
  /** `loading` until the app has started. Admin shows the frame from then on. */
  status: AppFrameStatus;
  /** The title the app's page set, once it has set one. */
  title?: string;
  /** Counts the loads of the app's page. Each load needs a new frame. */
  attempt: number;
  /** When this load started. Used to show how long the app has gone without responding. */
  startedAt: Date;
}

/**
 * Options for the navigation Admin makes to follow the app to one of the app's routes. Admin always
 * replaces its current history entry for it: the frame's own history already has an entry for the
 * move, and a second one would make back go between the two forever.
 */
export interface AppMoveOptions {
  /**
   * Identifies this navigation. The location Admin creates for it passes the number back to
   * `pathChanged`, so the session can tell Admin following the app apart from Admin navigating by
   * itself.
   */
  move: number;
}

export interface AppFrameSessionOptions {
  /** The origin of the app's page. Admin accepts a hello only from this origin. */
  surfaceOrigin: string;
  /**
   * Returns Admin's current context. Read when the page connects, so the app starts with the latest
   * values.
   */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  /**
   * Called when the app moves to one of its routes that Admin isn't on yet. Admin navigates there,
   * replacing its current history entry, and returns whether it did. It doesn't navigate while the
   * publisher is leaving the app.
   */
  navigate: (path: string, options: AppMoveOptions) => boolean;
  /**
   * Called when the app asks to open a place in Admin. The place is already validated as one Admin
   * offers. Admin navigates there and returns whether it did. It doesn't navigate while the
   * publisher is leaving the app.
   */
  open: (place: Place) => boolean;
}

export interface AppFrameSession {
  /** The same object until something changes, for `useSyncExternalStore`. */
  getState: () => AppFrameState;
  /** Calls `listener` whenever the state changes. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  /**
   * Binds the session to the frame for the current load, or releases the frame when given `null`.
   * It has the shape of a ref callback because that is how the frame is passed in. The timeout
   * starts when the frame mounts, and unmounting the frame stops everything it was running.
   */
  attach: (frame: HTMLIFrameElement | null) => void;
  /** Loads the app's page again, in a fresh frame, within the same session. */
  restart: () => void;
  /**
   * Called when Admin's location within the app changes. If Admin created the location to follow
   * the app, `move` is that navigation's number. Otherwise Admin navigated without one (back, forward
   * or a link), and the app is told to follow. Called for every location Admin commits, because one
   * render can merge several navigations and end at the same path as an earlier one.
   */
  pathChanged: (path: string, move?: number) => void;
  /** Called when Admin's theme changes. The session sends the new theme to the app. */
  themeChanged: (theme: Theme) => void;
  /** Ends the session. The session releases the frame and ignores anything else it sends. */
  dispose: () => void;
}

/**
 * How long a document must stay started to count as one the publisher used, rather than one that
 * was replaced as soon as it started (see `createAppFrameSession`).
 */
export const SHORT_LIVED_MS = 3_000;
/**
 * How many short-lived documents in a row a page may load before Admin treats the app as
 * unresponsive. High enough that a publisher clicking quickly through a few pages of a multi-page
 * app isn't stopped.
 */
export const MAX_SHORT_LIVED = 5;

// Numbers the navigations Admin makes to follow apps. Numbering starts at the time Admin loaded, so
// a history entry from before this load keeps its old number and never matches a newer navigation.
let lastMove = Date.now();

const sameTheme = (a: Theme | undefined, b: Theme) =>
  a?.mode === b.mode && a.accent_color === b.accent_color;

/**
 * Manages the lifecycle of an app's frame, separately from how the frame is rendered. Each load of
 * the app's page gets a new frame. `bindAppFrame` binds to it and reports when documents in it
 * change. The frame stays hidden until a document has started. The first document has
 * `appFrameTimeouts.ready` from the frame's mount to start, or the app has failed. A document that
 * replaces a started one gets the same time from when it arrives. If it doesn't start in time, the
 * session reloads the app's page in a new frame.
 *
 * A page that reloads or navigates away every time it starts would loop between the spinner and the
 * app, and never reach Try again. To prevent that, the session counts short-lived documents: each
 * started document that is replaced within `SHORT_LIVED_MS` of starting, and each reload of the
 * page that Admin makes without the publisher asking. A document that stays started longer resets
 * the count, as Try again does. After more than `MAX_SHORT_LIVED` in a row, the app has failed until
 * the publisher clicks Try again. A publisher moving between pages of a multi-page app trips it only
 * by leaving more than `MAX_SHORT_LIVED` pages in a row, each within `SHORT_LIVED_MS` of it
 * starting.
 *
 * Admin follows the app's moves by replacing its URL, never by adding to its history: the frame
 * keeps its own history, so each route the app pushes is already a step back takes, and back within
 * the app reaches the app as its own back, which it reports like any other move.
 *
 * Path and theme changes are passed between Admin and the app once each. The session never sends
 * the app a value it already has, whether the app sent it to Admin or Admin sent it to the app,
 * even while Admin is still catching up with routes the app has since left.
 */
export function createAppFrameSession(options: AppFrameSessionOptions): AppFrameSession {
  let state: AppFrameState = { status: 'loading', attempt: 0, startedAt: new Date() };
  const listeners = new Set<() => void>();
  let disposed = false;

  let frame: HTMLIFrameElement | null = null;
  let host: AppFrameHost | null = null;
  let timer: number | undefined;
  // How many short-lived documents in a row the page has loaded, and when the current document
  // started (undefined until it has).
  let shortLived = 0;
  let documentStartedAt: number | undefined;

  // Admin's path within the app, and the path and theme the app last sent or was sent.
  let adminPath: string | undefined;
  let appPath: string | undefined;
  let appTheme: Theme | undefined;
  // The navigations Admin started to follow the app but hasn't completed yet, in order. The app can
  // move again before Admin arrives, so Admin's reported path can be a route the app has already
  // left. A location created for one of these entries means Admin is catching up, not navigating by
  // itself.
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
    documentStartedAt = undefined;
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

  const started = () => {
    window.clearTimeout(timer);
    documentStartedAt = Date.now();
    update({ status: 'ready' });
  };

  /**
   * Called when the current document is being replaced, either by another document or by a fresh
   * load of the page (`reload`). Returns false if the page has loaded too many short-lived
   * documents, and true if it may continue.
   */
  const documentEnded = (reload: boolean): boolean => {
    const lived = documentStartedAt === undefined ? 0 : Date.now() - documentStartedAt;
    documentStartedAt = undefined;
    if (lived >= SHORT_LIVED_MS) {
      shortLived = 0;
    }
    if (reload || lived < SHORT_LIVED_MS) {
      shortLived += 1;
    }
    if (shortLived > MAX_SHORT_LIVED) {
      detach();
      update({ status: 'failed', title: undefined });
      return false;
    }
    return true;
  };

  /** Reloads the page because of something the page did, unless it keeps doing it. */
  const restartOnItsOwn = () => {
    if (!disposed && documentEnded(true)) {
      restart();
    }
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
        // A new page starts at Admin's current path. It doesn't know about routes Admin is still
        // navigating to.
        following = [];
        return context;
      },
      fetchAdminApi: options.fetchAdminApi,
      handlers: {
        titleChanged: (title) => update({ title }),
        pathChanged: (next) => {
          // Where Admin is going if it's still following the app, or where Admin is otherwise.
          if (next === (following.at(-1)?.path ?? adminPath)) {
            appPath = next;
            return appPath;
          }
          lastMove += 1;
          if (options.navigate(next, { move: lastMove })) {
            following.push({ path: next, move: lastMove });
            appPath = next;
          } else if (adminPath !== undefined) {
            // Admin stays where it is for now, and the app is sent Admin's path.
            appPath = adminPath;
            host?.pathChanged(adminPath);
          }
          // The app's path as Admin now has it, which the page stores as its current path.
          return appPath ?? next;
        },
        open: (place) => options.open(place),
        documentChanged: () => {
          if (host === bound && documentEnded(false)) {
            window.clearTimeout(timer);
            update({ status: 'loading', title: undefined, startedAt: new Date() });
            timer = window.setTimeout(restartOnItsOwn, appFrameTimeouts.ready);
          }
        },
        documentStarted: () => {
          if (host === bound) {
            started();
          }
        },
        // Starts a new frame at the page's own URL with Admin's route, the same way reloading Admin
        // would.
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
    // Cleared as soon as the app starts, so a started app is never marked unresponsive.
    timer = window.setTimeout(fail, appFrameTimeouts.ready);
    bound.ready.then(
      () => {
        if (host === bound) {
          started();
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
      // The publisher asked for this, so the count resets.
      shortLived = 0;
      restart();
    },
    pathChanged: (path, move) => {
      adminPath = path;
      const caughtUp = following.findIndex((entry) => entry.move === move);
      if (caughtUp !== -1) {
        // Admin caught up with the app, including any navigations a render merged into this one.
        // The app has already been to this path.
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
