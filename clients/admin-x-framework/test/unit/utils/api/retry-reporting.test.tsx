import * as Sentry from '@sentry/react';
import { renderHookWithProviders } from '../../../../src/test/test-utils';
import { useFetchApi } from '../../../../src/utils/api/fetch-api';
import { MaintenanceError } from '../../../../src/utils/errors';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  getClient: vi.fn(),
  captureMessage: vi.fn(),
}));

const endpoint = 'http://localhost:3000/ghost/api/admin/posts/';

const maintenance = () =>
  new Response('Maintenance', { status: 503, headers: { server: 'cloudflare' } });

const ok = () => Response.json({ posts: [] }, { headers: { server: 'nginx' } });

const renderFetchApi = () => renderHookWithProviders(() => useFetchApi()).result.current;

describe('request retry reporting', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports a request that succeeds after retrying', async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(maintenance()).mockResolvedValueOnce(ok());
    const fetchApi = renderFetchApi();

    const request = fetchApi(endpoint);
    await vi.runAllTimersAsync();
    await request;

    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Request took multiple attempts', {
      extra: {
        status: 200,
        method: 'GET',
        attempts: 1,
        totalSeconds: 0.5,
        endpoint,
        server: 'nginx',
      },
    });
  });

  it('reports a request that fails after retrying with its error and status', async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => maintenance());
    const fetchApi = renderFetchApi();

    const request = expect(
      fetchApi(endpoint, { method: 'PUT', body: '{}' }),
    ).rejects.toBeInstanceOf(MaintenanceError);
    await vi.runAllTimersAsync();
    await request;

    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Request failed after multiple attempts', {
      extra: {
        error: 'Error: Ghost is currently undergoing maintenance, please wait a moment then retry.',
        status: 503,
        method: 'PUT',
        attempts: 16,
        totalSeconds: 15.5,
        endpoint,
        server: 'cloudflare',
      },
    });
  });

  it('stays silent without a Sentry client', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(maintenance())
      .mockResolvedValueOnce(ok())
      .mockImplementation(async () => maintenance());
    const fetchApi = renderFetchApi();

    const recovered = fetchApi(endpoint);
    await vi.runAllTimersAsync();
    await recovered;

    const failed = expect(fetchApi(endpoint)).rejects.toBeInstanceOf(MaintenanceError);
    await vi.runAllTimersAsync();
    await failed;

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
