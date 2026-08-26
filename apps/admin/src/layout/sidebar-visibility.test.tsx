import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useLocationMock = vi.fn<() => { pathname: string }>();
const useEmberSidebarVisibilityMock = vi.fn<() => boolean>();
const useFeatureFlagMock = vi.fn<() => boolean>();
const useIsMobileMock = vi.fn<() => boolean>();
const useThemeContextMock =
  vi.fn<() => { resolvedTheme: 'light' | 'dark'; isThemeReady: boolean }>();

vi.mock('@tryghost/admin-x-framework', () => ({
  useMatches: () => useMatchesMock(),
  useLocation: () => useLocationMock(),
}));

vi.mock('@/ember-bridge', () => ({
  useSidebarVisibility: () => useEmberSidebarVisibilityMock(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => useFeatureFlagMock(),
}));

vi.mock('@tryghost/shade/utils', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock('@/providers/theme-context', () => ({
  useThemeContext: () => useThemeContextMock(),
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

  it('updates on React route and Ember visibility transitions', async () => {
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    const { result, rerender } = renderHook(() => useAdminSidebarVisibility());
    expect(result.current).toBe(true);

    useMatchesMock.mockReturnValue([{ handle: { hideAdminSidebar: true } }]);
    rerender();
    expect(result.current).toBe(false);

    useMatchesMock.mockReturnValue([]);
    useEmberSidebarVisibilityMock.mockReturnValue(false);
    rerender();
    expect(result.current).toBe(false);

    useEmberSidebarVisibilityMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe(true);
  });
});

describe('Admin page chrome scope', () => {
  beforeEach(() => {
    useLocationMock.mockReturnValue({ pathname: '/posts' });
    useFeatureFlagMock.mockReturnValue(true);
    useIsMobileMock.mockReturnValue(false);
    useThemeContextMock.mockReturnValue({ resolvedTheme: 'light', isThemeReady: true });
    useMatchesMock.mockReturnValue([]);
    useEmberSidebarVisibilityMock.mockReturnValue(true);
  });

  it('excludes editor navigation before the Ember visibility update arrives', async () => {
    const { useAdminPageChromeClass } = await import('./use-admin-page-chrome-class');
    const { result, rerender } = renderHook(() => useAdminPageChromeClass(true));
    expect(result.current).toBe('admin7-page-chrome');

    useLocationMock.mockReturnValue({ pathname: '/editor/post/123' });
    rerender();
    expect(result.current).toBeUndefined();

    useLocationMock.mockReturnValue({ pathname: '/posts' });
    rerender();
    expect(result.current).toBe('admin7-page-chrome');
  });

  it('waits for the resolved theme instead of using the loading light fallback', async () => {
    const { useAdminPageChromeClass } = await import('./use-admin-page-chrome-class');
    useThemeContextMock.mockReturnValue({ resolvedTheme: 'light', isThemeReady: false });
    const { result, rerender } = renderHook(() => useAdminPageChromeClass(true));
    expect(result.current).toBeUndefined();

    useThemeContextMock.mockReturnValue({ resolvedTheme: 'dark', isThemeReady: true });
    rerender();
    expect(result.current).toBeUndefined();

    useThemeContextMock.mockReturnValue({ resolvedTheme: 'light', isThemeReady: true });
    rerender();
    expect(result.current).toBe('admin7-page-chrome');
  });

  it('removes and restores the scope when Ember hides and restores navigation', async () => {
    const { useAdminPageChromeClass } = await import('./use-admin-page-chrome-class');
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    const { result, rerender } = renderHook(() =>
      useAdminPageChromeClass(useAdminSidebarVisibility()),
    );
    expect(result.current).toBe('admin7-page-chrome');

    useEmberSidebarVisibilityMock.mockReturnValue(false);
    rerender();
    expect(result.current).toBeUndefined();

    useEmberSidebarVisibilityMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe('admin7-page-chrome');
  });
});
