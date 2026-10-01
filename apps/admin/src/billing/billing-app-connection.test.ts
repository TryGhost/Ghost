import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingAppConnection } from './billing-app-connection';

const BILLING_URL = 'https://billing.example.com/';
const ORIGIN = 'https://billing.example.com';

function fakeIframe() {
  const postMessage = vi.fn();
  const contentWindow = { postMessage } as unknown as Window;
  const iframe = { src: '', contentWindow } as unknown as HTMLIFrameElement;
  return { iframe, postMessage, contentWindow };
}

function srcPath(iframe: HTMLIFrameElement) {
  const url = new URL(iframe.src);
  return `${url.pathname}${url.searchParams.has('action') ? `?action=${url.searchParams.get('action')}` : ''}`;
}

describe('BillingAppConnection', () => {
  let locationSubRoute: string | null;

  beforeEach(() => {
    vi.useFakeTimers();
    locationSubRoute = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function connect() {
    const connection = new BillingAppConnection(BILLING_URL, {
      getLocationSubRoute: () => locationSubRoute,
      loadTimeoutMs: 100,
      loadRetryDelaysMs: [10],
    });
    const frame = fakeIframe();
    const detach = connection.attach(frame.iframe);
    return { connection, detach, ...frame };
  }

  it('preloads the billing app root with an attempt id', () => {
    const { iframe } = connect();

    const url = new URL(iframe.src);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('bmaAttemptId')).toMatch(/^\d+-1$/);
  });

  it('loads the billing route the Admin URL shows', () => {
    locationSubRoute = '/domain';
    const { iframe } = connect();

    expect(srcPath(iframe)).toBe('/domain');
  });

  it('retries once, then records a hidden failure without showing it', () => {
    const { connection, iframe } = connect();
    const firstSrc = iframe.src;

    vi.advanceTimersByTime(110);
    expect(iframe.src).not.toBe(firstSrc);

    vi.advanceTimersByTime(100);
    expect(connection.getSnapshot()).toEqual({ loaded: false, failed: false });
  });

  it('reloads on open after a hidden failure, and shows a failure that repeats', () => {
    const { connection, iframe } = connect();
    vi.advanceTimersByTime(210);
    const failedSrc = iframe.src;

    connection.setVisible(true);
    expect(iframe.src).not.toBe(failedSrc);
    expect(connection.getSnapshot().failed).toBe(false);

    vi.advanceTimersByTime(210);
    expect(connection.getSnapshot()).toEqual({ loaded: false, failed: true });
  });

  it('clears a shown failure once the app reports ready', () => {
    const { connection } = connect();
    connection.setVisible(true);
    vi.advanceTimersByTime(210);
    expect(connection.getSnapshot().failed).toBe(true);

    connection.markLoaded();
    expect(connection.getSnapshot()).toEqual({ loaded: true, failed: false });
  });

  it('asks a loaded app for fresh limits each time the screen opens', () => {
    const { connection, postMessage } = connect();
    connection.markLoaded();

    connection.setVisible(true);
    connection.setVisible(false);
    connection.setVisible(true);

    const limitUpdates = postMessage.mock.calls.filter(
      ([message]) => (message as { query?: string }).query === 'limitUpdate',
    );
    expect(limitUpdates).toHaveLength(2);
    expect(postMessage).toHaveBeenCalledWith({ query: 'limitUpdate' }, ORIGIN);
  });

  it('sends routes to a loaded app', () => {
    const { connection, postMessage } = connect();
    connection.markLoaded();

    connection.navigateToSubRoute('/domain');

    expect(postMessage).toHaveBeenCalledWith({ query: 'routeUpdate', response: '/domain' }, ORIGIN);
  });

  it('queues routes for a hidden app and sends them once it is ready', () => {
    const { connection, iframe, postMessage } = connect();
    const preloadSrc = iframe.src;

    connection.navigateToSubRoute('/domain');
    expect(iframe.src).toBe(preloadSrc);

    connection.markLoaded();
    expect(postMessage).toHaveBeenCalledWith({ query: 'routeUpdate', response: '/domain' }, ORIGIN);
  });

  it('bakes a route into the iframe URL while the screen is showing and the app loads', () => {
    const { connection, iframe } = connect();
    connection.setVisible(true);

    connection.navigateToSubRoute('/domain');

    expect(srcPath(iframe)).toBe('/domain');
  });

  it('does not reload for the route the iframe is already loading', () => {
    locationSubRoute = '/domain';
    const { connection, iframe } = connect();
    const src = iframe.src;
    connection.setVisible(true);

    connection.navigateToSubRoute('/domain');

    expect(iframe.src).toBe(src);
  });

  it('treats the root route and no route as the same destination', () => {
    const { connection, iframe } = connect();
    const src = iframe.src;
    connection.setVisible(true);

    connection.navigateToSubRoute('/');

    expect(iframe.src).toBe(src);
  });

  it('drops a queued route when the screen closes', () => {
    const { connection, postMessage } = connect();
    connection.setVisible(true);
    connection.navigateToSubRoute('/domain');
    connection.setVisible(false);

    connection.markLoaded();

    expect(postMessage).not.toHaveBeenCalledWith(
      { query: 'routeUpdate', response: '/domain' },
      ORIGIN,
    );
  });

  it('trusts only messages from the billing iframe window and origin', () => {
    const { connection, contentWindow } = connect();
    const message = (init: Partial<MessageEvent>) =>
      ({
        data: { request: 'token' },
        origin: ORIGIN,
        source: contentWindow,
        ...init,
      }) as MessageEvent;

    expect(connection.isFromBillingApp(message({}))).toBe(true);
    expect(connection.isFromBillingApp(message({ origin: 'https://evil.example.com' }))).toBe(
      false,
    );
    expect(connection.isFromBillingApp(message({ source: window }))).toBe(false);
    expect(connection.isFromBillingApp(message({ data: null }))).toBe(false);
  });

  it('stops the load monitor when detached', () => {
    const { connection, detach, iframe } = connect();
    const src = iframe.src;

    detach();
    vi.advanceTimersByTime(1000);

    expect(iframe.src).toBe(src);
    expect(connection.getSnapshot().failed).toBe(false);
  });
});
