import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { isSearchIndexQuery } from '@tryghost/admin-x-framework/api/search-index';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import {
  parseSearchIndexItems,
  searchIndexQueryKey,
  searchIndexQueryOptions,
  searchIndexesBehind,
  type SearchIndexKey,
} from './search-index';

describe('parseSearchIndexItems', () => {
  it('keeps global-search and link metadata while stripping unknown fields', () => {
    const items = parseSearchIndexItems([
      {
        id: 'p1',
        uuid: 'u-1',
        title: 'Hello',
        slug: 'hello',
        status: 'draft',
        url: 'https://site.test/hello/',
        visibility: 'public',
        published_at: '2026-01-05T10:00:00.000Z',
      },
      { id: 't1', slug: 'news', name: 'News' },
    ]);

    expect(items).toEqual([
      {
        id: 'p1',
        title: 'Hello',
        slug: 'hello',
        status: 'draft',
        url: 'https://site.test/hello/',
        visibility: 'public',
        published_at: '2026-01-05T10:00:00.000Z',
      },
      { id: 't1', slug: 'news', name: 'News' },
    ]);
  });

  it.each([
    ['a missing id', { title: 'Hello' }],
    ['a numeric id', { id: 1, title: 'Hello' }],
    ['a numeric title', { id: 'p1', title: 2024 }],
    ['a null name', { id: 't1', name: null }],
    ['a numeric URL', { id: 'u1', name: 'Jamie', url: 42 }],
    ['an invalid date type', { id: 'p1', title: 'Hello', published_at: [] }],
    ['a non-object entry', 'p1'],
  ])('drops entries with %s', (_description, entry) => {
    expect(parseSearchIndexItems([entry, { id: 'ok', title: 'Kept' }])).toEqual([
      { id: 'ok', title: 'Kept' },
    ]);
  });

  it('returns nothing for a response that is not a list', () => {
    expect(parseSearchIndexItems({ posts: [] })).toEqual([]);
  });
});

describe('searchIndexQueryOptions', () => {
  it('marks the list as a search index, so an edit can leave it out', async () => {
    const queryClient = new QueryClient();
    const fetchApi = (() => Promise.resolve({ posts: [] })) as unknown as ReturnType<
      typeof useFetchApi
    >;

    await queryClient.fetchQuery(searchIndexQueryOptions('posts', fetchApi));

    const query = queryClient.getQueryCache().find({ queryKey: searchIndexQueryKey('posts') });
    expect(query && isSearchIndexQuery(query)).toBe(true);
  });
});

describe('searchIndexesBehind', () => {
  const listed = {
    id: 'p1',
    title: 'Hello',
    slug: 'hello',
    status: 'draft',
    url: 'https://site.test/p/2b8f/',
    visibility: 'public',
    published_at: null,
  };

  function withLists(lists: Partial<Record<SearchIndexKey, object[]>>) {
    const queryClient = new QueryClient();
    for (const [key, items] of Object.entries(lists)) {
      queryClient.setQueryData(searchIndexQueryKey(key as SearchIndexKey), { [key]: items });
    }
    return queryClient;
  }

  it('reports nothing while the cached lists already describe the saved post', () => {
    const queryClient = withLists({ posts: [listed], tags: [{ id: 't1', name: 'News' }] });

    expect(searchIndexesBehind(queryClient, 'posts', { ...listed, tags: [{ id: 't1' }] })).toEqual(
      [],
    );
  });

  it.each([
    ['title', { title: 'Hello again' }],
    ['slug', { slug: 'hello-again' }],
    ['status', { status: 'published' }],
    ['URL', { url: 'https://site.test/hello/' }],
    ['visibility', { visibility: 'members' }],
    ['publish time', { published_at: '2026-01-05T10:00:00.000Z' }],
  ])('reports the posts list when the %s it holds has moved', (_field, changes) => {
    const queryClient = withLists({ posts: [listed] });

    expect(searchIndexesBehind(queryClient, 'posts', { ...listed, ...changes })).toEqual(['posts']);
  });

  it('treats a publish time written another way as the same time', () => {
    const queryClient = withLists({
      posts: [{ ...listed, published_at: '2026-01-05T10:00:00.000Z' }],
    });

    expect(
      searchIndexesBehind(queryClient, 'posts', {
        ...listed,
        published_at: '2026-01-05T10:00:00Z',
      }),
    ).toEqual([]);
  });

  it('reports a list with no entry for the post, and one that is not cached', () => {
    expect(searchIndexesBehind(withLists({ pages: [] }), 'pages', listed)).toEqual(['pages']);
    expect(searchIndexesBehind(withLists({}), 'posts', listed)).toEqual(['posts']);
  });

  it('reports the tags list when the post carries a tag it does not hold', () => {
    const queryClient = withLists({ posts: [listed], tags: [{ id: 't1', name: 'News' }] });

    expect(
      searchIndexesBehind(queryClient, 'posts', { ...listed, tags: [{ id: 't1' }, { id: 't2' }] }),
    ).toEqual(['tags']);
  });

  it('leaves the tags list alone for a post without tags', () => {
    expect(searchIndexesBehind(withLists({ posts: [listed] }), 'posts', listed)).toEqual([]);
    expect(
      searchIndexesBehind(withLists({ posts: [listed] }), 'posts', { ...listed, tags: [] }),
    ).toEqual([]);
  });
});
