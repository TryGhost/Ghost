import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useEmberSidebarVisibilityMock = vi.fn<() => boolean>();
const useFlagGatedRouteOwnerMock = vi.fn<(flag: string) => 'react' | 'ember' | 'pending'>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useMatches: () => useMatchesMock(),
}));

vi.mock('@/ember-bridge', () => ({
  useSidebarVisibility: () => useEmberSidebarVisibilityMock(),
}));

vi.mock('@/use-flag-gated-route-owner', () => ({
  useFlagGatedRouteOwner: (flag: string) => useFlagGatedRouteOwnerMock(flag),
}));

describe('useAdminSidebarVisibility', () => {
  beforeEach(() => {
    useMatchesMock.mockReturnValue([]);
    useEmberSidebarVisibilityMock.mockReturnValue(true);
    useFlagGatedRouteOwnerMock.mockReturnValue('ember');
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

  it('lets Ember reveal the sidebar while leaving an Ember-owned editor for an Ember list', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useMatchesMock.mockReturnValue([
      {
        handle: {
          allowEmberSidebarControl: true,
          hideAdminSidebar: true,
        },
      },
    ]);

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(true);
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
