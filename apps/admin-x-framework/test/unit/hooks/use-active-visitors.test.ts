import { renderHook } from '@testing-library/react';
import { useActiveVisitors } from '../../../src/hooks/use-active-visitors';

vi.mock('../../../src/hooks/use-tinybird-query', () => ({
  useTinybirdQuery: vi.fn(),
}));

import { useTinybirdQuery } from '../../../src/hooks/use-tinybird-query';

const mockUseTinybirdQuery = vi.mocked(useTinybirdQuery);

const statsConfig = {
  id: 'test-site-id',
  endpoint: 'https://api.test.com',
};

const queryState = (overrides: Partial<ReturnType<typeof useTinybirdQuery>> = {}) => ({
  data: null,
  meta: null,
  loading: false,
  error: null,
  ...overrides,
});

describe('useActiveVisitors', () => {
  beforeEach(() => {
    mockUseTinybirdQuery.mockReturnValue(queryState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state when enabled is true', () => {
    const { result } = renderHook(() => useActiveVisitors({ statsConfig, enabled: true }));

    expect(result.current).toEqual({
      activeVisitors: 0,
      isLoading: false,
      error: null,
    });
  });

  it('returns zero state when enabled is false', () => {
    const { result } = renderHook(() => useActiveVisitors({ enabled: false }));

    expect(result.current).toEqual({
      activeVisitors: 0,
      isLoading: false,
      error: null,
    });
    expect(mockUseTinybirdQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('polls via refetchInterval instead of a cache-busting param', () => {
    renderHook(() => useActiveVisitors({ statsConfig, enabled: true }));

    expect(mockUseTinybirdQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'api_active_visitors',
        statsConfig,
        refetchInterval: 60 * 1000,
      }),
    );
    const params = mockUseTinybirdQuery.mock.calls[0][0].params;
    expect(params).not.toHaveProperty('_refresh');
  });

  it('shows loading state only on initial load with no last known count', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ loading: true }));

    const { result } = renderHook(() => useActiveVisitors({ statsConfig, enabled: true }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activeVisitors).toBe(0);
  });

  it('does not show loading when a last known count exists', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 25 }] }));

    const { result, rerender } = renderHook(() =>
      useActiveVisitors({ statsConfig, enabled: true }),
    );
    expect(result.current.activeVisitors).toBe(25);

    mockUseTinybirdQuery.mockReturnValue(queryState({ data: null, loading: true }));
    rerender();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeVisitors).toBe(25);
  });

  it('returns active visitor count from data', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 42 }] }));

    const { result } = renderHook(() => useActiveVisitors({ statsConfig, enabled: true }));

    expect(result.current.activeVisitors).toBe(42);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles error state', () => {
    const mockError = new Error('Network error');
    mockUseTinybirdQuery.mockReturnValue(queryState({ error: mockError }));

    const { result } = renderHook(() => useActiveVisitors({ statsConfig, enabled: true }));

    expect(result.current.error).toBe(mockError);
  });

  it('includes postUuid in params when provided', () => {
    const postUuid = 'test-post-uuid';
    renderHook(() => useActiveVisitors({ postUuid, enabled: true }));

    expect(mockUseTinybirdQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ post_uuid: postUuid }),
      }),
    );
  });

  it('does not include postUuid in params when not provided', () => {
    renderHook(() => useActiveVisitors({ enabled: true }));

    expect(mockUseTinybirdQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.not.objectContaining({ post_uuid: expect.anything() }),
      }),
    );
  });

  it('uses statsConfig for site_uuid, falling back to an empty string', () => {
    const { rerender } = renderHook(
      ({ config }: { config?: typeof statsConfig }) =>
        useActiveVisitors({ statsConfig: config, enabled: true }),
      { initialProps: { config: statsConfig } },
    );

    expect(mockUseTinybirdQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ site_uuid: 'test-site-id' }),
      }),
    );

    rerender({ config: undefined });

    expect(mockUseTinybirdQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ site_uuid: '' }),
      }),
    );
  });

  it('retains the last known count when data becomes null', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 15 }] }));

    const { result, rerender } = renderHook(() =>
      useActiveVisitors({ statsConfig, enabled: true }),
    );
    expect(result.current.activeVisitors).toBe(15);

    mockUseTinybirdQuery.mockReturnValue(queryState({ data: null }));
    rerender();

    expect(result.current.activeVisitors).toBe(15);
  });

  it('handles zero active visitors correctly', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 0 }] }));

    const { result } = renderHook(() => useActiveVisitors({ enabled: true }));

    expect(result.current.activeVisitors).toBe(0);
  });

  it('handles invalid data format gracefully', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ some_other_field: 42 }] }));

    const { result } = renderHook(() => useActiveVisitors({ enabled: true }));

    expect(result.current.activeVisitors).toBe(0);
  });

  it('does not update the count when disabled', () => {
    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 20 }] }));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useActiveVisitors({ statsConfig, enabled }),
      { initialProps: { enabled: true } },
    );

    expect(result.current.activeVisitors).toBe(20);

    mockUseTinybirdQuery.mockReturnValue(queryState({ data: [{ active_visitors: 30 }] }));
    rerender({ enabled: false });

    expect(result.current.activeVisitors).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
