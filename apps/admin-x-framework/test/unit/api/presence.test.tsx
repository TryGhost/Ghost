import { renderHookWithProviders } from '../../../src/test/test-utils';
import { usePresenceApi } from '../../../src/api/presence';
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
