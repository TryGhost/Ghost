import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { matchRoutes } from '@tryghost/admin-x-framework';
import { useRouteHidesAdminSidebar } from '@/layout/sidebar-visibility';
import { routes } from './routes';

const useMatchesMock = vi.fn<() => Array<{ handle: unknown }>>();

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useMatches: () => useMatchesMock(),
}));

function routeHidesAdminSidebar(path: string): boolean {
  const matches = matchRoutes(routes, path) ?? [];
  useMatchesMock.mockReturnValue(
    matches.map((match) => ({ handle: match.route.handle as unknown })),
  );

  return renderHook(() => useRouteHidesAdminSidebar()).result.current;
}

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
});
