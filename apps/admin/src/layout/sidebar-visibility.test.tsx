import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RouteMatch = {
  handle?: unknown;
};

const useMatchesMock = vi.fn<() => RouteMatch[]>();
const useLocationMock = vi.fn<() => { pathname: string; key?: string }>();
const useEmberSidebarVisibilityMock = vi.fn<() => boolean>();
const useFeatureFlagMock = vi.fn<() => boolean>();
const useIsMobileMock = vi.fn<() => boolean>();
const useThemeContextMock =
  vi.fn<() => { resolvedTheme: 'light' | 'dark'; isThemeReady: boolean }>();
const saveVisibleMock = vi.fn<(visible: boolean) => Promise<void>>();
const navigationMock = vi.fn<() => { data?: { menu: { visible: boolean } } }>();
const toastErrorMock = vi.fn();

vi.mock('./app-sidebar/hooks/use-navigation-preferences', () => ({
  useNavigationPreferences: () => navigationMock(),
  useNavigationMenuVisibility: () => [navigationMock().data?.menu.visible ?? true, saveVisibleMock],
}));
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => {
      toastErrorMock(...args);
    },
  },
}));

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

describe('Admin sidebar controller', () => {
  beforeEach(() => {
    useLocationMock.mockReturnValue({ pathname: '/members', key: 'members' });
    navigationMock.mockReturnValue({ data: { menu: { visible: true } } });
    saveVisibleMock.mockReset().mockResolvedValue(undefined);
    toastErrorMock.mockClear();
  });

  it.each(['/members', '/members/', '/members/import', '/members/import/'])(
    'integrates the Members list header at %s',
    async (pathname) => {
      const { hasAdminSidebarToggle } = await import('./use-admin-sidebar');
      expect(hasAdminSidebarToggle(pathname)).toBe(true);
    },
  );

  it.each(['/members/new', '/members/abc', '/members-activity', '/tags', '/settings'])(
    'keeps navigation open on an unintegrated route: %s',
    async (pathname) => {
      const { useAdminSidebar } = await import('./use-admin-sidebar');
      navigationMock.mockReturnValue({ data: { menu: { visible: false } } });
      useLocationMock.mockReturnValue({ pathname, key: pathname });
      const { result } = renderHook(() => useAdminSidebar(true));
      expect(result.current.enabled).toBe(false);
      expect(result.current.open).toBe(true);
      expect(result.current.animate).toBe(false);
    },
  );

  it('resolves saved visibility without animation and preserves it across excluded modes', async () => {
    const { useAdminSidebar } = await import('./use-admin-sidebar');
    navigationMock.mockReturnValue({});
    const { result, rerender } = renderHook(({ enabled }) => useAdminSidebar(enabled), {
      initialProps: { enabled: true },
    });
    expect(result.current.open).toBe(true);
    expect(result.current.isSaving).toBe(true);
    navigationMock.mockReturnValue({ data: { menu: { visible: false } } });
    rerender({ enabled: true });
    expect(result.current.open).toBe(false);
    expect(result.current.animate).toBe(false);
    rerender({ enabled: false });
    expect(result.current.open).toBe(true);
    rerender({ enabled: true });
    expect(result.current.open).toBe(false);
    expect(saveVisibleMock).not.toHaveBeenCalled();
  });

  it('optimistically toggles once during rapid clicks and rolls back a failed save', async () => {
    const { useAdminSidebar } = await import('./use-admin-sidebar');
    let rejectSave!: (error: Error) => void;
    saveVisibleMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    const { result } = renderHook(() => useAdminSidebar(true));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.setOpen(false);
      void result.current.setOpen(false);
      void result.current.setOpen(true);
    });
    expect(result.current.open).toBe(false);
    expect(result.current.isSaving).toBe(true);
    expect(result.current.animate).toBe(true);
    expect(saveVisibleMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      rejectSave(new Error('Failed'));
      await pending;
    });
    expect(result.current.open).toBe(true);
    expect(result.current.animate).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Couldn't save sidebar preference. Please try again.",
    );
  });

  it('keeps the toggle callback stable through preference refreshes and saving bookkeeping', async () => {
    const { useAdminSidebar } = await import('./use-admin-sidebar');
    let resolveSave!: () => void;
    saveVisibleMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { result, rerender } = renderHook(() => useAdminSidebar(true));
    const initialToggle = result.current.setOpen;
    navigationMock.mockReturnValue({ data: { menu: { visible: true } } });
    rerender();
    expect(result.current.setOpen).toBe(initialToggle);

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.setOpen(false);
    });
    const closingToggle = result.current.setOpen;
    navigationMock.mockReturnValue({ data: { menu: { visible: false } } });
    rerender();
    expect(result.current.setOpen).toBe(closingToggle);
    await act(async () => {
      resolveSave();
      await pending;
    });
    expect(result.current.setOpen).toBe(closingToggle);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.setOpen).toBe(closingToggle);
    expect(result.current.open).toBe(false);
  });

  it('stops explicit motion on navigation and resize, without changing the saved choice', async () => {
    const { useAdminSidebar } = await import('./use-admin-sidebar');
    const { result, rerender } = renderHook(() => useAdminSidebar(true));
    await act(async () => result.current.setOpen(false));
    expect(result.current.animate).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.animate).toBe(false);
    expect(result.current.open).toBe(false);
    await act(async () => result.current.setOpen(true));
    expect(result.current.animate).toBe(true);
    useLocationMock.mockReturnValue({ pathname: '/members', key: 'filtered-members' });
    rerender();
    expect(result.current.animate).toBe(false);
    expect(result.current.open).toBe(true);
  });

  it('waits for actual motion completion and ignores a cancelled earlier toggle', async () => {
    vi.useFakeTimers();
    try {
      const { useAdminSidebar } = await import('./use-admin-sidebar');
      const { result } = renderHook(() => useAdminSidebar(true));
      let cancelClosing!: (reason: Error) => void;
      let finishOpening!: () => void;
      const closing = new Promise<void>((_resolve, reject) => {
        cancelClosing = reject;
      });
      const opening = new Promise<void>((resolve) => {
        finishOpening = resolve;
      });
      const gap = document.createElement('div');
      gap.dataset.sidebar = 'gap';
      const getAnimations = vi.fn().mockReturnValue([{ finished: closing }]);
      Object.defineProperty(gap, 'getAnimations', { value: getAnimations });
      const layout = document.createElement('div');
      layout.append(gap);
      result.current.layoutRef.current = layout;
      await act(async () => result.current.setOpen(false));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      // Elapsed wall time cannot tell us whether a browser transition finished.
      expect(result.current.animate).toBe(true);
      getAnimations.mockReturnValue([{ finished: opening }]);
      await act(async () => result.current.setOpen(true));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16);
        cancelClosing(new Error('Reversed'));
      });
      expect(result.current.animate).toBe(true);
      await act(async () => {
        finishOpening();
        await opening;
      });
      expect(result.current.animate).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles motion without a timer when there are no browser animations', async () => {
    vi.useFakeTimers();
    try {
      const { useAdminSidebar } = await import('./use-admin-sidebar');
      const { result } = renderHook(() => useAdminSidebar(true));
      await act(async () => result.current.setOpen(false));
      expect(result.current.animate).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16);
      });
      expect(result.current.animate).toBe(false);
      expect(result.current.open).toBe(false);
    } finally {
      vi.useRealTimers();
    }
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
