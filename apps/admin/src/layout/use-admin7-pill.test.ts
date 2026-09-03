import { describe, expect, it } from 'vitest';

import { isAdmin7PillApprovedRoute } from './use-admin7-pill';

describe('isAdmin7PillApprovedRoute', () => {
  it.each([
    { pathname: '/members', expected: true },
    { pathname: '/members/', expected: true },
    { pathname: '/members/import', expected: true },
    { pathname: '/members/import/', expected: true },
    { pathname: '/members/507f1f77bcf86cd799439011', expected: true },
    { pathname: '/members/507f1f77bcf86cd799439011/', expected: true },
    { pathname: '/members/new', expected: false },
    { pathname: '/members/123', expected: false },
    { pathname: '/members/507f1f77bcf86cd799439011/extra', expected: false },
    { pathname: '/tags', expected: true },
    { pathname: '/tags/', expected: true },
    { pathname: '/tags/new', expected: false },
    { pathname: '/tags/new/', expected: false },
    { pathname: '/tags/example', expected: true },
    { pathname: '/tags/example/', expected: true },
    { pathname: '/tags/example/extra', expected: false },
    { pathname: '/comments', expected: true },
    { pathname: '/comments/', expected: true },
    { pathname: '/comments/thread', expected: false },
    { pathname: '/settings/comments', expected: false },
    { pathname: '/editor', expected: false },
    { pathname: '/editor/post/example', expected: false },
  ])('returns $expected for $pathname', ({ pathname, expected }) => {
    expect(isAdmin7PillApprovedRoute(pathname)).toBe(expected);
  });
});
