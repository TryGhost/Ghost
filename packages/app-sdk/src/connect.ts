import { HELLO_MESSAGE_TYPE, isConnectMessage } from '@tryghost/app-contracts';

import { GhostAppError, invalidArgument } from './errors.ts';
import { Channel } from './session.ts';
import type { ConnectOptions, Ghost } from './types.ts';
import { SDK_VERSION } from './version.ts';

/** Matches the clock Admin runs from mounting the frame to giving up on it. */
export const DEFAULT_CONNECT_TIMEOUT = 10_000;

/**
 * How often the hello is said again until Admin answers. Admin may start listening only
 * after the page has loaded and said its first hello, so one is not enough.
 */
export const HELLO_INTERVAL = 250;

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

function handshake(
  { timeout = DEFAULT_CONNECT_TIMEOUT }: ConnectOptions,
  onEnded: () => void,
): Promise<Ghost> {
  if (typeof timeout !== 'number' || !(timeout > 0) || !Number.isFinite(timeout)) {
    return Promise.reject(invalidArgument('Expected a timeout in milliseconds, above 0'));
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

    const sayHello = () => {
      parent.postMessage({ type: HELLO_MESSAGE_TYPE, sdk: SDK_VERSION }, targetOrigin);
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
 * failure, or once the session has ended, the next call connects afresh: a page Admin
 * starts again gets a new `Ghost`, never the one whose session is over.
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
