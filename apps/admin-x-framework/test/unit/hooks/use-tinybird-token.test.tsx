import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTinybirdToken } from '../../../src/hooks/use-tinybird-token';
import { useTinybirdTokenQuery } from '../../../src/api/tinybird';
import { useWebAnalyticsEnabled } from '../../../src/api/settings';
import React from 'react';

// Mock the useTinybirdTokenQuery API
vi.mock('../../../src/api/tinybird', () => ({
  useTinybirdTokenQuery: vi.fn(),
}));

// The web analytics kill-switch is a settings selector; its own derivation is
// covered in test/unit/api/settings.test.tsx.
vi.mock('../../../src/api/settings', () => ({
  useWebAnalyticsEnabled: vi.fn(),
}));

const mockUseTinybirdTokenQuery = vi.mocked(useTinybirdTokenQuery);
const mockUseWebAnalyticsEnabled = vi.mocked(useWebAnalyticsEnabled);

describe('useTinybirdToken', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    vi.clearAllMocks();
    mockUseWebAnalyticsEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns token when API returns valid token', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'valid-token-123' } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.token).toBe('valid-token-123');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('returns undefined when API returns null token', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: null } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.token).toBeUndefined();
  });

  it('uses built-in query options without requiring consumer configuration', () => {
    const mockRefetch = vi.fn();

    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'cached-token' } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    // First render
    renderHook(() => useTinybirdToken(), { wrapper });

    // Second render in same QueryClient context
    renderHook(() => useTinybirdToken(), { wrapper });

    // Verify that useTinybirdTokenQuery is called with default enabled: true
    expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: true });

    // Verify both calls used the default enabled option
    expect(mockUseTinybirdTokenQuery.mock.calls[0]).toEqual([{ enabled: true }]);
    expect(mockUseTinybirdTokenQuery.mock.calls[1]).toEqual([{ enabled: true }]);
  });

  it('uses built-in query options for optimal token refresh behavior', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'test-token' } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderHook(() => useTinybirdToken(), { wrapper });

    // Verify default enabled option is passed
    expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseTinybirdTokenQuery.mock.calls[0]).toEqual([{ enabled: true }]);
  });

  it('returns undefined for invalid token types without throwing error', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 123 } }, // number instead of string
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.token).toBeUndefined();
    expect(result.current.error).toBe(null);
  });

  it('passes through API errors', () => {
    const apiError = new Error('Network error');

    mockUseTinybirdTokenQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: apiError,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.token).toBeUndefined();
    expect(result.current.error).toBe(apiError);
  });

  it('exposes refetch function', () => {
    const mockRefetch = vi.fn();

    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'test-token' } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('refreshes token when stale time expires', () => {
    vi.useFakeTimers();

    let queryState = {
      data: { tinybird: { token: 'initial-token' } },
      isLoading: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    };

    mockUseTinybirdTokenQuery.mockImplementation(() => queryState as any);

    const { result, rerender } = renderHook(() => useTinybirdToken(), { wrapper });

    // Initially should have the token and not be stale
    expect(result.current.token).toBe('initial-token');
    expect(queryState.isStale).toBe(false);
    expect(queryState.isFetching).toBe(false);

    // Fast forward past the stale time (130 minutes)
    vi.advanceTimersByTime(131 * 60 * 1000);

    // Update mock to simulate React Query marking as stale and fetching fresh data
    queryState = {
      ...queryState,
      isStale: true,
      isFetching: true,
      data: { tinybird: { token: 'refreshed-token' } },
    };

    // Trigger rerender to pick up the new state
    rerender();

    // Should now have the refreshed token
    expect(result.current.token).toBe('refreshed-token');

    vi.useRealTimers();
  });

  it('continues background refresh every 2 hours', () => {
    vi.useFakeTimers();

    let fetchCount = 0;
    let queryState = {
      data: { tinybird: { token: 'token-v1' } },
      isLoading: false,
      isFetching: false,
      isStale: false,
      error: null,
      refetch: vi.fn(),
    };

    mockUseTinybirdTokenQuery.mockImplementation(() => {
      fetchCount += 1;
      return {
        ...queryState,
        data: { tinybird: { token: `token-v${fetchCount}` } },
      } as any;
    });

    const { result, rerender } = renderHook(() => useTinybirdToken(), { wrapper });

    // Initial token
    expect(result.current.token).toBe('token-v1');
    expect(fetchCount).toBe(1);

    // Fast forward 2 hours (refetch interval)
    vi.advanceTimersByTime(120 * 60 * 1000);

    // Simulate React Query background refetch
    queryState = {
      ...queryState,
      data: { tinybird: { token: 'token-v2' } },
      isFetching: false,
    };

    rerender();

    // Should have updated to new token after background refresh
    expect(result.current.token).toBe('token-v2');
    expect(fetchCount).toBe(2);

    vi.useRealTimers();
  });

  it('respects enabled option when true', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'enabled-token' } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken({ enabled: true }), { wrapper });

    expect(result.current.token).toBe('enabled-token');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: true });
  });

  it('respects enabled option when false', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken({ enabled: false }), { wrapper });

    expect(result.current.token).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('defaults enabled to true when not specified', () => {
    mockUseTinybirdTokenQuery.mockReturnValue({
      data: { tinybird: { token: 'default-token' } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useTinybirdToken(), { wrapper });

    expect(result.current.token).toBe('default-token');
    expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: true });
  });

  describe('web analytics gate', () => {
    beforeEach(() => {
      mockUseTinybirdTokenQuery.mockReturnValue({
        data: { tinybird: { token: 'test-token' } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);
    });

    it('never loads a token when web analytics is disabled, even if enabled is true', () => {
      mockUseWebAnalyticsEnabled.mockReturnValue(false);

      renderHook(() => useTinybirdToken({ enabled: true }), { wrapper });

      expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: false });
    });

    it('returns an idle result when disabled, even if the query reports loading/error', () => {
      // A disabled React Query still reports isLoading:true and may retain a
      // cached error — the hook must normalize this so providers don't hang.
      mockUseTinybirdTokenQuery.mockReturnValue({
        data: { tinybird: { token: 'stale-token' } },
        isLoading: true,
        error: new Error('stale error'),
        refetch: vi.fn(),
      } as any);

      mockUseWebAnalyticsEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useTinybirdToken({ enabled: true }), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.token).toBeUndefined();
    });

    it('loads a token when web analytics is enabled', () => {
      mockUseWebAnalyticsEnabled.mockReturnValue(true);

      renderHook(() => useTinybirdToken({ enabled: true }), { wrapper });

      expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: true });
    });

    it('stays disabled when web analytics is on but the caller passes enabled false', () => {
      mockUseWebAnalyticsEnabled.mockReturnValue(true);

      renderHook(() => useTinybirdToken({ enabled: false }), { wrapper });

      expect(mockUseTinybirdTokenQuery).toHaveBeenCalledWith({ enabled: false });
    });
  });
});
