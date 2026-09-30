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

describe('fake API request teardown', () => {
  let settleRequests: typeof import('./worker').settleRequests;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const worker = await import('./worker');
    settleRequests = worker.settleRequests;
    await worker.startFakeApi({ resolver: () => undefined, routes: [] });
  });

  afterEach(() => {
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
});
