import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingAppConnection, type BillingAppLoadFailureReport } from './billing-app-connection';

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
    const onLoadFailure = vi.fn<(report: BillingAppLoadFailureReport) => void>();
    const connection = new BillingAppConnection(BILLING_URL, {
      getLocationSubRoute: () => locationSubRoute,
      getReportContext: () => ({ isForceUpgrade: false, routeName: 'pro.index' }),
      onLoadFailure,
      loadTimeoutMs: 100,
      loadRetryDelaysMs: [10],
    });
    const frame = fakeIframe();
    const detach = connection.attach(frame.iframe);
    return { connection, detach, onLoadFailure, ...frame };
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

  it("reports a visible failure with Ember's diagnostics", () => {
    const { connection, onLoadFailure } = connect();
    connection.setVisible(true);
    connection.recordPreReadyMessage({ request: 'token' });
    connection.recordPreReadyMessage({ subscription: {} });
    connection.recordPreReadyMessage({ request: 'token' });

    vi.advanceTimersByTime(210);

    expect(onLoadFailure).toHaveBeenCalledOnce();
    const [{ billingMonitor, tags }] = onLoadFailure.mock.calls[0];
    expect(billingMonitor).toMatchObject({
      attempts: 2,
      attempt_source: 'retry',
      attempt_phase: 'shell_ready',
      iframe_reload_reason: 'timeout_retry',
      configured_billing_origin: ORIGIN,
      has_billing_url: true,
      is_force_upgrade: false,
      has_preload_failure: false,
      ready_received: false,
      billing_window_open: true,
      billing_shell: 'react',
      non_ready_message_count: 0,
    });
    expect(tags).toMatchObject({
      source: 'billing-app-load-monitor',
      attempt_source: 'retry',
      route: 'pro.index',
    });
  });

  it('counts messages that arrive before ready within the current attempt', () => {
    const { connection, onLoadFailure } = connect();
    connection.setVisible(true);
    vi.advanceTimersByTime(110);
    connection.recordPreReadyMessage({ request: 'token' });
    connection.recordPreReadyMessage({ subscription: {} });
    connection.recordPreReadyMessage({ request: 'token' });

    vi.advanceTimersByTime(100);

    expect(onLoadFailure.mock.calls[0][0].billingMonitor).toMatchObject({
      non_ready_message_count: 3,
      non_ready_message_types: 'token,subscription',
      last_non_ready_message_type: 'token',
    });
  });

  it('does not report a failure while hidden, then reports it with the preload snapshot', () => {
    const { connection, onLoadFailure } = connect();
    vi.advanceTimersByTime(110);
    connection.recordPreReadyMessage({ request: 'token' });
    vi.advanceTimersByTime(100);
    expect(onLoadFailure).not.toHaveBeenCalled();

    connection.setVisible(true);
    vi.advanceTimersByTime(210);

    expect(onLoadFailure.mock.calls[0][0].billingMonitor).toMatchObject({
      attempt_source: 'retry',
      has_preload_failure: true,
      preload_non_ready_message_count: 1,
      preload_non_ready_message_types: 'token',
    });
  });

  describe('reload reasons', () => {
    function connectWithoutRetry() {
      const onLoadFailure = vi.fn<(report: BillingAppLoadFailureReport) => void>();
      const connection = new BillingAppConnection(BILLING_URL, {
        getLocationSubRoute: () => null,
        getReportContext: () => ({ isForceUpgrade: true, routeName: 'pro.pro-sub' }),
        onLoadFailure,
        loadTimeoutMs: 100,
        loadRetryDelaysMs: [],
      });
      connection.attach(fakeIframe().iframe);
      const reasons = () =>
        onLoadFailure.mock.calls.map(([report]) => report.billingMonitor.iframe_reload_reason);
      return { connection, onLoadFailure, reasons };
    }

    it('keeps reporting a preload failure until the app loads', () => {
      const { connection, onLoadFailure, reasons } = connectWithoutRetry();
      vi.advanceTimersByTime(100);

      connection.setVisible(true);
      vi.advanceTimersByTime(100);
      connection.setVisible(false);
      connection.setVisible(true);
      vi.advanceTimersByTime(100);

      expect(reasons()).toEqual([
        'visible_open_after_preload_failure',
        'visible_open_after_preload_failure',
      ]);
      expect(onLoadFailure.mock.calls[0][0].billingMonitor).toMatchObject({
        attempt_source: 'user_open',
        is_force_upgrade: true,
      });
      expect(onLoadFailure.mock.calls[0][0].tags.route).toBe('pro.pro-sub');
    });

    it('reports reopening after a visible failure', () => {
      const { connection, reasons } = connectWithoutRetry();
      connection.setVisible(true);
      vi.advanceTimersByTime(100);
      connection.setVisible(false);
      connection.setVisible(true);
      vi.advanceTimersByTime(100);

      expect(reasons()).toEqual(['set_src', 'visible_open_after_load_failure']);
    });
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
