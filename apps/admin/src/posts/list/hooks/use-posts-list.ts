import {
  BUCKET_ORDER,
  getActiveBuckets,
  getBucketSearchParams,
} from '@/posts/list/post-query-params';
import {
  composePostBuckets,
  type ComposedPostList,
  type PostBucketResult,
} from '@/posts/list/compose-post-buckets';
import { keepPreviousData } from '@tanstack/react-query';
import { useBrowsePagesInfinite } from '@tryghost/admin-x-framework/api/pages';
import { useBrowsePostsInfinite } from '@tryghost/admin-x-framework/api/posts';
import type { Page } from '@tryghost/admin-x-framework/api/pages';
import type { Post } from '@tryghost/admin-x-framework/api/posts';
import type { PostBucket, PostFilterContext, PostListParams } from '@/posts/list/post-query-params';
import type { PostResource } from '@/posts/list/post-resource';

/** A row in the list. Pages are posts with a different `displayName`. */
export type PostListItem = Post | Page;

export interface UsePostsListOptions {
  resource: PostResource;
  params: PostListParams;
  context?: PostFilterContext;
}

export type UsePostsListReturn = ComposedPostList<PostListItem>;

/**
 * Runs one bucket's query.
 *
 * Both resource hooks are called on every render and gated by `enabled`,
 * rather than picking one - a hook chosen at runtime would break the rules of
 * hooks. The disabled one never fetches.
 */
function useBucketQuery(
  bucket: PostBucket,
  { resource, params, context }: UsePostsListOptions,
  enabled: boolean,
): PostBucketResult<PostListItem> {
  const searchParams = getBucketSearchParams(bucket, params, context);

  // keepPreviousData so changing a filter doesn't blank the list first.
  const postsQuery = useBrowsePostsInfinite({
    searchParams,
    enabled: enabled && resource === 'posts',
    placeholderData: keepPreviousData,
  });

  const pagesQuery = useBrowsePagesInfinite({
    searchParams,
    enabled: enabled && resource === 'pages',
    placeholderData: keepPreviousData,
  });

  const query = resource === 'pages' ? pagesQuery : postsQuery;
  const items: PostListItem[] =
    (resource === 'pages' ? pagesQuery.data?.pages : postsQuery.data?.posts) ?? [];

  return {
    bucket,
    items,
    total: query.data?.meta?.pagination.total ?? 0,
    hasNextPage: query.hasNextPage,
    // A disabled bucket is not loading, it is simply not wanted; treating
    // it as loading would hold the whole list forever.
    isLoading: enabled && query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

/**
 * The posts/pages list, assembled from up to three per-status queries.
 *
 * See `compose-post-buckets.ts` for why there are three and how they sequence.
 */
export function usePostsList(options: UsePostsListOptions): UsePostsListReturn {
  const activeBuckets = getActiveBuckets(options.params);

  // Hook order has to be stable, so every bucket is queried and the ones the
  // current filter doesn't need are disabled.
  const scheduled = useBucketQuery('scheduled', options, activeBuckets.includes('scheduled'));
  const draft = useBucketQuery('draft', options, activeBuckets.includes('draft'));
  const publishedAndSent = useBucketQuery(
    'publishedAndSent',
    options,
    activeBuckets.includes('publishedAndSent'),
  );

  const byBucket: Record<PostBucket, PostBucketResult<PostListItem>> = {
    scheduled,
    draft,
    publishedAndSent,
  };

  return composePostBuckets(
    BUCKET_ORDER.filter((bucket) => activeBuckets.includes(bucket)).map(
      (bucket) => byBucket[bucket],
    ),
  );
}
