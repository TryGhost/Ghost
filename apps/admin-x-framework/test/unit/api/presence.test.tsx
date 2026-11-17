import { renderHookWithProviders } from '../../../src/test/test-utils';
import { usePresenceApi } from '../../../src/api/presence';
import { onUpgradeStatus } from '../../../src/utils/api/upgrade-status';
import { SessionExpiredError } from '../../../src/utils/errors';
import { withMockFetch } from '../../utils/mock-fetch';

const resource = { id: 'a'.repeat(24), type: 'post' as const };

describe('presence api', () => {
  it('polls the presence endpoint with the resources and the edited document', async () => {
    const json = { presence: [{ active: [], serverTime: 1 }] };
    await withMockFetch({ json }, async (mock) => {
      const { result } = renderHookWithProviders(() => usePresenceApi());
      const response = await result.current.poll([resource], resource);
      expect(response).toEqual(json);
      const [url, init] = mock.calls[0] as [RequestInfo | URL, RequestInit];
      expect(String(url)).toMatch(/\/ghost\/api\/admin\/presence\/$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({
        presence: [{ resources: [resource], editing: resource }],
      });
    });
  });

  it('keeps a 503 from the poll out of the maintenance alert', async () => {
    const listener = vi.fn();
    const stop = onUpgradeStatus(listener);
    try {
      await withMockFetch({ json: { errors: [] }, status: 503 }, async () => {
        const { result } = renderHookWithProviders(() => usePresenceApi());
        await expect(result.current.poll([resource], resource)).rejects.toMatchObject({
          response: { status: 503 },
        });
      });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it('raises an expired session, which Ghost answers with a 403, as SessionExpiredError', async () => {
    const json = { errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }] };
    const headers = { 'content-type': 'application/json' };
    await withMockFetch({ json, headers, status: 403, ok: false }, async () => {
      const { result } = renderHookWithProviders(() => usePresenceApi());
      const failure: unknown = await result.current
        .poll([resource], resource)
        .catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(SessionExpiredError);
      expect((failure as SessionExpiredError).response?.status).toBe(403);
    });
  });

  it('leaves with a keepalive request carrying the Ghost request headers', async () => {
    await withMockFetch({ json: {}, status: 204 }, async (mock) => {
      const { result } = renderHookWithProviders(() => usePresenceApi());
      result.current.leave(resource);
      const [url, init] = mock.calls[0] as [RequestInfo | URL, RequestInit];
      expect(String(url)).toMatch(/\/ghost\/api\/admin\/presence\/leave\/$/);
      expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'include' });
      expect(init.headers).toMatchObject({
        'content-type': 'application/json',
        'app-pragma': 'no-cache',
      });
      expect(JSON.parse(String(init.body))).toEqual({ presence: [{ resource }] });
    });
  });
});
