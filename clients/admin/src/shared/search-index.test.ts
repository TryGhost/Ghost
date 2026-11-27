import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { isSearchIndexQuery } from '@tryghost/admin-x-framework/api/search-index';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import {
  parseSearchIndexItems,
  searchIndexQueryKey,
  searchIndexQueryOptions,
  syncSearchIndexes,
  type SearchIndexItem,
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

describe('syncSearchIndexes', () => {
  const listed = {
    id: 'p1',
    title: 'Hello',
    slug: 'hello',
    status: 'draft',
    url: 'https://site.test/p/2b8f/',
    visibility: 'public',
    published_at: null,
  };
  const other = { ...listed, id: 'p2', title: 'Another', slug: 'another' };
  const news = { id: 't1', slug: 'news', name: 'News', url: 'https://site.test/tag/news/' };

  function withLists(lists: Partial<Record<SearchIndexKey, object[]>>) {
    const queryClient = new QueryClient();
    for (const [key, items] of Object.entries(lists)) {
      queryClient.setQueryData(searchIndexQueryKey(key as SearchIndexKey), { [key]: items });
    }
    return queryClient;
  }

  function list(queryClient: QueryClient, key: SearchIndexKey) {
    return queryClient.getQueryData<Partial<Record<SearchIndexKey, SearchIndexItem[]>>>(
      searchIndexQueryKey(key),
    )?.[key];
  }

  it('moves the saved post to the front of its list as the server answered it', () => {
    const queryClient = withLists({ posts: [other, listed] });

    syncSearchIndexes(queryClient, 'posts', {
      ...listed,
      title: 'Hello again',
      uuid: '2b8f',
      lexical: '{}',
    });

    expect(list(queryClient, 'posts')).toEqual([{ ...listed, title: 'Hello again' }, other]);
  });

  it('adds a post the list does not hold yet', () => {
    const queryClient = withLists({ pages: [other] });

    syncSearchIndexes(queryClient, 'pages', listed);

    expect(list(queryClient, 'pages')).toEqual([listed, other]);
  });

  it('keeps the list as it is when the post is already first and unchanged', () => {
    const queryClient = withLists({ posts: [listed, other] });
    const setQueryData = vi.spyOn(queryClient, 'setQueryData');

    syncSearchIndexes(queryClient, 'posts', { ...listed, uuid: '2b8f' });

    expect(setQueryData).not.toHaveBeenCalled();
  });

  it('adds the tags the tags list lacks, such as one the save created', () => {
    const queryClient = withLists({ posts: [listed], tags: [news] });
    const created = {
      id: 't2',
      slug: 'launch',
      name: 'Launch',
      url: 'https://site.test/tag/launch/',
    };

    syncSearchIndexes(queryClient, 'posts', { ...listed, tags: [news, created] });

    expect(list(queryClient, 'tags')).toEqual([created, news]);
  });

  it('leaves the tags list alone when it already holds every tag', () => {
    const queryClient = withLists({ posts: [listed], tags: [news] });
    const before = list(queryClient, 'tags');

    syncSearchIndexes(queryClient, 'posts', { ...listed, tags: [news] });

    expect(list(queryClient, 'tags')).toBe(before);
  });

  it('caches nothing for a list that was never loaded', () => {
    const queryClient = new QueryClient();

    syncSearchIndexes(queryClient, 'posts', { ...listed, tags: [news] });

    expect(queryClient.getQueryState(searchIndexQueryKey('posts'))).toBeUndefined();
    expect(queryClient.getQueryState(searchIndexQueryKey('tags'))).toBeUndefined();
  });

  it('leaves a list already marked to be read again for that read', async () => {
    const queryClient = withLists({ posts: [other] });
    await queryClient.invalidateQueries({ queryKey: searchIndexQueryKey('posts') });

    syncSearchIndexes(queryClient, 'posts', listed);

    expect(list(queryClient, 'posts')).toEqual([other]);
    expect(queryClient.getQueryState(searchIndexQueryKey('posts'))?.isInvalidated).toBe(true);
  });

  function holdReads(queryClient: QueryClient) {
    const reads: Array<(value: unknown) => void> = [];
    const fetchApi = (() =>
      new Promise((resolve) => {
        reads.push(resolve);
      })) as unknown as ReturnType<typeof useFetchApi>;
    const options = { ...searchIndexQueryOptions('posts', fetchApi), staleTime: 0 };
    return { reads, reading: queryClient.fetchQuery(options) };
  }

  it('writes saves into what a read in flight brings back, since that read may predate them', async () => {
    const queryClient = withLists({ posts: [other] });
    const { reads, reading } = holdReads(queryClient);

    syncSearchIndexes(queryClient, 'posts', { ...listed, title: 'Hello again' });
    syncSearchIndexes(queryClient, 'posts', { ...listed, title: 'Hello once more' });
    reads[0]({ posts: [other, listed] });

    // The read is neither cancelled nor repeated.
    await expect(reading).resolves.toBeDefined();
    expect(reads).toHaveLength(1);
    await vi.waitFor(() =>
      expect(list(queryClient, 'posts')).toEqual([{ ...listed, title: 'Hello once more' }, other]),
    );
  });

  it('writes a save into a list whose first read is in flight once that read lands', async () => {
    const queryClient = new QueryClient();
    const { reads, reading } = holdReads(queryClient);

    syncSearchIndexes(queryClient, 'posts', { ...listed, title: 'Hello again' });
    reads[0]({ posts: [other, listed] });
    await reading;

    await vi.waitFor(() =>
      expect(list(queryClient, 'posts')).toEqual([{ ...listed, title: 'Hello again' }, other]),
    );
    expect(reads).toHaveLength(1);
  });
});
