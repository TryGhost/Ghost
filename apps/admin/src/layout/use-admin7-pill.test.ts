import { describe, expect, it } from 'vitest';

import { isAdmin7PillAllowedRoute } from './use-admin7-pill';

describe('isAdmin7PillAllowedRoute', () => {
  it.each([
    { pathname: '/members', expected: true },
    { pathname: '/settings', expected: true },
    { pathname: '/settings/comments', expected: true },
    { pathname: '/editorial', expected: true },
    { pathname: '/editor', expected: false },
    { pathname: '/editor/post/example', expected: false },
  ])('returns $expected for $pathname', ({ pathname, expected }) => {
    expect(isAdmin7PillAllowedRoute(pathname)).toBe(expected);
  });
});
