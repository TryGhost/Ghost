import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchRoutes } from '@tryghost/admin-x-framework';
import { useIsEmberOwnedRoute } from './routes';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tryghost/admin-x-framework')>();
  return { ...actual, matchRoutes: vi.fn(actual.matchRoutes) };
});

vi.mock('./use-flag-gated-route-owner', () => ({
  useFlagGatedRouteOwner: vi.fn(),
}));

describe('useIsEmberOwnedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFlagGatedRouteOwner).mockReturnValue('ember');
  });

  it('reuses the route match on rerenders and recomputes when the destination changes', () => {
    const { result, rerender } = renderHook(({ path }) => useIsEmberOwnedRoute(path), {
      initialProps: { path: '/members' },
    });
    expect(result.current).toBe(false);
    expect(matchRoutes).toHaveBeenCalledTimes(1);

    rerender({ path: '/members' });
    rerender({ path: '/members' });
    expect(matchRoutes).toHaveBeenCalledTimes(1);

    rerender({ path: '/posts' });
    expect(result.current).toBe(true);
    expect(matchRoutes).toHaveBeenCalledTimes(2);
  });

  it('keeps feature-flag ownership reactive without rematching an unchanged destination', () => {
    vi.mocked(useFlagGatedRouteOwner).mockReturnValue('pending');
    const { result, rerender } = renderHook(() => useIsEmberOwnedRoute('/tags/news'));
    expect(result.current).toBe(true);

    vi.mocked(useFlagGatedRouteOwner).mockReturnValue('react');
    rerender();
    expect(result.current).toBe(false);

    vi.mocked(useFlagGatedRouteOwner).mockReturnValue('ember');
    rerender();
    expect(result.current).toBe(true);
    expect(matchRoutes).toHaveBeenCalledTimes(1);
  });
});
