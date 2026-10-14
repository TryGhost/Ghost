import {
  HELLO_MESSAGE_TYPE,
  START_TIMEOUT_MS,
  isConnectMessage,
  isRecord,
  type HelloMessage,
} from '@tryghost/app-contracts';

import { GhostAppError, invalidArgument } from './errors.ts';
import { Channel } from './session.ts';
import type { ConnectOptions, Ghost } from './types.ts';
import { SDK_VERSION } from './version.ts';

/**
 * How often the hello is said again until Admin answers. Admin may start listening only
 * after the page has loaded and said its first hello, so one is not enough.
 */
const HELLO_INTERVAL = 250;

/**
 * The origin to address the hello to. Where the browser tells a frame who embeds it
 * (`location.ancestorOrigins`, in Chromium and WebKit), only Admin can read the hello.
 * Elsewhere it goes to `'*'`: it carries nothing but the SDK's version, and what matters,
 * the port, travels the other way, addressed by Admin to this page's origin alone.
 * `document.referrer` is not used: once the page has navigated within itself, it names the
 * page's own origin, and a hello sent there would never arrive.
 */
function parentOrigin(): string {
  const origin = window.location.ancestorOrigins?.[0];
  return origin && origin !== 'null' ? origin : '*';
}

let documentId: string | undefined;

/**
 * A random ID for this document, said with every hello, so Admin can tell a hello repeated by
 * a document it has connected from one by a new document in the same frame. Made the first
 * time it is needed and kept for as long as the document is, across every `connect()`: a
 * reload, a form post or a link makes a new document, and with it a new ID.
 */
function documentIdentity(): string {
  documentId ??= Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return documentId;
}

/**
 * The longest wait `setTimeout` keeps: anything longer it clamps to nothing, and the timeout
 * would fire at once.
 */
const TIMEOUT_MAX = 2 ** 31 - 1;

function handshake(options: ConnectOptions, onEnded: () => void): Promise<Ghost> {
  if (!isRecord(options)) {
    return Promise.reject(invalidArgument('Expected options such as { timeout: 10000 }'));
  }
  // By default, as long as Admin gives the page: waiting longer would wait on a frame Admin
  // has given up on.
  const { timeout = START_TIMEOUT_MS } = options;
  if (typeof timeout !== 'number' || !(timeout > 0) || !(timeout <= TIMEOUT_MAX)) {
    return Promise.reject(
      invalidArgument(`Expected a timeout in milliseconds, above 0 and at most ${TIMEOUT_MAX}`),
    );
  }
  if (typeof window === 'undefined' || window.parent === window) {
    return Promise.reject(
      new GhostAppError('not_framed', 'This page is not open inside Ghost Admin'),
    );
  }

  const parent = window.parent;
  const targetOrigin = parentOrigin();

  return new Promise<Ghost>((resolve, reject) => {
    let settled = false;

    const stopWaiting = () => {
      clearInterval(helloTimer);
      clearTimeout(timeoutTimer);
      window.removeEventListener('message', onMessage);
    };

    const fail = (error: GhostAppError) => {
      stopWaiting();
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    // The channel is bound to whoever answers from the parent window, and only the first
    // answer counts: the listener goes as soon as one arrives.
    const onMessage = (event: MessageEvent) => {
      const port = event.ports?.[0];
      if (
        event.source !== parent ||
        !isConnectMessage(event.data) ||
        !port ||
        (targetOrigin !== '*' && event.origin !== targetOrigin)
      ) {
        return;
      }
      clearInterval(helloTimer);
      window.removeEventListener('message', onMessage);
      channel = new Channel(port, {
        started: (ghost) => {
          stopWaiting();
          settled = true;
          resolve(ghost);
        },
        ended: (error) => {
          fail(error);
          onEnded();
        },
      });
    };

    const hello: HelloMessage = {
      type: HELLO_MESSAGE_TYPE,
      sdk: SDK_VERSION,
      document: documentIdentity(),
    };
    const sayHello = () => {
      parent.postMessage(hello, targetOrigin);
    };

    let channel: Channel | undefined;
    window.addEventListener('message', onMessage);
    sayHello();
    const helloTimer = setInterval(sayHello, HELLO_INTERVAL);
    const timeoutTimer = setTimeout(() => {
      const error = new GhostAppError('not_connected', 'Ghost Admin did not start the app in time');
      fail(error);
      channel?.end(error);
    }, timeout);
  });
}

let connecting: Promise<Ghost> | undefined;

// Only the connection still shared is forgotten: one that ended may report it after a
// newer one has begun.
function forget(attempt: Promise<Ghost>) {
  if (connecting === attempt) {
    connecting = undefined;
  }
}

/**
 * Connects to Ghost Admin, which the page must be framed in, and resolves once Admin has
 * started the app. Safe to call as soon as the page loads.
 *
 * Every call shares the one connection; the options of the first call apply. After a
 * failure, the next call tries again. Once the session has ended there is nothing in this
 * page to reconnect: Admin replaces the page rather than start it again, and the new page
 * connects for itself. A call made anyway says hello afresh and never resolves with the
 * `Ghost` whose session is over.
 */
export function connect(options: ConnectOptions = {}): Promise<Ghost> {
  if (!connecting) {
    const attempt: Promise<Ghost> = handshake(options, () => forget(attempt)).catch(
      (error: unknown) => {
        forget(attempt);
        throw error;
      },
    );
    connecting = attempt;
  }
  return connecting;
}
