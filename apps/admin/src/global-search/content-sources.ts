import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFetchApi, useHandleError } from '@tryghost/admin-x-framework/hooks';
import {
  type SearchIndexItem,
  type SearchIndexKey,
  searchIndexQueryOptions,
} from '@/shared/search-index';
import type { SearchItem, SearchSource, SearchSourceContext } from './search-source';

/**
 * Loads one `search-index/*` list. It's keyed under the resource's data type, so
 * the invalidation that follows most saves marks it stale too; a post or page
 * edit writes the saved entry into it instead.
 */
function useSearchIndex(key: SearchIndexKey, enabled: boolean) {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();
  const options = searchIndexQueryOptions(key, fetchApi);

  const { data, isLoading, isFetching, isStale } = useQuery({
    ...options,
    queryFn: async () => {
      try {
        return await options.queryFn();
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled,
  });

  // a refetch after invalidation would otherwise serve removed or renamed content
  return { entries: data?.[key], isLoading: isLoading || (isFetching && isStale) };
}

const STATUS_PRIORITY: Record<string, number> = {
  scheduled: 1,
  draft: 2,
  published: 3,
  sent: 4,
};

/** Scheduled, then draft, published, sent, then anything else. */
export function compareByStatus(a: SearchItem, b: SearchItem) {
  const priority = (item: SearchItem) => STATUS_PRIORITY[item.status ?? ''] ?? 5;
  return priority(a) - priority(b);
}

const route = (base: string, key = '') => `${base}/${encodeURIComponent(key)}`;

const CONTENT_SOURCES = {
  users: {
    heading: 'Staff',
    toItem: (user: SearchIndexItem): SearchItem => ({
      kind: 'navigate',
      id: user.slug ?? '',
      title: user.name ?? '',
      to: route('/settings/staff', user.slug),
    }),
  },
  tags: {
    heading: 'Tags',
    toItem: (tag: SearchIndexItem): SearchItem => ({
      kind: 'navigate',
      id: tag.slug ?? '',
      title: tag.name ?? '',
      to: route('/tags', tag.slug),
    }),
  },
  posts: {
    heading: 'Posts',
    compare: compareByStatus,
    toItem: (post: SearchIndexItem): SearchItem => ({
      kind: 'navigate',
      id: post.id,
      title: post.title ?? '',
      status: post.status,
      to: route('/editor/post', post.id),
    }),
  },
  pages: {
    heading: 'Pages',
    compare: compareByStatus,
    toItem: (page: SearchIndexItem): SearchItem => ({
      kind: 'navigate',
      id: page.id,
      title: page.title ?? '',
      status: page.status,
      to: route('/editor/page', page.id),
    }),
  },
} satisfies Record<
  SearchIndexKey,
  {
    heading: string;
    compare?: SearchSource['compare'];
    toItem: (entry: SearchIndexItem) => SearchItem;
  }
>;

export const CONTENT_HEADINGS = Object.values(CONTENT_SOURCES).map(({ heading }) => heading);

export function contentSearchSource(
  key: SearchIndexKey,
  entries: SearchIndexItem[] = [],
  isLoading = false,
): SearchSource {
  const { heading, toItem, ...rest } = CONTENT_SOURCES[key];
  return { id: key, heading, items: entries.map(toItem), isLoading, ...rest };
}

/** Staff, tags, posts or pages. The list loads on the first non-blank term. */
export function useContentSearchSource(
  key: SearchIndexKey,
  { enabled }: SearchSourceContext,
): SearchSource {
  const { entries, isLoading } = useSearchIndex(key, enabled);
  return useMemo(() => contentSearchSource(key, entries, isLoading), [key, entries, isLoading]);
}
