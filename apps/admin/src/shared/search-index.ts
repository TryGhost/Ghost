import { z } from 'zod';
import { usersDataType } from '@tryghost/admin-x-framework/api/current-user';
import { pagesDataType } from '@tryghost/admin-x-framework/api/pages';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
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

/** Global search and editor links share lists that resource mutations update in place. */
export function searchIndexQueryOptions(
  key: SearchIndexKey,
  fetchApi: ReturnType<typeof useFetchApi>,
  requestOptions?: RequestOptions,
) {
  const url = apiUrl(`/search-index/${key}/`);
  return {
    queryKey: [dataTypes[key], url],
    queryFn: async (): Promise<SearchIndexResponse> => {
      const response = await fetchApi<Record<string, unknown>>(url, requestOptions);
      return { [key]: parseSearchIndexItems(response[key]) };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  };
}
