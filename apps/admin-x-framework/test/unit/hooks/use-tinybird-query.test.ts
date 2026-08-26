import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../../src/hooks/use-tinybird-token', () => ({
  useTinybirdToken: vi.fn(),
}));

vi.mock('../../../src/api/settings', () => ({
  useWebAnalyticsEnabled: vi.fn(),
}));

import { fetchTinybirdPipe, useTinybirdQuery } from '../../../src/hooks/use-tinybird-query';
import { useTinybirdToken } from '../../../src/hooks/use-tinybird-token';
import { useWebAnalyticsEnabled } from '../../../src/api/settings';

const mockUseTinybirdToken = vi.mocked(useTinybirdToken);
const mockUseWebAnalyticsEnabled = vi.mocked(useWebAnalyticsEnabled);

const statsConfig = { id: 'site-1', endpoint: 'https://tinybird.example.com' };
const PIPE_URL = 'https://tinybird.example.com/v0/pipes/api_test.json';

const rows = [{ visits: 42 }];
const meta = [{ name: 'visits', type: 'UInt64' }];

const okResponse = (body: unknown = { data: rows, meta }) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const errorResponse = (status: number, body = '') => ({
  ok: false,
  status,
  statusText: 'Error',
  json: async () => ({}),
  text: async () => body,
});

const tokenState = (overrides: Partial<ReturnType<typeof useTinybirdToken>> = {}) => ({
  token: 'token-a' as string | undefined,
  isLoading: false,
  error: null,
  refetch: vi.fn().mockResolvedValue('token-a'),
  ...overrides,
});

describe('useTinybirdQuery', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;
  let fetchMock: ReturnType<typeof vi.fn>;

  const renderQuery = (options: Partial<Parameters<typeof useTinybirdQuery>[0]> = {}) =>
    renderHook(
      () =>
        useTinybirdQuery({
          statsConfig,
          endpoint: 'api_test',
          params: { site_uuid: 'site-1' },
          ...options,
        }),
      { wrapper },
    );

  beforeEach(() => {
    queryClient = new QueryClient();
    wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    mockUseTinybirdToken.mockReturnValue(tokenState());
    mockUseWebAnalyticsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    queryClient.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('fetches the pipe with params and a bearer token and returns data and meta', async () => {
    const { result } = renderQuery();

    await waitFor(() => {
      expect(result.current.data).toEqual(rows);
    });
    expect(result.current.meta).toEqual(meta);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PIPE_URL}?site_uuid=site-1`);
    expect(init.headers).toEqual({ Authorization: 'Bearer token-a' });
    expect(init.credentials).toBe('omit');
  });

  it('appends the version suffix from statsConfig to the pipe name', async () => {
    const { result } = renderQuery({ statsConfig: { ...statsConfig, version: 'v2' } });

    await waitFor(() => {
      expect(result.current.data).toEqual(rows);
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://tinybird.example.com/v0/pipes/api_test_v2.json?site_uuid=site-1',
    );
  });

  it('reports loading and does not fetch until the token has loaded', async () => {
    mockUseTinybirdToken.mockReturnValue(tokenState({ token: undefined, isLoading: true }));
    const { result, rerender } = renderQuery();

    expect(result.current.loading).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    mockUseTinybirdToken.mockReturnValue(tokenState());
    rerender();

    await waitFor(() => {
      expect(result.current.data).toEqual(rows);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch a token or query Tinybird when disabled', () => {
    const { result } = renderQuery({ enabled: false });

    expect(mockUseTinybirdToken).toHaveBeenCalledWith({ enabled: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, meta: null, loading: false, error: null });
  });

  it('does not fetch a token or query Tinybird without statsConfig', () => {
    const { result } = renderQuery({ statsConfig: undefined });

    expect(mockUseTinybirdToken).toHaveBeenCalledWith({ enabled: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, meta: null, loading: false, error: null });
  });

  it('noops when the web analytics kill-switch is off', () => {
    mockUseWebAnalyticsEnabled.mockReturnValue(false);

    const { result } = renderQuery();

    expect(mockUseTinybirdToken).toHaveBeenCalledWith({ enabled: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, meta: null, loading: false, error: null });
  });

  it('keeps the cached result when the token rotates', async () => {
    const { result, rerender } = renderQuery();

    await waitFor(() => {
      expect(result.current.data).toEqual(rows);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Rotate the token: same query key, so no refetch and no data reset.
    mockUseTinybirdToken.mockReturnValue(tokenState({ token: 'token-b' }));
    rerender();

    expect(result.current.data).toEqual(rows);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the current token when refetching after a rotation', async () => {
    const { result, rerender } = renderQuery();

    await waitFor(() => {
      expect(result.current.data).toEqual(rows);
    });

    mockUseTinybirdToken.mockReturnValue(tokenState({ token: 'token-b' }));
    rerender();

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['tinybird'] });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer token-b' });
  });

  it('polls at the configured refetchInterval', async () => {
    renderQuery({ refetchInterval: 30 });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('surfaces request failures as errors without retrying', async () => {
    fetchMock.mockResolvedValue(errorResponse(500, 'pipe exploded'));

    const { result } = renderQuery();

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe('Tinybird request failed (500): pipe exploded');
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces the token query error', () => {
    const tokenError = new Error('Token error');
    mockUseTinybirdToken.mockReturnValue(tokenState({ token: undefined, error: tokenError }));

    const { result } = renderQuery();

    expect(result.current.error).toBe(tokenError);
    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refetches stale data when the window regains focus', async () => {
    const { result } = renderQuery();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Age the cached entry past the stale window, then simulate a tab return.
    const entry = queryClient.getQueryCache().getAll()[0];
    entry.state.dataUpdatedAt = Date.now() - 61_000;
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    focusManager.setFocused(undefined);
  });

  it('passes the background polling flag through to the query', () => {
    const { result } = renderQuery({
      refetchInterval: 60_000,
      refetchIntervalInBackground: true,
    });
    void result;
    const entry = queryClient.getQueryCache().getAll()[0];
    expect(entry.observers[0]?.options.refetchIntervalInBackground).toBe(true);
    expect(entry.observers[0]?.options.refetchInterval).toBe(60_000);
  });
});

describe('fetchTinybirdPipe', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('refreshes the token and retries once on a 403', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(403)).mockResolvedValueOnce(okResponse());
    const refreshToken = vi.fn().mockResolvedValue('token-b');

    const result = await fetchTinybirdPipe({ url: PIPE_URL, token: 'token-a', refreshToken });

    expect(result).toEqual({ data: rows, meta });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer token-b' });
  });

  it('does not retry when the refreshed token is unchanged', async () => {
    fetchMock.mockResolvedValue(errorResponse(403, 'forbidden'));
    const refreshToken = vi.fn().mockResolvedValue('token-a');

    await expect(
      fetchTinybirdPipe({ url: PIPE_URL, token: 'token-a', refreshToken }),
    ).rejects.toThrow('Tinybird request failed (403): forbidden');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry when no fresh token is available', async () => {
    fetchMock.mockResolvedValue(errorResponse(401));
    const refreshToken = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchTinybirdPipe({ url: PIPE_URL, token: 'token-a', refreshToken }),
    ).rejects.toThrow('Tinybird request failed (401): Error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the token for non-auth failures', async () => {
    fetchMock.mockResolvedValue(errorResponse(500, 'boom'));
    const refreshToken = vi.fn();

    await expect(
      fetchTinybirdPipe({ url: PIPE_URL, token: 'token-a', refreshToken }),
    ).rejects.toThrow('Tinybird request failed (500): boom');
    expect(refreshToken).not.toHaveBeenCalled();
  });
});
