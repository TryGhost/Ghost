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
import { BridgeError, parseFromFrame } from './bridge-error';
import type { AdminApiFetch } from './bridge-fetch';

/** What Admin does with what an app's page asks of it, once each request has been checked. */
export interface AppFrameHandlers {
  titleChanged(title: string): void;
  pathChanged(path: string, options: PathChangeOptions): void;
  open(place: Place): void;
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

const sessionEnded = () => new BridgeError('session_ended', 'The app’s session ended');

/**
 * Binds the bridge to an app's frame. The page speaks first: Admin waits for a hello sent
 * by that frame from the app's own origin, answers it alone with a `MessagePort`, and
 * starts the app over it. Anything else posted to Admin's window is ignored, as is a
 * second hello once connected.
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
  let thread: ThreadMessagePort<AppExports, HostExports> | undefined;
  let port: MessagePort | undefined;
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

  const onMessage = (event: MessageEvent) => {
    if (
      thread ||
      disposed ||
      !frame.contentWindow ||
      event.source !== frame.contentWindow ||
      event.origin !== surfaceOrigin ||
      !HelloMessageSchema.safeParse(event.data).success
    ) {
      return;
    }

    const channel = new MessageChannel();
    port = channel.port1;
    thread = new ThreadMessagePort<AppExports, HostExports>(port, { exports });
    // Listening with addEventListener leaves a port closed until it is started.
    port.start();
    const connect: ConnectMessage = { type: CONNECT_MESSAGE_TYPE };
    frame.contentWindow.postMessage(connect, surfaceOrigin, [channel.port2]);

    thread.imports.start(context()).then(
      () => {
        if (!disposed) {
          resolveReady();
        }
      },
      (error: unknown) => rejectReady(error),
    );
  };
  window.addEventListener('message', onMessage);

  // A change Admin couldn't tell the app about, say because its SDK predates the call,
  // leaves the app as it was: nothing for Admin to do about it.
  const tell = (call: () => Promise<void>) => {
    if (thread && !disposed) {
      call().catch(() => {});
    }
  };

  return {
    ready,
    get connected() {
      return thread !== undefined && !disposed;
    },
    themeChanged: (theme) => tell(() => thread!.imports.themeChanged(theme)),
    pathChanged: (path) => tell(() => thread!.imports.pathChanged(path)),
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      window.removeEventListener('message', onMessage);
      rejectReady(sessionEnded());
      // Refuses the calls still running, and aborts their requests.
      session.abort();
      // Stops listening, and rejects Admin's own calls still waiting on the app.
      thread?.close();
      // The refusals above are posted once their promises settle; the port stays open
      // until they have been.
      const closing = port;
      window.setTimeout(() => closing?.close(), 0);
    },
  };
}
