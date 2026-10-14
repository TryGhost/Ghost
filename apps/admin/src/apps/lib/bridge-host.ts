import { ThreadMessagePort } from '@quilted/threads';
import {
  type AppExports,
  CONNECT_MESSAGE_TYPE,
  type ConnectMessage,
  FetchRequestSchema,
  HelloMessageSchema,
  type HostExports,
  type PathChangeOptions,
  PathChangeOptionsSchema,
  type Place,
  PlaceSchema,
  type StartContext,
  type Theme,
  AppPathSchema,
  TitleSchema,
} from '@tryghost/app-contracts/bridge';
import { parseFromFrame, sessionEnded } from './bridge-error';
import type { AdminApiFetch } from './bridge-fetch';

/** What Admin does with what an app's page asks of it, once each request has been checked. */
export interface AppFrameHandlers {
  titleChanged(title: string): void;
  pathChanged(path: string, options: PathChangeOptions): void;
  open(place: Place): void;
  /**
   * The started app's frame holds a new document: the page reloaded or navigated, within
   * the app or anywhere else, and its channel went with the old one. Called once; the host
   * itself is of no further use.
   */
  reloaded(): void;
}

export interface BindAppFrameOptions {
  frame: HTMLIFrameElement;
  /** The origin of the app's page, the only one a hello is accepted from. */
  surfaceOrigin: string;
  /** Read when the page connects, so the app starts with Admin as it is by then. */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  handlers: AppFrameHandlers;
}

export interface AppFrameHost {
  /** Resolves once the app has started; rejects if it fails to, or the host is disposed. */
  readonly ready: Promise<void>;
  /** Whether the app has been sent its context, so changes since are for it to hear. */
  readonly connected: boolean;
  themeChanged(theme: Theme): void;
  pathChanged(path: string): void;
  /** Ends the session: the channel closes and every further call from the page is refused. */
  dispose(): void;
}

/**
 * How many hellos Admin answers from a frame whose app has yet to start. Each may come from
 * a new document, so each is answered; a page that reloads more often than this while it
 * starts is left to run out of time.
 */
const MAX_CONNECTS = 10;

/** A channel Admin opened to the frame, in answer to one hello. */
interface Connection {
  thread: ThreadMessagePort<AppExports, HostExports>;
  port: MessagePort;
  /** How many documents the frame had loaded when Admin answered. */
  loadsAtConnect: number;
}

/**
 * Binds the bridge to an app's frame. The page speaks first: Admin waits for a hello sent
 * by that frame from the app's own origin, answers it alone with a `MessagePort`, and
 * starts the app over it. Anything else posted to Admin's window is ignored.
 *
 * Until the app has started, every hello is answered with a channel of its own, and the
 * first to start is the app's. The SDK says hello until it hears back, so a hello may be
 * one it sent before Admin's answer reached it, which it ignores; or it may come from a
 * new document, the page having reloaded or navigated while it started, which the old
 * channel went with. Telling them apart isn't needed: whichever starts is the page.
 *
 * Once the app has started, a new document in the frame ends it, as `handlers.reloaded`
 * hears. A hello says so. So does the frame loading a document on Admin's own origin, which
 * Admin can read and the app's never is. And so does the frame loading a second document
 * since Admin answered the page, on an origin that never says hello: the first may be the
 * started page's own, which can finish loading after it started. Where Admin can't tell a
 * load apart from the started page's own, it assumes it is: an app that connects once
 * loaded and then navigates to another origin, other than Admin's, isn't noticed unless
 * the page there says hello. Assuming otherwise would restart, forever, an app whose page
 * is reached by a redirect in script.
 *
 * Every argument the page sends is checked against the bridge's schemas before Admin
 * acts on it, since the frame is the app's and Admin trusts nothing in it.
 */
export function bindAppFrame({
  frame,
  surfaceOrigin,
  context,
  fetchAdminApi,
  handlers,
}: BindAppFrameOptions): AppFrameHost {
  let disposed = false;
  let reloaded = false;
  let connects = 0;
  let loads = 0;
  // Every channel answering a hello, until one starts; then that one alone.
  const connections = new Set<Connection>();
  let started: Connection | undefined;
  // Ends requests still in flight when the session does.
  const session = new AbortController();
  const ended = new Promise<never>((_, reject) => {
    session.signal.addEventListener('abort', () => reject(sessionEnded()), { once: true });
  });
  ended.catch(() => {});

  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Whoever is waiting handles it; a host nobody waits on mustn't report it unhandled.
  ready.catch(() => {});

  /** Runs one call from the page, unless the session has ended or ends first. */
  const guarded =
    <Args extends unknown[], Result>(call: (...args: Args) => Promise<Result> | Result) =>
    (...args: Args): Promise<Result> => {
      if (disposed) {
        return Promise.reject(sessionEnded());
      }
      return Promise.race([Promise.resolve().then(() => call(...args)), ended]);
    };

  // No prototype, so the page can't call `constructor` or `toString` by name.
  const exports: HostExports = Object.assign(Object.create(null) as object, {
    fetch: guarded((request: unknown) =>
      fetchAdminApi(
        parseFromFrame(FetchRequestSchema, request, (path) =>
          path[0] === 'path' ? 'invalid_path' : 'invalid_argument',
        ),
        session.signal,
      ),
    ),
    titleChanged: guarded((title: unknown) => {
      handlers.titleChanged(parseFromFrame(TitleSchema, title));
    }),
    pathChanged: guarded((path: unknown, options: unknown = {}) => {
      const appPath = parseFromFrame(AppPathSchema, path, 'invalid_path');
      handlers.pathChanged(appPath, parseFromFrame(PathChangeOptionsSchema, options));
    }),
    open: guarded((place: unknown) => {
      handlers.open(parseFromFrame(PlaceSchema, place));
    }),
  });

  const close = (connection: Connection) => {
    connections.delete(connection);
    // Stops listening, and rejects Admin's own calls still waiting on the page.
    connection.thread.close();
    // The refusals of the page's calls still running are posted once their promises
    // settle; the port stays open until they have been.
    window.setTimeout(() => connection.port.close(), 0);
  };

  /** The started app's document is gone, so is its channel: it starts again elsewhere. */
  const left = () => {
    if (!reloaded) {
      reloaded = true;
      handlers.reloaded();
    }
  };

  const onMessage = (event: MessageEvent) => {
    if (
      disposed ||
      !frame.contentWindow ||
      event.source !== frame.contentWindow ||
      event.origin !== surfaceOrigin ||
      !HelloMessageSchema.safeParse(event.data).success
    ) {
      return;
    }
    if (started) {
      // The SDK that started has stopped saying hello: this is a new document, whose SDK
      // would wait on it forever.
      left();
      return;
    }
    if (connects >= MAX_CONNECTS) {
      return;
    }
    connects += 1;

    const channel = new MessageChannel();
    const connection: Connection = {
      thread: new ThreadMessagePort<AppExports, HostExports>(channel.port1, { exports }),
      port: channel.port1,
      loadsAtConnect: loads,
    };
    connections.add(connection);
    // Listening with addEventListener leaves a port closed until it is started.
    connection.port.start();
    const connect: ConnectMessage = { type: CONNECT_MESSAGE_TYPE };
    frame.contentWindow.postMessage(connect, surfaceOrigin, [channel.port2]);

    connection.thread.imports.start(context()).then(
      () => {
        if (disposed || started) {
          return;
        }
        started = connection;
        for (const other of connections) {
          if (other !== connection) {
            close(other);
          }
        }
        resolveReady();
      },
      (error: unknown) => {
        // A page that refuses to start has failed, unless another document already has.
        if (!started) {
          rejectReady(error);
        }
      },
    );
  };
  window.addEventListener('message', onMessage);

  const onLoad = () => {
    loads += 1;
    if (started && (frame.contentDocument || loads - started.loadsAtConnect > 1)) {
      left();
    }
  };
  frame.addEventListener('load', onLoad);

  // A change Admin couldn't tell the app about, say because its SDK predates the call,
  // leaves the app as it was: nothing for Admin to do about it. Until the app has started,
  // every channel that may be the app's hears it.
  const tell = (call: (app: Connection['thread']['imports']) => Promise<void>) => {
    if (!disposed) {
      for (const { thread } of connections) {
        call(thread.imports).catch(() => {});
      }
    }
  };

  return {
    ready,
    get connected() {
      return connections.size > 0 && !disposed;
    },
    themeChanged: (theme) => tell((app) => app.themeChanged(theme)),
    pathChanged: (path) => tell((app) => app.pathChanged(path)),
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      window.removeEventListener('message', onMessage);
      frame.removeEventListener('load', onLoad);
      rejectReady(sessionEnded());
      // Refuses the calls still running, and aborts their requests.
      session.abort();
      for (const connection of connections) {
        close(connection);
      }
    },
  };
}
