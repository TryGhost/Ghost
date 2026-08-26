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
    const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
    const { result, rerender } = renderHook(() =>
      useAdminPageChromeClasses({ hasNavigation: true, isEligibleUser: true }),
    );
    expect(result.current).toBe('admin7-page-chrome admin7-typography');

    useLocationMock.mockReturnValue({ pathname: '/editor/post/123' });
    rerender();
    expect(result.current).toBeUndefined();

    useLocationMock.mockReturnValue({ pathname: '/posts' });
    rerender();
    expect(result.current).toBe('admin7-page-chrome admin7-typography');
  });

  it('waits for the resolved theme instead of using the loading light fallback', async () => {
    const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
    useThemeContextMock.mockReturnValue({ resolvedTheme: 'light', isThemeReady: false });
    const { result, rerender } = renderHook(() =>
      useAdminPageChromeClasses({ hasNavigation: true, isEligibleUser: true }),
    );
    expect(result.current).toBeUndefined();

    useThemeContextMock.mockReturnValue({ resolvedTheme: 'dark', isThemeReady: true });
    rerender();
    expect(result.current).toBeUndefined();

    useThemeContextMock.mockReturnValue({ resolvedTheme: 'light', isThemeReady: true });
    rerender();
    expect(result.current).toBe('admin7-page-chrome admin7-typography');
  });

  it('removes and restores the scope when Ember hides and restores navigation', async () => {
    const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
    const { useAdminSidebarVisibility } = await import('./sidebar-visibility');
    const { result, rerender } = renderHook(() =>
      useAdminPageChromeClasses({
        hasNavigation: useAdminSidebarVisibility(),
        isEligibleUser: true,
      }),
    );
    expect(result.current).toBe('admin7-page-chrome admin7-typography');

    useEmberSidebarVisibilityMock.mockReturnValue(false);
    rerender();
    expect(result.current).toBeUndefined();

    useEmberSidebarVisibilityMock.mockReturnValue(true);
    rerender();
    expect(result.current).toBe('admin7-page-chrome admin7-typography');
  });

  it.each(['/settings', '/settings/staff', '/settings/portal/edit'])(
    'gives %s typography without chrome, independent of navigation visibility',
    async (pathname) => {
      const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
      useLocationMock.mockReturnValue({ pathname });
      const { result, rerender } = renderHook(
        ({ hasNavigation }) => useAdminPageChromeClasses({ hasNavigation, isEligibleUser: true }),
        { initialProps: { hasNavigation: false } },
      );
      expect(result.current).toBe('admin7-typography');
      rerender({ hasNavigation: true });
      expect(result.current).toBe('admin7-typography');
    },
  );

  it('requires a loaded eligible user even on Settings', async () => {
    const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
    useLocationMock.mockReturnValue({ pathname: '/settings' });
    const { result, rerender } = renderHook(
      ({ isEligibleUser }) => useAdminPageChromeClasses({ hasNavigation: false, isEligibleUser }),
      { initialProps: { isEligibleUser: false } },
    );
    expect(result.current).toBeUndefined();
    rerender({ isEligibleUser: true });
    expect(result.current).toBe('admin7-typography');
  });

  it.each(['/settings-preview', '/automations/new', '/editor/post'])(
    'does not extend typography to another navigation-hidden route: %s',
    async (pathname) => {
      const { useAdminPageChromeClasses } = await import('./use-admin-page-chrome-classes');
      useLocationMock.mockReturnValue({ pathname });
      const { result } = renderHook(() =>
        useAdminPageChromeClasses({ hasNavigation: false, isEligibleUser: true }),
      );
      expect(result.current).toBeUndefined();
    },
  );
});
