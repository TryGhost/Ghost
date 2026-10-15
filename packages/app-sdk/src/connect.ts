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
 * How often, in milliseconds, the SDK repeats the hello until Admin answers. Admin may only
 * start listening after the page has loaded and sent its first hello, so one hello is not
 * enough.
 */
const HELLO_INTERVAL = 250;

/**
 * The target origin for the hello: the embedding page's origin where the browser exposes it
 * (`location.ancestorOrigins`, in Chromium and WebKit), and `'*'` elsewhere. The hello grants
 * nothing: the port goes the other way, and Admin addresses it to this page's origin only.
 * `document.referrer` doesn't work here: once the page has navigated within itself, it holds
 * the page's own origin.
 */
function parentOrigin(): string {
  const origin = window.location.ancestorOrigins?.[0];
  return origin && origin !== 'null' ? origin : '*';
}

/**
 * The hello's `document` ID: the time the page's document was created. A reload, a form post
 * or a link creates a new document, and with it a new ID.
 */
function documentIdentity(): string {
  return String(performance.timeOrigin);
}

/**
 * The global key where the first copy of the SDK to connect claims the page. It is a symbol
 * from the global registry, so a second copy bundled into the same page finds the same key.
 */
const PAGE_CLAIM = Symbol.for('@tryghost/app-sdk');
const thisCopy = Object.freeze({ sdk: SDK_VERSION });

/** Claims the page for this copy of the SDK unless another copy has. Returns whether it did. */
function claimPage(): boolean {
  const page = globalThis as unknown as Record<symbol, unknown>;
  page[PAGE_CLAIM] ??= thisCopy;
  return page[PAGE_CLAIM] === thisCopy;
}

/**
 * The longest delay `setTimeout` supports. It treats anything longer as 0, so the timeout
 * would fire immediately.
 */
const TIMEOUT_MAX = 2 ** 31 - 1;

function handshake(
  options: ConnectOptions,
  onEnded: (error: GhostAppError) => void,
): Promise<Ghost> {
  if (!isRecord(options)) {
    return Promise.reject(invalidArgument('Expected options such as { timeout: 10000 }'));
  }
  // By default, wait as long as Admin gives the page. Waiting longer would mean waiting on a
  // frame Admin has already given up on.
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

    // The channel is bound to the first valid answer from the parent window. The listener is
    // removed as soon as that answer arrives, so later answers are ignored.
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
// The error the page's connection ended with, after Admin answered it. Admin answers each
// document only once, so this connection was the page's only one.
let spent: GhostAppError | undefined;

// Forgets an attempt only if it is still the shared one: an attempt that ended may report
// that after a newer attempt has started.
function forget(attempt: Promise<Ghost>) {
  if (connecting === attempt) {
    connecting = undefined;
  }
}

/**
 * Connects to Ghost Admin, which must frame the page, and resolves once Admin has started the
 * app. Safe to call as soon as the page loads.
 *
 * Every call shares one connection, and the first call's options apply. Only one copy of the
 * SDK in a page can connect; any other copy rejects with `duplicate_sdk`. Admin answers each
 * document only once, so after it answers, that connection is the page's only one. Once it
 * fails or its session ends, every call rejects with the error it ended with, and only a new
 * document (after a reload, for example) can connect again. A failure before Admin answered,
 * such as a bad option or a timeout, can be retried.
 */
export function connect(options: ConnectOptions = {}): Promise<Ghost> {
  // Two copies would both send a hello for the same document, and Admin answers each document
  // only once.
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
