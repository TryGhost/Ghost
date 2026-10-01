import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useEmberSidebarVisibilityMock = vi.fn<() => boolean>();
const syncEmberFullScreenMock = vi.fn<(isFullScreen: boolean) => () => void>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useMatches: () => useMatchesMock(),
}));

vi.mock('@/ember-bridge', () => ({
  syncEmberFullScreen: (isFullScreen: boolean) => syncEmberFullScreenMock(isFullScreen),
  useSidebarVisibility: () => useEmberSidebarVisibilityMock(),
}));

describe('useAdminSidebarVisibility', () => {
  beforeEach(() => {
    useMatchesMock.mockReturnValue([]);
    useEmberSidebarVisibilityMock.mockReturnValue(true);
  });

  it('uses the Ember sidebar visibility by default', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useEmberSidebarVisibilityMock.mockReturnValue(false);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(false);
  });

  it('hides the sidebar when any matched React route opts out', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useMatchesMock.mockReturnValue([{}, { handle: { hideAdminSidebar: true } }]);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(false);
  });

  it('keeps the sidebar visible when no matched route opts out', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useMatchesMock.mockReturnValue([
      { handle: { allowInForceUpgrade: true } },
      { handle: { hideAdminSidebar: false } },
    ]);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(true);
  });
});

describe('useSyncEmberFullScreen', () => {
  it('publishes whether a matched route hides the sidebar', async () => {
    const { useSyncEmberFullScreen } = await import('./sidebar-visibility');
    const stopSync = vi.fn();
    syncEmberFullScreenMock.mockReturnValue(stopSync);

    useMatchesMock.mockReturnValue([{}, { handle: { hideAdminSidebar: true } }]);
    const { rerender } = renderHook(() => useSyncEmberFullScreen());

    expect(syncEmberFullScreenMock).toHaveBeenCalledExactlyOnceWith(true);

    useMatchesMock.mockReturnValue([{}, { handle: { allowInForceUpgrade: true } }]);
    rerender();

    expect(stopSync).toHaveBeenCalledOnce();
    expect(syncEmberFullScreenMock).toHaveBeenCalledTimes(2);
    expect(syncEmberFullScreenMock).toHaveBeenLastCalledWith(false);
  });
});
