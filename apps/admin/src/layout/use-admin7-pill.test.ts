import { describe, expect, it } from 'vitest';

import { isAdmin7PillApprovedRoute } from './use-admin7-pill';

describe('isAdmin7PillApprovedRoute', () => {
  it.each([
    { pathname: '/members', expected: true },
    { pathname: '/members/', expected: true },
    { pathname: '/members/import', expected: true },
    { pathname: '/members/import/', expected: true },
    { pathname: '/members/123', expected: false },
    { pathname: '/tags', expected: false },
    { pathname: '/editor', expected: false },
    { pathname: '/editor/post/example', expected: false },
  ])('returns $expected for $pathname', ({ pathname, expected }) => {
    expect(isAdmin7PillApprovedRoute(pathname)).toBe(expected);
  });
});
