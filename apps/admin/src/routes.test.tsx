import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchRoutes } from '@tryghost/admin-x-framework';
import { useAdminSidebarVisibility, useRouteHidesAdminSidebar } from '@/layout/sidebar-visibility';
import { matchAdminRoutes, routes, useSyncEmberRoutePattern } from './routes';

const useMatchesMock = vi.fn<() => Array<{ handle: unknown }>>();
const pathnameMock = vi.fn<() => string>();
const routeOwnerMock = vi.fn<() => 'react' | 'ember' | 'pending'>();
const syncEmberRoutePatternMock = vi.fn<(routePattern: string | null) => () => void>();
const useFeatureFlagMock = vi.fn<() => boolean>(() => false);
const useIsMobileMock = vi.fn<() => boolean>(() => false);

vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>()),
  useFeatureFlag: () => useFeatureFlagMock(),
}));

vi.mock('@tryghost/shade/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/shade/utils')>()),
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useLocation: () => ({ pathname: pathnameMock() }),
  useMatches: () => useMatchesMock(),
}));

vi.mock('./ember-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ember-bridge')>()),
  syncEmberRoutePattern: (routePattern: string | null) => syncEmberRoutePatternMock(routePattern),
  useSidebarVisibility: () => false,
}));

vi.mock('./use-flag-gated-route-owner', () => ({
  useFlagGatedRouteOwner: () => routeOwnerMock(),
}));

function routeHidesAdminSidebar(path: string): boolean {
  const matches = matchRoutes(routes, path) ?? [];
  useMatchesMock.mockReturnValue(
    matches.map((match) => ({ handle: match.route.handle as unknown })),
  );

  return renderHook(() => useRouteHidesAdminSidebar()).result.current;
}

beforeEach(() => {
  useFeatureFlagMock.mockReturnValue(false);
  useIsMobileMock.mockReturnValue(false);
});

// Ember's search and settings shortcuts stay off exactly where these routes hide the sidebar
describe('routes', () => {
  it.each([
    '/editor/post/abc123',
    '/settings',
    '/settings/newsletters',
    '/automations/abc123',
    '/migrate/substack',
  ])('hides the admin sidebar on %s', (path) => {
    expect(routeHidesAdminSidebar(path)).toBe(true);
  });

  it('shows the admin sidebar on /posts', () => {
    expect(routeHidesAdminSidebar('/posts')).toBe(false);
  });

  it.each([
    [false, false, true],
    [false, true, true],
    [true, false, false],
    [true, true, true],
  ])(
    'Settings hides the shell with admin7settings %s and mobile %s: %s',
    (enabled, mobile, hidden) => {
      useFeatureFlagMock.mockReturnValue(enabled);
      useIsMobileMock.mockReturnValue(mobile);
      expect(routeHidesAdminSidebar('/settings')).toBe(hidden);
    },
  );
});

describe('sidebar route ownership with stale Ember fullscreen state', () => {
  it.each([
    ['/posts', 'ember', true],
    ['/tags', 'pending', true],
    ['/pro', 'ember', false],
    ['/pro/plans', 'pending', false],
    ['/pro', 'react', true],
    ['/pro/plans', 'react', true],
    ['/editor/post/abc123', 'react', false],
    ['/editor/post/abc123', 'ember', false],
    ['/editor/post/abc123', 'pending', false],
    ['/settings', 'react', false],
  ] as const)('shows sidebar %s with owner %s: %s', (pathname, owner, visible) => {
    pathnameMock.mockReturnValue(pathname);
    routeOwnerMock.mockReturnValue(owner);
    useMatchesMock.mockReturnValue(
      (matchRoutes(routes, pathname) ?? []).map((match) => ({
        handle: match.route.handle as unknown,
      })),
    );

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(visible);
  });
});

describe('useSyncEmberRoutePattern', () => {
  beforeEach(() => {
    routeOwnerMock.mockReturnValue('react');
    syncEmberRoutePatternMock.mockReset();
    syncEmberRoutePatternMock.mockReturnValue(() => {});
  });

  it.each([
    ['/editor/post/6523f0c0ffee', '/editor/*'],
    ['/tags/news', '/tags/:tagSlug'],
    ['/members/6523f0c0ffee', '/members/:member_id'],
    ['/settings/staff/jamie', '/settings/staff/:slug'],
    ['/posts/analytics/6523f0c0ffee/web', '/posts/analytics/:postId/web'],
  ])('publishes %s as the pattern %s', (pathname, routePattern) => {
    pathnameMock.mockReturnValue(pathname);

    renderHook(() => useSyncEmberRoutePattern());

    expect(syncEmberRoutePatternMock).toHaveBeenCalledExactlyOnceWith(routePattern);
  });

  it('publishes the new pattern when the route changes', () => {
    const stopSync = vi.fn();
    syncEmberRoutePatternMock.mockReturnValue(stopSync);
    pathnameMock.mockReturnValue('/tags');
    const { rerender } = renderHook(() => useSyncEmberRoutePattern());

    pathnameMock.mockReturnValue('/editor/post/6523f0c0ffee');
    rerender();

    expect(stopSync).toHaveBeenCalledOnce();
    expect(syncEmberRoutePatternMock.mock.calls).toEqual([['/tags'], ['/editor/*']]);
  });

  it('publishes no pattern while Ember serves the route', () => {
    routeOwnerMock.mockReturnValue('ember');
    pathnameMock.mockReturnValue('/editor/post/6523f0c0ffee');

    renderHook(() => useSyncEmberRoutePattern());

    expect(syncEmberRoutePatternMock).toHaveBeenCalledExactlyOnceWith(null);
  });
});

describe('matchAdminRoutes', () => {
  it.each(['/tags/news', '/settings/newsletters', '/members', '/no-such-route'])(
    'matches %s like matchRoutes, reusing the result',
    (path) => {
      const matches = matchAdminRoutes(path);
      expect(matches?.map((match) => match.route)).toEqual(
        matchRoutes(routes, path)?.map((match) => match.route),
      );
      expect(matchAdminRoutes(path)).toBe(matches);
    },
  );
});
