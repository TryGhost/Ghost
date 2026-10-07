import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useLocationMock = vi.fn<() => { pathname: string }>();
const useIsEmberOwnedRouteMock = vi.fn<(pathname: string) => boolean>();
const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useEmberSidebarVisibilityMock = vi.fn<() => boolean>();
const syncEmberFullScreenMock = vi.fn<(isFullScreen: boolean) => () => void>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: () => useLocationMock(),
  useMatches: () => useMatchesMock(),
}));

vi.mock('@/routes', () => ({
  useIsEmberOwnedRoute: (pathname: string) => useIsEmberOwnedRouteMock(pathname),
}));

vi.mock('@/ember-bridge', () => ({
  syncEmberFullScreen: (isFullScreen: boolean) => syncEmberFullScreenMock(isFullScreen),
  useSidebarVisibility: () => useEmberSidebarVisibilityMock(),
}));

describe('useAdminSidebarVisibility', () => {
  beforeEach(() => {
    useLocationMock.mockReturnValue({ pathname: '/posts' });
    useIsEmberOwnedRouteMock.mockReturnValue(false);
    useMatchesMock.mockReturnValue([]);
    useEmberSidebarVisibilityMock.mockReturnValue(true);
  });

  it('ignores stale Ember fullscreen state on a React screen', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useEmberSidebarVisibilityMock.mockReturnValue(false);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(true);
  });

  it.each([true, false])('keeps Ember visibility %s on an Ember screen', async (visible) => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    useLocationMock.mockReturnValue({ pathname: '/pro' });
    useIsEmberOwnedRouteMock.mockReturnValue(true);
    useEmberSidebarVisibilityMock.mockReturnValue(visible);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(visible);
    expect(useIsEmberOwnedRouteMock).toHaveBeenLastCalledWith('/pro');
  });

  it('restores navigation when leaving Ember without a visibility event', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    useLocationMock.mockReturnValue({ pathname: '/pro' });
    useIsEmberOwnedRouteMock.mockImplementation((pathname) => pathname === '/pro');
    useEmberSidebarVisibilityMock.mockReturnValue(false);
    const { result, rerender } = renderHook(() => useAdminSidebarVisibility());
    expect(result.current).toBe(false);

    useLocationMock.mockReturnValue({ pathname: '/posts' });
    rerender();
    expect(result.current).toBe(true);

    useLocationMock.mockReturnValue({ pathname: '/pro' });
    rerender();
    expect(result.current).toBe(false);
  });

  it.each([true, false])('hides the editor with Ember ownership %s', async (isEmberOwned) => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    useLocationMock.mockReturnValue({ pathname: '/editor/post/1' });
    useIsEmberOwnedRouteMock.mockReturnValue(isEmberOwned);
    useMatchesMock.mockReturnValue([{ handle: { hideAdminSidebar: true } }]);
    useEmberSidebarVisibilityMock.mockReturnValue(true);

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
