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

/** Global search and editor links share lists that resource mutations update in place. */
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

/** What a posts or pages list entry holds about its post besides the id. */
const LISTED_FIELDS = ['title', 'slug', 'status', 'url', 'visibility', 'published_at'] as const;

type ListedField = (typeof LISTED_FIELDS)[number];

/** A saved post or page, as far as the search-index lists describe it. */
export type ListedRecord = { id: string; tags?: ReadonlyArray<{ id: string }> } & Partial<
  Record<ListedField, string | null>
>;

function sameListedValue(field: ListedField, listed: string | null, saved: string | null) {
  if (field === 'published_at' && listed !== null && saved !== null) {
    return Date.parse(listed) === Date.parse(saved);
  }
  return listed === saved;
}

function cachedItems(queryClient: QueryClient, key: SearchIndexKey) {
  return queryClient.getQueryData<SearchIndexResponse>(searchIndexQueryKey(key))?.[key];
}

/**
 * The search-index lists that no longer describe a post or page as the server
 * has just saved it: its own list when its entry is missing or holds another
 * value, and the tags list when one of its tags is missing, as a tag the save
 * created is. A list that is not cached is reported as well, so a first read
 * still in flight cannot keep the version from before the save.
 */
export function searchIndexesBehind(
  queryClient: QueryClient,
  key: 'posts' | 'pages',
  saved: ListedRecord,
): SearchIndexKey[] {
  const behind: SearchIndexKey[] = [];

  const entry = cachedItems(queryClient, key)?.find(({ id }) => id === saved.id);
  const entryMatches =
    !!entry &&
    LISTED_FIELDS.every((field) =>
      sameListedValue(field, entry[field] ?? null, saved[field] ?? null),
    );
  if (!entryMatches) {
    behind.push(key);
  }

  const tags = cachedItems(queryClient, 'tags');
  const listedTags = new Set(tags?.map(({ id }) => id));
  if (saved.tags?.some(({ id }) => !tags || !listedTags.has(id))) {
    behind.push('tags');
  }

  return behind;
}
