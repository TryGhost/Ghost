import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { matchRoutes } from '@tryghost/admin-x-framework';
import { useAdminSidebarVisibility, useRouteHidesAdminSidebar } from '@/layout/sidebar-visibility';
import { routes, useRoutePattern } from './routes';

const useMatchesMock = vi.fn<() => Array<{ handle: unknown }>>();
const pathnameMock = vi.fn<() => string>();

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useLocation: () => ({ pathname: pathnameMock() }),
  useMatches: () => useMatchesMock(),
}));

function routeHidesAdminSidebar(path: string): boolean {
  const matches = matchRoutes(routes, path) ?? [];
  useMatchesMock.mockReturnValue(
    matches.map((match) => ({ handle: match.route.handle as unknown })),
  );

  return renderHook(() => useRouteHidesAdminSidebar()).result.current;
}

// The search and settings shortcuts stay off exactly where these routes hide the sidebar
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
});

describe('sidebar visibility by route', () => {
  it.each([
    ['/posts', true],
    ['/tags', true],
    ['/pro', true],
    ['/pro/plans', true],
    ['/editor/post/abc123', false],
    ['/settings', false],
  ] as const)('shows sidebar %s: %s', (pathname, visible) => {
    pathnameMock.mockReturnValue(pathname);
    useMatchesMock.mockReturnValue(
      (matchRoutes(routes, pathname) ?? []).map((match) => ({
        handle: match.route.handle as unknown,
      })),
    );

    const { result } = renderHook(() => useAdminSidebarVisibility());

    expect(result.current).toBe(visible);
  });
});

describe('useRoutePattern', () => {
  it.each([
    ['/editor/post/6523f0c0ffee', '/editor/*'],
    ['/tags/news', '/tags/:tagSlug'],
    ['/members/6523f0c0ffee', '/members/:member_id'],
    ['/settings/staff/jamie', '/settings/staff/:slug'],
    ['/posts/analytics/6523f0c0ffee/web', '/posts/analytics/:postId/web'],
    ['/pro/plans', '/pro/*'],
  ])('reports %s as the pattern %s', (pathname, routePattern) => {
    pathnameMock.mockReturnValue(pathname);

    const { result } = renderHook(() => useRoutePattern());

    expect(result.current).toBe(routePattern);
  });

  it('follows the route as it changes', () => {
    pathnameMock.mockReturnValue('/tags');
    const { result, rerender } = renderHook(() => useRoutePattern());
    expect(result.current).toBe('/tags');

    pathnameMock.mockReturnValue('/editor/post/6523f0c0ffee');
    rerender();

    expect(result.current).toBe('/editor/*');
  });
});
