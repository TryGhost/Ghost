import { ThreadMessagePort } from '@quilted/threads';
import {
  type AppExports,
  CONNECT_MESSAGE_TYPE,
  type ConnectMessage,
  FetchRequestSchema,
  HelloMessageSchema,
  type HostExports,
  type PathMove,
  PathMoveSchema,
  type Place,
  PlaceSchema,
  type StartContext,
  type Theme,
  AppPathSchema,
  TitleSchema,
} from '@tryghost/app-contracts/bridge';
import { BridgeError, parseFromFrame, sessionEnded } from './bridge-error';
import type { AdminApiFetch } from './bridge-fetch';

/** How Admin handles requests from an app's page, after validating each request. */
export interface AppFrameHandlers {
  titleChanged(title: string): void;
  /**
   * `path` is already normalised by `AppPathSchema`, the single form Admin stores app paths in.
   * `move` says whether Admin adds a history entry for it or replaces its current one. Returns
   * the app's path as Admin now has it: `path`, or Admin's own when it didn't follow.
   */
  pathChanged(path: string, move: PathMove): string;
  /** Takes the publisher to `place`, and returns whether Admin navigated there. */
  open(place: Place): boolean;
  /**
   * The started page was replaced by a new document in the same frame (after a reload, a form post
   * or a link), and its channel closed. The app isn't started again until the new document starts.
   */
  documentChanged(): void;
  /** The document that replaced the started one has started. */
  documentStarted(): void;
  /**
   * The frame holds a document Admin can't start in place (see `bindAppFrame`), so the page needs a
   * fresh load. Called once. The host can't be used after this.
   */
  reloaded(): void;
}

export interface BindAppFrameOptions {
  frame: HTMLIFrameElement;
  /** The origin of the app's page. Admin accepts a hello only from this origin. */
  surfaceOrigin: string;
  /** Read when a page connects, so the app starts with Admin's context at that moment. */
  context: () => StartContext;
  fetchAdminApi: AdminApiFetch;
  handlers: AppFrameHandlers;
}

export interface AppFrameHost {
  /** Resolves once the app has started; rejects if it fails to, or the host is disposed. */
  readonly ready: Promise<void>;
  /** Whether a page has been sent its context. Once it has, later changes are sent to it. */
  readonly connected: boolean;
  themeChanged(theme: Theme): void;
  pathChanged(path: string): void;
  /** Ends the session. The channel closes and Admin refuses every further call from the page. */
  dispose(): void;
}

/** A channel Admin opened to the frame in reply to one document's hello. */
interface Connection {
  thread: ThreadMessagePort<AppExports, HostExports>;
  port: MessagePort;
  /** Aborts the page's calls that are still running when the channel closes. */
  ended: AbortController;
  /** How many documents the frame had loaded when Admin replied to the hello. */
  loadsAtConnect: number;
  /** Whether the document has started. */
  started: boolean;
}

/**
 * Binds the bridge to an app's frame. The page sends the first message. Admin waits for a hello
 * from that frame and from the app's own origin, replies to that hello only with a `MessagePort`,
 * and starts the app over the port. Admin ignores anything else posted to its window.
 *
 * A frame shows one document at a time, and each hello includes its document's ID. The SDK repeats
 * its hello until Admin replies, so Admin ignores a hello from a document it has already replied
 * to. A hello from any other document comes from the frame's current document, which replaced the
 * previous one after a reload, a form post or a link. Admin closes the previous document's channel
 * and replies to the new one, whether or not the previous one had started. The first document to
 * start resolves `ready`. Admin starts a document that replaces a started one in place, without
 * reloading the app's page, so a form post or a link in a server-rendered page keeps its result.
 * Admin calls `handlers.documentChanged` when the replacement begins, and
 * `handlers.documentStarted` once it has started.
 *
 * A new document that never sends a hello is visible only through the frame's `load` event. Admin
 * never waits for a load before replying to a hello, so a started document's own load can fire
 * before or after Admin replied. Once the document has started, a second load since Admin replied
 * means a new document; the first is assumed to be the document's own. As a result, Admin doesn't
 * notice an app that connects once loaded and then navigates to an origin that never sends a hello.
 * The opposite assumption would delay, then restart, an app whose page is reached through a
 * redirect in script. The hello can't report whether the page had loaded either: neither the HTML
 * standard nor browsers guarantee the order in which the frame's `load` and the page's messages
 * reach Admin (whatwg/html#4730), so a load can still arrive after the page says it's done.
 *
 * Some documents can't be started in place, so Admin calls `handlers.reloaded` to load the app's
 * page again: a document on Admin's own origin (Admin can read it, which it never can on the app's
 * origin), and a document that refuses to start. `createAppFrameSession` decides how long a
 * document gets to start, and how many short-lived documents a page may load.
 *
 * Admin validates every argument the page sends against the bridge's schemas before acting on it.
 * The frame belongs to the app, and Admin trusts nothing in it.
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
  // Whether any document has started. Any document that starts after that replaces one.
  let hasStarted = false;
  let loads = 0;
  // The IDs of the documents whose hello Admin has replied to.
  const answered = new Set<string>();
  // The channel to the frame's current document.
  let current: Connection | undefined;

  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Callers waiting on `ready` handle its rejection. A host that no caller waits on mustn't report an
  // unhandled rejection.
  ready.catch(() => {});

  /** The calls Admin offers one channel's page. Each call is refused once the channel ends. */
  const exportsFor = (ended: AbortSignal): HostExports => {
    const refused = new Promise<never>((_, reject) => {
      ended.addEventListener('abort', () => reject(sessionEnded()), { once: true });
    });
    refused.catch(() => {});

    /**
     * Runs one call from the page, unless the session has already ended or ends before the call
     * finishes.
     */
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
      pathChanged: guarded((path: unknown, move: unknown) =>
        handlers.pathChanged(
          parseFromFrame(AppPathSchema, path, 'invalid_path'),
          parseFromFrame(PathMoveSchema, move),
        ),
      ),
      open: guarded((place: unknown) => {
        if (!handlers.open(parseFromFrame(PlaceSchema, place))) {
          throw new BridgeError('rejected', 'The publisher is on their way elsewhere in Admin');
        }
      }),
    });
  };

  const close = (connection: Connection) => {
    // Rejects the page's calls that are still running, and aborts their requests.
    connection.ended.abort();
    // Stops listening, and rejects Admin's calls that are still waiting on the page.
    connection.thread.close();
    // The rejections for the page's running calls are posted once their promises settle, so the
    // port stays open until then.
    window.setTimeout(() => connection.port.close(), 0);
  };

  /** The frame needs a fresh load of the app's page. */
  const left = () => {
    if (!reloaded) {
      reloaded = true;
      handlers.reloaded();
    }
  };

  /** The current document was replaced by another, so its channel closes. */
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
    // The `documentChanged` handler may have ended the session.
    if (disposed) {
      return;
    }

    const channel = new MessageChannel();
    const ended = new AbortController();
    const exports = exportsFor(ended.signal);
    const connection: Connection = {
      thread: new ThreadMessagePort<AppExports, HostExports>(channel.port1, { exports }),
      port: channel.port1,
      ended,
      loadsAtConnect: loads,
      started: false,
    };
    current = connection;
    // A port listened to with addEventListener receives nothing until it is started.
    connection.port.start();
    const connect: ConnectMessage = { type: CONNECT_MESSAGE_TYPE, exports: Object.keys(exports) };
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
        // Closing the channel of a replaced document also rejects its start.
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

  // If the app can't receive a change, for example because its SDK predates the call, the app stays
  // as it was.
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
