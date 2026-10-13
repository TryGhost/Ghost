/**
 * The page of an app built on the SDK, which acceptance specs frame in place of a real app
 * (see `appFramePage` in frames.ts). It is the real `@tryghost/app-sdk`, as an app uses it:
 * `connect()` as the page loads, then the `Ghost` it resolves with. The SDK reports the
 * page's `<title>` itself.
 *
 * Bundled with the SDK's source into one module by the `bundleFrameScript` command, as the
 * frame can load nothing from the test server.
 *
 * A spec drives it through `window.__app`, with `callAppFrame` from frames.ts. Every hook
 * waits for the app to have connected, and answers `{ value }` or `{ error }`: the SDK's
 * `GhostAppError` as `code: message`, so a refusal can be asserted as data.
 */
import { connect, type Ghost, GhostAppError } from '@tryghost/app-sdk';
import type {
  FetchRequest,
  FetchResponse,
  PathChangeOptions,
  Place,
  StartContext,
} from '@tryghost/app-contracts/bridge';

/** Read from `window.__appFlags`, which the page sets before this runs. */
export interface AppFrameFlags {
  /** Never connects, as a page without the SDK, or one that failed to load it. */
  silent?: boolean;
  /** Waits this long after loading before connecting, as a slow app does. */
  connectDelayMs?: number;
}

/** What Admin told the app, in order, after starting it. */
export type AppFrameReceived =
  | { call: 'themeChanged'; value: unknown }
  | { call: 'pathChanged'; value: unknown };

export type AppFrameResult<Value> = { value: Value } | { error: string };

export interface AppFrameState {
  /** What the app connected with, read from `Ghost` then: the page's start, not its now. */
  context: StartContext | undefined;
  /** The app's route now, `Ghost.path.current`. */
  path: string | undefined;
  received: AppFrameReceived[];
}

export interface AppFrameHooks {
  state(): AppFrameState;
  /** `Ghost.fetch`, answered with the `Response` read back into plain data. */
  fetch(request: FetchRequest): Promise<AppFrameResult<FetchResponse>>;
  /** Sets the page's own title, which the SDK reports to Admin. */
  setTitle(title: string): Promise<AppFrameResult<void>>;
  setPath(path: string, options?: PathChangeOptions): Promise<AppFrameResult<void>>;
  open(place: Place): Promise<AppFrameResult<void>>;
}

declare global {
  interface Window {
    __appFlags?: AppFrameFlags;
    __app?: AppFrameHooks;
  }
}

const flags = window.__appFlags ?? {};
const received: AppFrameReceived[] = [];
let context: StartContext | undefined;
let ghost: Ghost | undefined;
let markConnected: (connecting: Promise<Ghost>) => void = () => {};
const connected = new Promise<Ghost>((resolve) => {
  markConnected = resolve;
});

const describeError = (error: unknown) => {
  if (error instanceof GhostAppError) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
};

async function settle<Value>(call: (app: Ghost) => Promise<Value>): Promise<AppFrameResult<Value>> {
  try {
    return { value: await call(await connected) };
  } catch (error) {
    return { error: describeError(error) };
  }
}

window.__app = {
  state: () => ({ context, path: ghost?.path.current, received }),
  fetch: ({ path, method, headers, body }) =>
    settle(async (app) => {
      const response = await app.fetch(path, { method, headers, body });
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        body: await response.text(),
      };
    }),
  setTitle: (title) =>
    settle(() => {
      document.title = title;
      return Promise.resolve();
    }),
  setPath: (path, options) => settle((app) => app.path.set(path, options)),
  open: (place) => settle((app) => app.open(place)),
};

async function start() {
  const app = await connect();
  context = {
    site: app.site,
    user: app.user,
    theme: app.theme,
    session: app.session,
    path: app.path.current,
  };
  app.onThemeChange((theme) => received.push({ call: 'themeChanged', value: theme }));
  app.onPathChange((path) => received.push({ call: 'pathChanged', value: path }));
  ghost = app;
  return app;
}

if (!flags.silent) {
  window.setTimeout(() => {
    const connecting = start();
    // Every hook reports a failed connection itself.
    connecting.catch(() => {});
    markConnected(connecting);
  }, flags.connectDelayMs ?? 0);
}
