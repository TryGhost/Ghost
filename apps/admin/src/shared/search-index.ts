import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { usersDataType } from '@tryghost/admin-x-framework/api/current-user';
import { pagesDataType } from '@tryghost/admin-x-framework/api/pages';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { searchIndexQueryMeta } from '@tryghost/admin-x-framework/api/search-index';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import type { RequestOptions, useFetchApi } from '@tryghost/admin-x-framework/hooks';

const dataTypes = {
  posts: postsDataType,
  pages: pagesDataType,
  tags: 'TagsResponseType',
  users: usersDataType,
};

export type SearchIndexKey = keyof typeof dataTypes;

const searchIndexItemSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  url: z.string().nullable().optional(),
  visibility: z.string().optional(),
  published_at: z.string().nullable().optional(),
});

export type SearchIndexItem = z.output<typeof searchIndexItemSchema>;
type SearchIndexResponse = Partial<Record<SearchIndexKey, SearchIndexItem[]>>;

export function parseSearchIndexItems(items: unknown): SearchIndexItem[] {
  return Array.isArray(items)
    ? items.flatMap((item) => {
        const parsed = searchIndexItemSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
}

/** The cache key of one `search-index/*` list, under its resource's data type. */
export function searchIndexQueryKey(key: SearchIndexKey) {
  return [dataTypes[key], apiUrl(`/search-index/${key}/`)] as const;
}

/**
 * Global search and editor links share these lists. They are cached under their
 * resource's data type, so a mutation that invalidates the resource marks them
 * stale too. Post and page edits are the exception: they leave the lists out,
 * and the editor writes what it saved into them with `syncSearchIndexes`.
 */
export function searchIndexQueryOptions(
  key: SearchIndexKey,
  fetchApi: ReturnType<typeof useFetchApi>,
  requestOptions?: RequestOptions,
) {
  const queryKey = searchIndexQueryKey(key);
  const [, url] = queryKey;
  return {
    queryKey,
    queryFn: async (): Promise<SearchIndexResponse> => {
      const response = await fetchApi<Record<string, unknown>>(url, requestOptions);
      return { [key]: parseSearchIndexItems(response[key]) };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    meta: searchIndexQueryMeta,
  };
}

const SEARCH_INDEX_FIELDS = Object.keys(searchIndexItemSchema.shape) as Array<
  keyof SearchIndexItem
>;

function sameItem(a: SearchIndexItem, b: SearchIndexItem): boolean {
  return SEARCH_INDEX_FIELDS.every((field) => a[field] === b[field]);
}

/**
 * Applies `update` to one cached list, leaving alone a list that is not cached
 * or is already marked to be read again. A read in flight may have been answered
 * before the save, so the update waits for it to land and applies to what it
 * brought, rather than cancelling it or being overwritten by it.
 */
function updateList(
  queryClient: QueryClient,
  key: SearchIndexKey,
  update: (items: SearchIndexItem[]) => SearchIndexItem[],
): void {
  const cache = queryClient.getQueryCache();
  const query = cache.find<SearchIndexResponse>({
    queryKey: searchIndexQueryKey(key),
    exact: true,
  });
  if (!query) {
    return;
  }
  if (query.state.fetchStatus !== 'idle') {
    const unsubscribe = cache.subscribe((event) => {
      if (event.query !== query) {
        return;
      }
      if (event.type === 'removed') {
        unsubscribe();
      } else if (event.type === 'updated' && query.state.fetchStatus === 'idle') {
        unsubscribe();
        // Out of the dispatch that settled the read.
        queueMicrotask(() => updateList(queryClient, key, update));
      }
    });
    return;
  }
  const items = query.state.data?.[key];
  if (!items || query.state.isInvalidated) {
    return;
  }
  const next = update(items);
  if (next !== items) {
    queryClient.setQueryData<SearchIndexResponse>(query.queryKey, { [key]: next });
  }
}

/**
 * Writes a post or page the server has just saved into the cached search-index
 * lists, so global search and editor links show it without reading every post
 * or tag on the site again. Its entry moves to the front of the posts or pages
 * list, and each of its tags the tags list lacks, such as one the save created,
 * is added to the front of that one, as the lists' newest-updated-first order has it.
 */
export function syncSearchIndexes<Saved extends { id: string; tags?: ReadonlyArray<unknown> }>(
  queryClient: QueryClient,
  key: 'posts' | 'pages',
  saved: Saved,
): void {
  const [entry] = parseSearchIndexItems([saved]);
  if (entry) {
    updateList(queryClient, key, (items) => {
      const [first] = items;
      if (first && sameItem(first, entry)) {
        return items;
      }
      return [entry, ...items.filter(({ id }) => id !== entry.id)];
    });
  }

  const tags = parseSearchIndexItems(saved.tags);
  if (tags.length > 0) {
    updateList(queryClient, 'tags', (items) => {
      const listed = new Set(items.map(({ id }) => id));
      const missing = tags.filter(({ id }) => !listed.has(id));
      return missing.length > 0 ? [...missing, ...items] : items;
    });
  }
}
