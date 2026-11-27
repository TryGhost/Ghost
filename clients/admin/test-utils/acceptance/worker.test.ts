import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Keep requests outside MSW until the test releases them. This reproduces
// service-worker delivery lag without depending on browser scheduling.
vi.mock('msw/browser', () => ({
  setupWorker: () => ({
    events: { on: vi.fn() },
    start: vi.fn().mockResolvedValue(undefined),
  }),
}));

function deferredResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const xhrMethods = Object.getOwnPropertyDescriptors(XMLHttpRequest.prototype);

describe('fake API request teardown', () => {
  let settleRequests: typeof import('./worker').settleRequests;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    // An XHR is held the same way: sent, but never delivered until the test
    // fires its loadend.
    XMLHttpRequest.prototype.send = () => {};
    const worker = await import('./worker');
    settleRequests = worker.settleRequests;
    worker.trackIssuedRequests();
    await worker.startFakeApi({ resolver: () => undefined, routes: [] });
  });

  afterEach(() => {
    Object.defineProperties(XMLHttpRequest.prototype, {
      open: xhrMethods.open,
      send: xhrMethods.send,
    });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits for a fetch that has not reached the service worker', async () => {
    const response = new Response('{}');
    const pending = deferredResponse();
    fetchMock.mockReturnValue(pending.promise);

    const request = window.fetch('/ghost/api/admin/stats/posts-member-counts/', {
      method: 'POST',
    });
    const settled = vi.fn();
    const draining = settleRequests().then(settled);

    // Longer than the quiet window, with no MSW lifecycle events yet.
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).not.toHaveBeenCalled();

    pending.resolve(response);
    await expect(request).resolves.toBe(response);
    await vi.advanceTimersByTimeAsync(60);
    await draining;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('removes a rejected fetch from the ledger', async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValue(pending.promise);
    const error = new TypeError('Network request failed');
    const request = window.fetch(new URL('https://ghost.org/changelog.json'));
    const rejected = expect(request).rejects.toBe(error);

    pending.reject(error);
    await rejected;
    const draining = settleRequests();
    await vi.advanceTimersByTimeAsync(60);
    await draining;
  });

  it('removes a fetch that throws before returning from the ledger', async () => {
    const error = new TypeError('Failed to construct Request');
    fetchMock.mockImplementation(() => {
      throw error;
    });

    expect(() => window.fetch('/ghost/api/admin/stats/posts-member-counts/')).toThrow(error);
    const draining = settleRequests();
    await vi.advanceTimersByTimeAsync(60);
    await draining;
  });

  it('reports the method and path of a fetch still waiting for MSW', async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValue(pending.promise);
    const input = new Request('http://localhost/ghost/api/admin/stats/posts-member-counts/', {
      method: 'POST',
    });
    const request = window.fetch(input);
    const draining = expect(settleRequests({ timeoutMs: 100 })).rejects.toThrow(
      'POST /stats/posts-member-counts/',
    );

    await vi.advanceTimersByTimeAsync(100);
    await draining;
    pending.resolve(new Response('{}'));
    await request;
  });

  it('does not wait for unrelated asset requests', async () => {
    const pending = deferredResponse();
    fetchMock.mockReturnValue(pending.promise);
    const request = window.fetch('/assets/image.png');
    const settled = vi.fn();
    const draining = settleRequests().then(settled);

    await vi.advanceTimersByTimeAsync(60);
    expect(settled).toHaveBeenCalledOnce();
    await draining;
    pending.resolve(new Response('image'));
    await request;
  });

  it('waits for an XHR upload that has not reached the service worker', async () => {
    const upload = new XMLHttpRequest();
    upload.open('POST', '/ghost/api/admin/images/upload/');
    upload.send();
    const settled = vi.fn();
    const draining = settleRequests().then(settled);

    await vi.advanceTimersByTimeAsync(100);
    expect(settled).not.toHaveBeenCalled();

    upload.dispatchEvent(new Event('loadend'));
    await vi.advanceTimersByTimeAsync(60);
    await draining;
    expect(settled).toHaveBeenCalledOnce();
  });
});
