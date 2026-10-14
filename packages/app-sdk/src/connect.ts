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
 * The origin to address the hello to: the embedder's, where the browser exposes it
 * (`location.ancestorOrigins`, in Chromium and WebKit), and `'*'` elsewhere. The hello grants
 * nothing; the port travels the other way, addressed by Admin to this page's origin alone.
 * `document.referrer` is no use: once the page has navigated within itself, it names the
 * page's own origin.
 */
function parentOrigin(): string {
  const origin = window.location.ancestorOrigins?.[0];
  return origin && origin !== 'null' ? origin : '*';
}

let documentId: string | undefined;

/** The hello's `document` ID: made once and kept for the document's life, across `connect()`s. */
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
  // Waiting longer than Admin gives the page would wait on a frame Admin has given up on.
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
 * failure, the next call tries again. Once the session has ended, Admin replaces the page
 * rather than start it again; a call made anyway says hello afresh and never resolves with
 * the ended `Ghost`.
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
