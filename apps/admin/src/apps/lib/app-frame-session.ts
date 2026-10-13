import type { PathChangeOptions, Place, StartContext, Theme } from '@tryghost/app-contracts/bridge';
import { normaliseAppPath } from './app-path';
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

export interface AppFrameSessionOptions {
  /** The origin of the app's page, the only one a hello is accepted from. */
  surfaceOrigin: string;
  /** Admin as it is now. Read when the page connects, so the app starts with it. */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  /** The app moved to another of its routes, which Admin isn't on yet: Admin follows. */
  navigate: (path: string, options: PathChangeOptions) => void;
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
  /** Admin moved within the app, by back, forward or a link: the app follows. */
  pathChanged: (path: string) => void;
  /** Admin's theme changed: the app is told. */
  themeChanged: (theme: Theme) => void;
  /** Ends the session: the frame is let go of, and nothing further is heard from it. */
  dispose: () => void;
}

const sameTheme = (a: Theme | undefined, b: Theme) =>
  a?.mode === b.mode && a.accent_color === b.accent_color;

/**
 * The lifecycle of an app's frame, apart from how it's shown. Each load of the app's page
 * gets a frame of its own, bound to Admin by the bridge, and a clock: a page that doesn't
 * start in time (`appFrameTimeouts.ready`) has failed, one that has started stays started.
 * A started page that says hello again has reloaded, and is loaded afresh. Path and theme
 * changes are passed on in both directions, each once: what the app was last told, or
 * told Admin, is never echoed back to it.
 */
export function createAppFrameSession(options: AppFrameSessionOptions): AppFrameSession {
  let state: AppFrameState = { status: 'loading', attempt: 0, startedAt: new Date() };
  const listeners = new Set<() => void>();
  let disposed = false;

  let frame: HTMLIFrameElement | null = null;
  let host: AppFrameHost | null = null;
  let timer: number | undefined;

  // Where Admin is within the app, and what the app last heard or said about where it is.
  let adminPath: string | undefined;
  let appPath: string | undefined;
  let appTheme: Theme | undefined;

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
        return context;
      },
      fetchAdminApi: options.fetchAdminApi,
      handlers: {
        titleChanged: (title) => update({ title }),
        pathChanged: (next, { replace }) => {
          const normalised = normaliseAppPath(next);
          appPath = normalised;
          if (normalised !== adminPath) {
            options.navigate(normalised, { replace });
          }
        },
        open: (place) => options.open(place),
        // The page reloaded, or followed a link of its own, and took its channel with it.
        // Its new document is started in a new frame, at the page's own address and with
        // Admin's route, as a reload of Admin would.
        reloaded: restart,
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
    restart,
    pathChanged: (path) => {
      adminPath = path;
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
