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

/** A channel Admin opened to the frame, in answer to one document's hello. */
interface Connection {
  thread: ThreadMessagePort<AppExports, HostExports>;
  port: MessagePort;
  /** Ends the calls from the page still running when the channel closes. */
  ended: AbortController;
  /** How many documents the frame had loaded when Admin answered. */
  loadsAtConnect: number;
  /** Whether the document has started. */
  started: boolean;
}

/**
 * Binds the bridge to an app's frame. The page speaks first: Admin waits for a hello sent
 * by that frame from the app's own origin, answers it alone with a `MessagePort`, and
 * starts the app over it. Anything else posted to Admin's window is ignored.
 *
 * A frame shows one document at a time, and each hello names its document. The SDK says
 * hello until it hears back, so a hello from a document Admin has answered is a repeat, and
 * ignored. One from any other document is the frame's current document, which took the
 * last one's place after a reload, a form post or a link: Admin closes the last document's
 * channel and answers the new one, whether the last had started or not. The first document
 * to start resolves `ready`. A document that replaces a started one is started in place,
 * without loading the app's page again, so a form post or a link in a server-rendered page
 * keeps its result: `handlers.documentChanged` hears that it's starting, and
 * `handlers.documentStarted` that it has.
 *
 * A new document that never says hello shows itself only by the frame's `load`. Admin
 * never waits on a load to answer a hello, so a started document's own load can come
 * before or after Admin answered it. Once it has started, a second load since Admin
 * answered is a new document; a first is assumed to be its own. So an app that connects
 * once loaded and then navigates to an origin that never says hello goes unnoticed.
 * Assuming otherwise would hold up, then restart, an app whose page is reached by a
 * redirect in script.
 *
 * Some documents can't be started in place, and `handlers.reloaded` hears of them, so the
 * app's page is loaded afresh: one on Admin's own origin, which Admin can read and the
 * app's never is, and one that refuses to start. How long a document gets to start, and
 * how many short-lived ones a page may bring, is `createAppFrameSession`'s to decide.
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
  let loads = 0;
  // The documents Admin has answered a hello from, by the ID each says hello with.
  const answered = new Set<string>();
  // The channel to the frame's current document.
  let current: Connection | undefined;

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

  /** The current document gave way to another: its channel closes. */
  const documentChanged = () => {
    const previous = current;
    if (!previous) {
      return;
    }
    close(previous);
    current = undefined;
    if (previous.started) {
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
    if (!hello.success || answered.has(hello.data.document)) {
      return;
    }
    answered.add(hello.data.document);
    documentChanged();
    // Hearing of it may have ended the session.
    if (disposed) {
      return;
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
      started: false,
    };
    current = connection;
    // Listening with addEventListener leaves a port closed until it is started.
    connection.port.start();
    const connect: ConnectMessage = { type: CONNECT_MESSAGE_TYPE };
    frame.contentWindow.postMessage(connect, surfaceOrigin, [channel.port2]);

    connection.thread.imports.start(context()).then(
      () => {
        if (disposed || reloaded || connection !== current) {
          return;
        }
        connection.started = true;
        if (hasStarted) {
          handlers.documentStarted();
        } else {
          hasStarted = true;
          resolveReady();
        }
      },
      (error: unknown) => {
        // Closing the channel of a document that gave way rejects its start too.
        if (disposed || reloaded || connection !== current) {
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
    if (disposed || reloaded || !hasStarted) {
      return;
    }
    if (frame.contentDocument) {
      left();
    } else if (current?.started && loads - current.loadsAtConnect > 1) {
      documentChanged();
    }
  };
  frame.addEventListener('load', onLoad);

  // A change the app couldn't hear, say because its SDK predates the call, leaves it as it
  // was.
  const tell = (call: (app: Connection['thread']['imports']) => Promise<void>) => {
    if (!disposed && current) {
      call(current.thread.imports).catch(() => {});
    }
  };

  return {
    ready,
    get connected() {
      return current !== undefined && !disposed;
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
      if (current) {
        close(current);
      }
    },
  };
}
