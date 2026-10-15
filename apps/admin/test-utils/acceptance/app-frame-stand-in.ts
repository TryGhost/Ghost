/**
 * A fake app page built on the SDK, which acceptance specs frame in place of a real app (see
 * `appFramePage` in frames.ts). It uses the real `@tryghost/app-sdk` the way an app does: it calls
 * `connect()` as the page loads, then uses the `Ghost` object that resolves with. The SDK reports
 * the page's `<title>` itself.
 *
 * The SDK is the built bundle that apps load. The `bundleAppSdk` command builds it, and the page
 * holds it as text and loads it as a module. The `bundleFrameScript` command bundles this script
 * into one module, because the frame can't load anything from the test server.
 *
 * A spec drives the page through `window.__app`, using `callAppFrame` from frames.ts. Every hook
 * waits for the app to connect, then returns `{ value }` or `{ error }`. A `GhostAppError` from the
 * SDK becomes `code: message`, so specs can assert a refusal as data.
 */
import type * as AppSdk from '@tryghost/app-sdk';
import type { Ghost } from '@tryghost/app-sdk';
import type {
  FetchRequest,
  FetchResponse,
  PathChangeOptions,
  Place,
  StartContext,
  Theme,
} from '@tryghost/app-contracts/bridge';

/** Read from `window.__appFlags`, which the page sets before this runs. */
export interface AppFrameFlags {
  /** Never connects, like a page without the SDK, or one that failed to load it. */
  silent?: boolean;
  /** Waits this long after loading before connecting, like a slow app. */
  connectDelayMs?: number;
}

/** What Admin sent the app after starting it, in order. */
export type AppFrameReceived =
  | { call: 'themeChanged'; value: unknown }
  | { call: 'pathChanged'; value: unknown };

export type AppFrameResult<Value> = { value: Value } | { error: string };

export interface AppFrameState {
  /**
   * The context the app connected with, read from `Ghost` at connect time, not its current values.
   */
  context: StartContext | undefined;
  /** The app's current route, `Ghost.path.current`. */
  path: string | undefined;
  /** The document's own URL on the app's origin: its path and query. */
  address: string;
  /** The current theme, `Ghost.theme`. */
  theme: Theme | undefined;
  received: AppFrameReceived[];
}

export interface AppFrameHooks {
  state(): AppFrameState;
  /** `Ghost.fetch`, returning the `Response` converted back into plain data. */
  fetch(request: FetchRequest): Promise<AppFrameResult<FetchResponse>>;
  /** Sets the page's own title, which the SDK reports to Admin. */
  setTitle(title: string): Promise<AppFrameResult<void>>;
  setPath(path: string, options?: PathChangeOptions): Promise<AppFrameResult<void>>;
  /** Moves through `paths` at once, sending each `path.set` before the previous one resolves. */
  setPaths(paths: string[]): Promise<AppFrameResult<void>>;
  open(place: Place): Promise<AppFrameResult<void>>;
}

declare global {
  interface Window {
    __appFlags?: AppFrameFlags;
    /** The SDK's built bundle, as text. */
    __appSdkSource?: string;
    __app?: AppFrameHooks;
  }
}

const flags = window.__appFlags ?? {};
const sdk = import(
  /* @vite-ignore */ URL.createObjectURL(
    new Blob([window.__appSdkSource ?? ''], { type: 'text/javascript' }),
  )
) as Promise<typeof AppSdk>;
const received: AppFrameReceived[] = [];
let context: StartContext | undefined;
let ghost: Ghost | undefined;
let markConnected: (connecting: Promise<Ghost>) => void = () => {};
const connected = new Promise<Ghost>((resolve) => {
  markConnected = resolve;
});

const describeError = async (error: unknown) => {
  const { GhostAppError } = await sdk;
  if (error instanceof GhostAppError) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
};

async function settle<Value>(call: (app: Ghost) => Promise<Value>): Promise<AppFrameResult<Value>> {
  try {
    return { value: await call(await connected) };
  } catch (error) {
    return { error: await describeError(error) };
  }
}

window.__app = {
  state: () => ({
    context,
    path: ghost?.path.current,
    address: `${location.pathname}${location.search}`,
    theme: ghost?.theme,
    received,
  }),
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
  setPaths: (paths) =>
    settle(async (app) => {
      await Promise.all(paths.map((path) => app.path.set(path)));
    }),
  open: (place) => settle((app) => app.open(place)),
};

async function start() {
  const { connect } = await sdk;
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
