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

/**
 * Applies `update` to one cached list, leaving alone a list that is not cached
 * or is already marked to be read again. A list with a read in flight may get
 * back the version from before the save, so it is read again instead.
 */
function updateList(
  queryClient: QueryClient,
  key: SearchIndexKey,
  update: (items: SearchIndexItem[]) => SearchIndexItem[],
): void {
  const queryKey = searchIndexQueryKey(key);
  const state = queryClient.getQueryState<SearchIndexResponse>(queryKey);
  if (!state) {
    return;
  }
  if (state.fetchStatus !== 'idle') {
    void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'all' });
    return;
  }
  const items = state.data?.[key];
  if (!items || state.isInvalidated) {
    return;
  }
  const next = update(items);
  if (next !== items) {
    queryClient.setQueryData<SearchIndexResponse>(queryKey, { [key]: next });
  }
}

/**
 * Writes a post or page the server has just saved into the cached search-index
 * lists, so global search and editor links show it without reading every post
 * or tag on the site again. Its entry moves to the front of the posts or pages
 * list, where the list's newest-updated-first order puts a save, and each of its
 * tags the tags list lacks, such as one the save created, is added.
 */
export function syncSearchIndexes(
  queryClient: QueryClient,
  key: 'posts' | 'pages',
  saved: { id: string; tags?: ReadonlyArray<unknown> },
): void {
  const [entry] = parseSearchIndexItems([saved]);
  if (entry) {
    updateList(queryClient, key, (items) => {
      const [first] = items;
      if (first && JSON.stringify(first) === JSON.stringify(entry)) {
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
      return missing.length > 0 ? [...items, ...missing] : items;
    });
  }
}
