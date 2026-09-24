import { describe, expect, it } from 'vitest';
import {
  BILLING_SEARCH_GROUP_KEY,
  type SearchResult,
  createSearchResult,
  getSearchables,
  sortSearchResultsByStatus,
} from './searchables';

const billingItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'change-plan',
  title: 'Change plan',
  path: '/plans',
  keywords: 'billing subscription',
  ...overrides,
});

const withBillingSearch = (search: unknown) => ({ billing: { search } });

describe('getSearchables', () => {
  it('returns the built-in groups in display order', () => {
    expect(getSearchables().map((searchable) => searchable.name)).toEqual([
      'Staff',
      'Tags',
      'Posts',
      'Pages',
    ]);
  });

  it('places a configured billing group between tags and posts', () => {
    const searchables = getSearchables(
      withBillingSearch({ groupName: 'Acme Hosting', items: [billingItem()] }),
    );

    expect(searchables.map((searchable) => searchable.name)).toEqual([
      'Staff',
      'Tags',
      'Acme Hosting',
      'Posts',
      'Pages',
    ]);
    expect(searchables[2]).toMatchObject({
      key: BILLING_SEARCH_GROUP_KEY,
      model: 'pro-page',
      index: ['title', 'keywords'],
      staticItems: [billingItem()],
    });
  });

  it('trims the billing group name', () => {
    const [, , billing] = getSearchables(
      withBillingSearch({ groupName: '  Acme Hosting  ', items: [billingItem()] }),
    );

    expect(billing.name).toBe('Acme Hosting');
  });

  it.each([
    ['no search config', undefined],
    ['a non-object search config', 'Acme Hosting'],
    ['a missing group name', { items: [billingItem()] }],
    ['a blank group name', { groupName: '   ', items: [billingItem()] }],
    ['a built-in group name', { groupName: 'Posts', items: [billingItem()] }],
    ['no items', { groupName: 'Acme Hosting', items: [] }],
    ['a non-array items value', { groupName: 'Acme Hosting', items: billingItem() }],
  ])('omits the billing group for %s', (_description, search) => {
    const names = getSearchables(withBillingSearch(search)).map((searchable) => searchable.name);

    expect(names).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
  });

  it.each([
    ['an absolute URL', { path: 'https://example.com' }],
    ['a relative path', { path: 'plans' }],
    ['a query string', { path: '/plans?intent=upgrade' }],
    ['a fragment', { path: '/plans#top' }],
    ['whitespace', { path: '/my plans' }],
    ['a trailing slash', { path: '/support/' }],
    ['a missing id', { id: '' }],
    ['a missing title', { title: undefined }],
  ])('drops configured items with %s', (_description, overrides) => {
    const [, , billing] = getSearchables(
      withBillingSearch({
        groupName: 'Acme Hosting',
        items: [billingItem({ id: 'valid', title: 'Valid' }), billingItem(overrides)],
      }),
    );

    expect(billing.staticItems?.map((item) => item.id)).toEqual(['valid']);
  });

  it('keeps the billing app root path', () => {
    const [, , billing] = getSearchables(
      withBillingSearch({ groupName: 'Acme Hosting', items: [billingItem({ path: '/' })] }),
    );

    expect(billing.staticItems?.[0].path).toBe('/');
  });

  it('strips unknown fields and defaults non-string keywords to an empty string', () => {
    const [, , billing] = getSearchables(
      withBillingSearch({
        groupName: 'Acme Hosting',
        items: [billingItem({ keywords: ['billing'], extra: 'ignored' })],
      }),
    );

    expect(billing.staticItems).toEqual([
      { id: 'change-plan', title: 'Change plan', path: '/plans', keywords: '' },
    ]);
  });
});

describe('createSearchResult', () => {
  const [staff, tags, posts] = getSearchables();

  it('identifies staff and tags by slug', () => {
    const item = { id: 'u1', slug: 'jamie', name: 'Jamie', url: 'https://site.test/author/jamie/' };

    expect(createSearchResult(staff, item)).toMatchObject({
      id: 'user.jamie',
      title: 'Jamie',
      url: 'https://site.test/author/jamie/',
      groupName: 'Staff',
    });
    expect(createSearchResult(tags, { id: 't1', slug: 'news', name: 'News' }).id).toBe('tag.news');
  });

  it('identifies posts by id and carries their publishing fields', () => {
    const result = createSearchResult(posts, {
      id: 'p1',
      slug: 'hello',
      title: 'Hello',
      status: 'published',
      visibility: 'members',
      published_at: '2024-05-08T16:21:07.000Z',
    });

    expect(result).toEqual({
      id: 'post.p1',
      url: undefined,
      path: undefined,
      title: 'Hello',
      keywords: undefined,
      groupName: 'Posts',
      groupKey: undefined,
      status: 'published',
      visibility: 'members',
      publishedAt: '2024-05-08T16:21:07.000Z',
    });
  });
});

describe('sortSearchResultsByStatus', () => {
  const result = (title: string, status?: string): SearchResult => ({
    id: title,
    title,
    status,
    groupName: 'Posts',
  });

  it('orders posts and pages scheduled, draft, published, sent, then anything else', () => {
    const results = [
      result('other', 'unknown'),
      result('sent', 'sent'),
      result('published', 'published'),
      result('draft', 'draft'),
      result('scheduled', 'scheduled'),
    ];

    for (const model of ['post', 'page'] as const) {
      expect(sortSearchResultsByStatus(results, model).map(({ title }) => title)).toEqual([
        'scheduled',
        'draft',
        'published',
        'sent',
        'other',
      ]);
    }
  });

  it('keeps the incoming order within a status', () => {
    const results = [result('b', 'draft'), result('a', 'draft')];

    expect(sortSearchResultsByStatus(results, 'post').map(({ title }) => title)).toEqual([
      'b',
      'a',
    ]);
  });

  it('leaves other models in their incoming order', () => {
    const results = [result('published', 'published'), result('draft', 'draft')];

    expect(sortSearchResultsByStatus(results, 'tag')).toBe(results);
  });
});
