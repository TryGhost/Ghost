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
   * The started page gave way to a new document in the same frame (a reload, a form post,
   * a link), and its channel closed. The app hasn't started until the new document has.
   */
  documentChanged(): void;
  /** The document that took the started one's place has started. */
  documentStarted(): void;
  /**
   * The frame holds a document Admin can't start in place (see `bindAppFrame`), so the page
   * needs loading afresh. Called once; the host is of no further use.
   */
  reloaded(): void;
}

export interface BindAppFrameOptions {
  frame: HTMLIFrameElement;
  /** The origin of the app's page, the only one a hello is accepted from. */
  surfaceOrigin: string;
  /** Read when a page connects, so the app starts with Admin as it is by then. */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  handlers: AppFrameHandlers;
}

export interface AppFrameHost {
  /** Resolves once the app has started; rejects if it fails to, or the host is disposed. */
  readonly ready: Promise<void>;
  /** Whether a page has been sent its context, so changes since are for it to hear. */
  readonly connected: boolean;
  themeChanged(theme: Theme): void;
  pathChanged(path: string): void;
  /** Ends the session: the channel closes and every further call from the page is refused. */
  dispose(): void;
}

/**
 * How many hellos Admin answers while the app has yet to start, or to start again in a new
 * document. A page that reloads more often than this while starting runs out of time.
 */
const MAX_CONNECTS = 10;

/** A channel Admin opened to the frame, in answer to one hello. */
interface Connection {
  thread: ThreadMessagePort<AppExports, HostExports>;
  port: MessagePort;
  /** Ends the calls from the page still running when the channel closes. */
  ended: AbortController;
  /** How many documents the frame had loaded when Admin answered. */
  loadsAtConnect: number;
}

/**
 * Binds the bridge to an app's frame. The page speaks first: Admin waits for a hello sent
 * by that frame from the app's own origin, answers it alone with a `MessagePort`, and
 * starts the app over it. Anything else posted to Admin's window is ignored.
 *
 * The SDK says hello until it hears back, so a hello may repeat one Admin already answered,
 * or come from a new document after a reload or navigation. Each hello names its document,
 * so Admin answers each document once. An older SDK that names no document leaves Admin to
 * guess: until the app has started, every hello gets a channel of its own, and the first
 * to start is the app's, as the page takes the first answer it hears.
 *
 * Once the app has started, a new document in the frame is started in place, without
 * loading the app's page again, so a form post or a link in a server-rendered page keeps
 * its result. A new document shows itself by a hello from a document Admin hasn't answered,
 * or by the frame loading a second document since Admin answered (the first may be the
 * started page's own load, which can finish after it started). A load Admin can't tell
 * apart from the started page's own is assumed to be it, so an app that connects once
 * loaded and then navigates to an origin other than Admin's goes unnoticed unless the page
 * there says hello. Assuming otherwise would hold up, then restart, an app whose page is
 * reached by a redirect in script.
 *
 * Some documents can't be started in place, and `handlers.reloaded` hears of them: one on
 * Admin's own origin, which Admin can read and the app's never is; a hello after start
 * from an SDK that names no document, which may be the started page's own; and a new
 * document that refuses to start.
 *
 * Every argument the page sends is checked against the bridge's schemas before Admin
 * acts on it: the frame is the app's, and Admin trusts nothing in it.
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
  // Whether a document has started, so whatever starts after is one taking its place.
  let hasStarted = false;
  let connects = 0;
  let loads = 0;
  // The documents Admin has answered a hello from, by the ID each says hello with.
  const answered = new Set<string>();
  // Every channel answering a hello, until one starts; then that one alone.
  const connections = new Set<Connection>();
  let started: Connection | undefined;

  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Whoever is waiting handles it; a host nobody waits on mustn't report it unhandled.
  ready.catch(() => {});

  /** What Admin offers one channel's page: each call is ended along with the channel. */
  const exportsFor = (ended: AbortSignal): HostExports => {
    const refused = new Promise<never>((_, reject) => {
      ended.addEventListener('abort', () => reject(sessionEnded()), { once: true });
    });
    refused.catch(() => {});

    /** Runs one call from the page, unless the session has ended or ends first. */
    const guarded =
      <Args extends unknown[], Result>(call: (...args: Args) => Promise<Result> | Result) =>
      (...args: Args): Promise<Result> => {
        if (ended.aborted) {
          return Promise.reject(sessionEnded());
        }
        return Promise.race([Promise.resolve().then(() => call(...args)), refused]);
      };

    // No prototype, so the page can't call `constructor` or `toString` by name.
    return Object.assign(Object.create(null) as object, {
      fetch: guarded((request: unknown) =>
        fetchAdminApi(
          parseFromFrame(FetchRequestSchema, request, (path) =>
            path[0] === 'path' ? 'invalid_path' : 'invalid_argument',
          ),
          ended,
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
  };

  const close = (connection: Connection) => {
    connections.delete(connection);
    // Refuses the page's calls still running, and aborts their requests.
    connection.ended.abort();
    // Stops listening, and rejects Admin's own calls still waiting on the page.
    connection.thread.close();
    // The refusals of the page's calls still running are posted once their promises
    // settle; the port stays open until they have been.
    window.setTimeout(() => connection.port.close(), 0);
  };

  /** The frame needs the app's page loaded afresh. */
  const left = () => {
    if (!reloaded) {
      reloaded = true;
      handlers.reloaded();
    }
  };

  /** The started document gave way to another, which is started in its place. */
  const documentChanged = () => {
    if (started) {
      close(started);
      started = undefined;
      connects = 0;
      handlers.documentChanged();
    }
  };

  const onMessage = (event: MessageEvent) => {
    if (
      disposed ||
      reloaded ||
      !frame.contentWindow ||
      event.source !== frame.contentWindow ||
      event.origin !== surfaceOrigin
    ) {
      return;
    }
    const hello = HelloMessageSchema.safeParse(event.data);
    if (!hello.success) {
      return;
    }
    const { document: documentId } = hello.data;
    if (documentId !== undefined && answered.has(documentId)) {
      // Repeated before Admin's answer reached the page.
      return;
    }
    if (started) {
      if (documentId === undefined) {
        // A new document or the started one's, which Admin can't tell apart: starting it
        // in place would leave a started page that said hello again without its channel.
        left();
        return;
      }
      documentChanged();
    }
    if (connects >= MAX_CONNECTS) {
      return;
    }
    connects += 1;
    if (documentId !== undefined) {
      answered.add(documentId);
    }

    const channel = new MessageChannel();
    const ended = new AbortController();
    const connection: Connection = {
      thread: new ThreadMessagePort<AppExports, HostExports>(channel.port1, {
        exports: exportsFor(ended.signal),
      }),
      port: channel.port1,
      ended,
      loadsAtConnect: loads,
    };
    connections.add(connection);
    // Listening with addEventListener leaves a port closed until it is started.
    connection.port.start();
    const connect: ConnectMessage = { type: CONNECT_MESSAGE_TYPE };
    frame.contentWindow.postMessage(connect, surfaceOrigin, [channel.port2]);

    connection.thread.imports.start(context()).then(
      () => {
        if (disposed || reloaded || started || !connections.has(connection)) {
          return;
        }
        started = connection;
        for (const other of connections) {
          if (other !== connection) {
            close(other);
          }
        }
        if (hasStarted) {
          handlers.documentStarted();
        } else {
          hasStarted = true;
          resolveReady();
        }
      },
      (error: unknown) => {
        // A page that refuses to start has failed, unless another document already has.
        if (disposed || started) {
          return;
        }
        if (hasStarted) {
          left();
        } else {
          rejectReady(error);
        }
      },
    );
  };
  window.addEventListener('message', onMessage);

  const onLoad = () => {
    loads += 1;
    if (disposed || !hasStarted) {
      return;
    }
    if (frame.contentDocument) {
      left();
    } else if (started && loads - started.loadsAtConnect > 1) {
      documentChanged();
    }
  };
  frame.addEventListener('load', onLoad);

  // A change the app couldn't hear, say because its SDK predates the call, leaves it as it
  // was. Until the app has started, every channel that may be the app's hears it.
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
      for (const connection of connections) {
        close(connection);
      }
    },
  };
}
