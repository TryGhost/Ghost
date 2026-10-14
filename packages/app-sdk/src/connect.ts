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

/**
 * The hello's `document` ID: when the page's document began, which a reload, a form post or a
 * link renews.
 */
function documentIdentity(): string {
  return String(performance.timeOrigin);
}

/**
 * Where the first copy of the SDK to connect claims the page. A symbol from the global
 * registry, so a second copy bundled into the same page finds the same key.
 */
const PAGE_CLAIM = Symbol.for('@tryghost/app-sdk');
const thisCopy = Object.freeze({ sdk: SDK_VERSION });

/** Claims the page for this copy of the SDK, unless another copy has; says whether it's ours. */
function claimPage(): boolean {
  const page = globalThis as unknown as Record<symbol, unknown>;
  page[PAGE_CLAIM] ??= thisCopy;
  return page[PAGE_CLAIM] === thisCopy;
}

/**
 * The longest wait `setTimeout` keeps: anything longer it clamps to nothing, and the timeout
 * would fire at once.
 */
const TIMEOUT_MAX = 2 ** 31 - 1;

function handshake(
  options: ConnectOptions,
  onEnded: (error: GhostAppError) => void,
): Promise<Ghost> {
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
      channel = new Channel(port, event.data.exports, {
        started: (ghost) => {
          stopWaiting();
          settled = true;
          resolve(ghost);
        },
        ended: (error) => {
          fail(error);
          onEnded(error);
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
// How the page's one connection ended, once Admin answered it: Admin answers a document once.
let spent: GhostAppError | undefined;

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
 * Every call shares the one connection; the options of the first call apply. Only one copy
 * of the SDK in a page can connect; another rejects with `duplicate_sdk`. Admin answers a
 * document once, so once it has, that connection is the page's only one: after it fails or
 * its session ends, every call rejects with the error it ended with, and only a new
 * document (a reload, say) connects again. A failure before Admin answered, such as a bad
 * option or no answer in time, can be retried.
 */
export function connect(options: ConnectOptions = {}): Promise<Ghost> {
  // Both copies would say hello for the same document, and Admin answers a document once.
  if (!claimPage()) {
    return Promise.reject(
      new GhostAppError(
        'duplicate_sdk',
        'This page loads the app SDK more than once; load one copy, which every part of the page shares',
      ),
    );
  }
  if (spent) {
    return Promise.reject(spent);
  }
  if (!connecting) {
    const attempt: Promise<Ghost> = handshake(options, (error) => {
      spent = error;
      forget(attempt);
    }).catch((error: unknown) => {
      forget(attempt);
      throw error;
    });
    connecting = attempt;
  }
  return connecting;
}
