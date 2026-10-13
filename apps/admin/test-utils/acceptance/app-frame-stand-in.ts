/**
 * A stand-in for an app's page built on the SDK, which acceptance specs frame in place of
 * a real app (see `appFramePage` in frames.ts). It speaks the bridge as the SDK does: it
 * says hello to `window.parent` until Admin connects, takes the port Admin hands it, and
 * waits for `start`. Like the SDK, it reports the page's `<title>` at start and whenever
 * it changes.
 *
 * Bundled with its dependencies into one module by the `bundleFrameScript` command, as
 * the frame can load nothing from the test server. It runs in the frame, so it imports
 * only types from the workspace.
 *
 * A spec drives it through `window.__app`, with `callAppFrame` from frames.ts. Every
 * hook waits for the app to have started, and answers `{ value }` or `{ error }` (the
 * error's message), so a refusal can be asserted as data.
 */
import { ThreadMessagePort } from '@quilted/threads';
import type {
  AppExports,
  FetchRequest,
  HostExports,
  PathChangeOptions,
  Place,
  StartContext,
} from '@tryghost/app-contracts/bridge';

/** Read from `window.__appFlags`, which the page sets before this runs. */
export interface AppFrameFlags {
  /** Never says hello, as a page without the SDK, or one that failed to load it. */
  silent?: boolean;
  /** Waits this long after loading before saying hello, as a slow app does. */
  connectDelayMs?: number;
}

/** What Admin told the app, in order, after starting it. */
export type AppFrameReceived =
  | { call: 'themeChanged'; value: unknown }
  | { call: 'pathChanged'; value: unknown };

export type AppFrameResult<Value> = { value: Value } | { error: string };

export interface AppFrameHooks {
  state(): { context: StartContext | undefined; received: AppFrameReceived[] };
  fetch(request: FetchRequest): Promise<AppFrameResult<unknown>>;
  /** Sets the page's own title, which the app reports to Admin. */
  setTitle(title: string): Promise<AppFrameResult<void>>;
  setPath(path: string, options?: PathChangeOptions): Promise<AppFrameResult<void>>;
  open(place: Place): Promise<AppFrameResult<void>>;
  /** Calls a host export with arguments as given, unchecked, as a misbehaving app would. */
  call(name: string, args: unknown[]): Promise<AppFrameResult<unknown>>;
}

declare global {
  interface Window {
    __appFlags?: AppFrameFlags;
    __app?: AppFrameHooks;
  }
}

const HELLO_INTERVAL_MS = 250;

const flags = window.__appFlags ?? {};
const received: AppFrameReceived[] = [];
let context: StartContext | undefined;
let host: HostExports | undefined;
let markStarted: () => void = () => {};
const started = new Promise<void>((resolve) => {
  markStarted = resolve;
});

async function settle<Value>(call: (host: HostExports) => Promise<Value>) {
  await started;
  try {
    return { value: await call(host!) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

let reportedTitle: string | undefined;
function reportTitle() {
  if (host && document.title !== reportedTitle) {
    reportedTitle = document.title;
    void host.titleChanged(document.title);
  }
}

window.__app = {
  state: () => ({ context, received }),
  fetch: (request) => settle((bridge) => bridge.fetch(request)),
  setTitle: (title) =>
    settle(() => {
      document.title = title;
      return Promise.resolve();
    }),
  setPath: (path, options) => settle((bridge) => bridge.pathChanged(path, options)),
  open: (place) => settle((bridge) => bridge.open(place)),
  call: (name, args) =>
    settle((bridge) =>
      (bridge as unknown as Record<string, (...rest: unknown[]) => Promise<unknown>>)[name](
        ...args,
      ),
    ),
};

function connect() {
  const hello = () =>
    // The hello carries nothing private, and the page can't know Admin's origin before
    // Admin answers, so it goes to whatever is framing the page.
    window.parent.postMessage({ type: 'ghost-app:hello', sdk: 'stand-in' }, '*');
  const timer = window.setInterval(hello, HELLO_INTERVAL_MS);
  hello();

  window.addEventListener('message', (event: MessageEvent<{ type?: unknown } | null>) => {
    const [port] = event.ports;
    if (host || event.source !== window.parent || event.data?.type !== 'ghost-app:connect') {
      return;
    }
    if (!port) {
      return;
    }
    window.clearInterval(timer);
    const exports: AppExports = {
      start(startContext) {
        context = startContext;
        markStarted();
        queueMicrotask(reportTitle);
        return Promise.resolve();
      },
      themeChanged(theme) {
        received.push({ call: 'themeChanged', value: theme });
        return Promise.resolve();
      },
      pathChanged(path) {
        received.push({ call: 'pathChanged', value: path });
        return Promise.resolve();
      },
    };
    const thread = new ThreadMessagePort<HostExports, AppExports>(port, { exports });
    port.start();
    host = thread.imports;
  });

  new MutationObserver(reportTitle).observe(document.head, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

if (!flags.silent) {
  window.setTimeout(connect, flags.connectDelayMs ?? 0);
}
