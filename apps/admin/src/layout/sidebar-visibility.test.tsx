import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useIsMobileMock = vi.fn<() => boolean>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useMatches: () => useMatchesMock(),
}));

vi.mock('@tryghost/shade/utils', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

describe('useAdminSidebarVisibility', () => {
  beforeEach(() => {
    useMatchesMock.mockReturnValue([]);
    useIsMobileMock.mockReturnValue(false);
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

  it('keeps the sidebar visible in Settings on desktop and hides it on mobile', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useMatchesMock.mockReturnValue([{ handle: { settingsSidebar: true } }]);

    const { result, rerender } = renderHook(() => useAdminSidebarVisibility());
    expect(result.current).toBe(true);

    useIsMobileMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe(false);
  });
});
