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
 *
 * It routes as an app does, with the History API and links, which the SDK hands to Admin's history.
 * As a single-page app, it follows a move Admin makes from the `popstate` the SDK dispatches; with
 * the `multiPage` flag, it loads the new address instead, as a page with no router does.
 */
import type * as AppSdk from '@tryghost/app-sdk';
import type { Ghost } from '@tryghost/app-sdk';
import type {
  FetchRequest,
  FetchResponse,
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
  /** Loads the address Admin moves it to, as a page with no router of its own does. */
  multiPage?: boolean;
}

/** What Admin sent the app after starting it, in order. */
export type AppFrameReceived =
  | { call: 'themeChanged'; value: unknown }
  | { call: 'pathChanged'; value: unknown };

/** The safe area the SDK set on the page's root, in pixels, by edge. */
export type AppFrameSafeArea = Record<'top' | 'right' | 'bottom' | 'left', string>;

export type AppFrameResult<Value> = { value: Value } | { error: string };

export interface AppFrameState {
  /**
   * The context the app connected with, read from `Ghost` at connect time, not its current values.
   * The layout is CSS variables instead, which `safeArea` reads.
   */
  context: Omit<StartContext, 'layout'> | undefined;
  /** The safe area's current CSS variables. */
  safeArea: AppFrameSafeArea;
  /** The app's current route, `Ghost.path.current`. */
  path: string | undefined;
  /** The document's own URL on the app's origin: its path and query. */
  address: string;
  /** The current theme, `Ghost.theme`. */
  theme: Theme | undefined;
  received: AppFrameReceived[];
  /** The dialog `openDialogLater` opened: whether there was activation, and what took focus. */
  laterDialog?: { activation: boolean; focused?: string };
}

export interface AppFrameHooks {
  state(): AppFrameState;
  /** `navigator.canShare` for a link, which is false where the frame's policy refuses Web Share. */
  canShare(): boolean;
  /** `Ghost.fetch`, returning the `Response` converted back into plain data. */
  fetch(request: FetchRequest): Promise<AppFrameResult<FetchResponse>>;
  /** Sets the page's own title, which the SDK reports to Admin. */
  setTitle(title: string): Promise<AppFrameResult<void>>;
  /** Routes to `path` with `history.pushState`, as a router does. */
  navigate(path: string): Promise<AppFrameResult<void>>;
  /** Routes to `path` with `history.replaceState`, as a router's redirect does. */
  redirect(path: string): Promise<AppFrameResult<void>>;
  /** Clicks a link to `href`, which the SDK turns into a move before the page loads it. */
  followLink(href: string): Promise<AppFrameResult<void>>;
  open(place: Place): Promise<AppFrameResult<void>>;
  /** Opens nested dialogs in the app's overlay, refused until the overlay has loaded. */
  openDialogs(dialogs: string[][]): Promise<AppFrameResult<void>>;
  /** Opens a dialog from a timer rather than a press, as after a slow fetch. */
  openDialogLater(labels: string[], delayMs: number): Promise<AppFrameResult<void>>;
  /** The text of what has focus in the app's overlay. */
  overlayFocus(): string | undefined;
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
let context: Omit<StartContext, 'layout'> | undefined;

const safeArea = (): AppFrameSafeArea => {
  const inset = (edge: string) =>
    document.documentElement.style.getPropertyValue(`--ghost-safe-area-inset-${edge}`);
  return { top: inset('top'), right: inset('right'), bottom: inset('bottom'), left: inset('left') };
};
let ghost: Ghost | undefined;
let overlayRoot: HTMLElement | undefined;
let laterDialog: AppFrameState['laterDialog'];
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

function openDialog(app: Ghost, labels: string[]): HTMLElement | undefined {
  const root = app.overlay.container();
  if (!root) {
    return undefined;
  }
  overlayRoot = root;
  const dialog = root.ownerDocument.createElement('div');
  dialog.setAttribute('role', 'dialog');
  for (const label of labels) {
    const button = root.ownerDocument.createElement('button');
    button.textContent = label;
    dialog.append(button);
  }
  root.append(dialog);
  const hold = app.overlay.hold('dialog', dialog);
  hold.setOpen(true);
  // On the document, where a real dialog's Escape handling listens.
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && root.lastElementChild === dialog) {
      root.ownerDocument.removeEventListener('keydown', closeOnEscape);
      hold.setOpen(false);
      dialog.remove();
      hold.release();
    }
  };
  root.ownerDocument.addEventListener('keydown', closeOnEscape);
  return dialog;
}

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
    safeArea: safeArea(),
    received,
    laterDialog,
  }),
  canShare: () => navigator.canShare({ url: location.href }),
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
  navigate: (path) =>
    settle(() => {
      history.pushState({ route: path }, '', path);
      return Promise.resolve();
    }),
  redirect: (path) =>
    settle(() => {
      history.replaceState({ route: path }, '', path);
      return Promise.resolve();
    }),
  followLink: (href) =>
    settle(() => {
      const link = document.createElement('a');
      link.href = href;
      document.body.append(link);
      link.click();
      return Promise.resolve();
    }),
  open: (place) => settle((app) => app.open(place)),
  openDialogs: (dialogs) =>
    settle((app) => {
      for (const labels of dialogs) {
        if (!openDialog(app, labels)) {
          return Promise.reject(new Error('No overlay to open dialogs in yet'));
        }
      }
      return Promise.resolve();
    }),
  openDialogLater: (labels, delayMs) =>
    settle((app) => {
      window.setTimeout(() => {
        const overlay = app.overlay.container()?.ownerDocument.defaultView;
        const state: NonNullable<AppFrameState['laterDialog']> = {
          activation:
            navigator.userActivation?.isActive === true ||
            overlay?.navigator.userActivation?.isActive === true,
        };
        const dialog = openDialog(app, labels);
        dialog?.addEventListener('focusin', (event) => {
          state.focused ??= (event.target as Element).textContent ?? undefined;
        });
        laterDialog = state;
      }, delayMs);
      return Promise.resolve();
    }),
  overlayFocus: () => overlayRoot?.ownerDocument.activeElement?.textContent ?? undefined,
};

async function start() {
  const { connect } = await sdk;
  const app = await connect();
  context = {
    site: app.site,
    user: app.user,
    theme: app.theme,
    session: app.session,
    scopes: [...app.scopes],
    path: app.path.current,
  };
  app.onThemeChange((theme) => received.push({ call: 'themeChanged', value: theme }));
  app.onPathChange((path) => {
    received.push({ call: 'pathChanged', value: path });
    if (flags.multiPage) {
      window.location.replace(path);
    }
  });
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
