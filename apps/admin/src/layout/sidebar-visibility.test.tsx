import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useFeatureFlagMock = vi.fn<() => boolean>();
const useIsMobileMock = vi.fn<() => boolean>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useMatches: () => useMatchesMock(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => useFeatureFlagMock(),
}));

vi.mock('@tryghost/shade/utils', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

describe('useAdminSidebarVisibility', () => {
  beforeEach(() => {
    useMatchesMock.mockReturnValue([]);
    useFeatureFlagMock.mockReturnValue(false);
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

  it('uses the Settings sidebar on desktop only when admin7settings is enabled', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');

    useMatchesMock.mockReturnValue([{ handle: { settingsSidebar: true } }]);

    const { result, rerender } = renderHook(() => useAdminSidebarVisibility());
    expect(result.current).toBe(false);

    useFeatureFlagMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe(true);

    useIsMobileMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe(false);
  });
});
