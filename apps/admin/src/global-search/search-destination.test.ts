import { describe, expect, it } from 'vitest';
import { getSearchDestination } from './search-destination';
import type { SearchResult } from './searchables';

const result = (overrides: Partial<SearchResult>): SearchResult => ({
  id: 'post.p1',
  title: 'Title',
  groupName: 'Posts',
  ...overrides,
});

describe('getSearchDestination', () => {
  it.each([
    ['post.p1', '/editor/post/p1'],
    ['page.g1', '/editor/page/g1'],
    ['user.jamie-larson', '/settings/staff/jamie-larson'],
    ['tag.news', '/tags/news'],
  ])('sends %s to %s', (id, path) => {
    expect(getSearchDestination(result({ id }))).toEqual({ path });
  });

  it('routes by model, not by the group name a host may configure', () => {
    expect(getSearchDestination(result({ id: 'tag.posts', groupName: 'Posts' }))).toEqual({
      path: '/tags/posts',
    });
  });

  it('sends billing results to their billing app route', () => {
    expect(
      getSearchDestination(
        result({ id: 'pro-page.plans', groupName: 'Posts', groupKey: 'billing', path: '/plans' }),
      ),
    ).toEqual({ path: '/pro/plans', billingSubRoute: '/plans' });
  });

  it('sends the billing app root to the billing route itself', () => {
    expect(
      getSearchDestination(result({ id: 'pro-page.home', groupKey: 'billing', path: '/' })),
    ).toEqual({ path: '/pro', billingSubRoute: '/' });
  });

  it('has no destination for an unknown model', () => {
    expect(getSearchDestination(result({ id: 'member.m1' }))).toBeNull();
  });
});
