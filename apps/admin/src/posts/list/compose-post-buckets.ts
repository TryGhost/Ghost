import type {PostBucket} from './post-query-params';

/**
 * Assembles the three per-status queries into the single list the screen
 * renders.
 *
 * Ported from the sequenced infinity loaders in
 * `apps/ember-admin/app/templates/posts.hbs`. All three queries run from the
 * start; what is sequenced is *rendering*. A bucket only becomes visible once
 * every earlier bucket has loaded every page, so the list reads scheduled,
 * then drafts, then published/sent - with each bucket internally sorted by its
 * own default (drafts by `updated_at`, the rest by `published_at`).
 *
 * Pure so the ordering rules can be tested without mocking queries.
 */

export interface PostBucketResult<TItem> {
    bucket: PostBucket;
    items: TItem[];
    /** Server-reported total for this bucket, including unloaded pages. */
    total: number;
    hasNextPage: boolean;
    isLoading: boolean;
    isFetchingNextPage: boolean;
    isError: boolean;
    fetchNextPage: () => void;
}

export interface ComposedPostList<TItem> {
    items: TItem[];
    totalItems: number;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isLoading: boolean;
    isError: boolean;
    fetchNextPage: () => void;
}

const noop = () => {};

export function composePostBuckets<TItem>(results: PostBucketResult<TItem>[]): ComposedPostList<TItem> {
    const totalItems = results.reduce((total, result) => total + result.total, 0);
    const isError = results.some(result => result.isError);

    // Nothing can be placed until every bucket's first page has landed: a
    // bucket that turns out to be empty lets the next one open immediately,
    // so rendering early would flash drafts in above scheduled.
    const isLoading = results.some(result => result.isLoading);

    if (isLoading) {
        return {
            items: [],
            totalItems,
            hasNextPage: false,
            isFetchingNextPage: false,
            isLoading: true,
            isError,
            fetchNextPage: noop
        };
    }

    // The first bucket that still has pages is the one currently paging;
    // everything after it stays hidden until it drains.
    const pagingIndex = results.findIndex(result => result.hasNextPage);
    const visible = pagingIndex === -1 ? results : results.slice(0, pagingIndex + 1);
    const paging = pagingIndex === -1 ? undefined : results[pagingIndex];

    return {
        items: visible.flatMap(result => result.items),
        totalItems,
        hasNextPage: Boolean(paging),
        isFetchingNextPage: paging?.isFetchingNextPage ?? false,
        isLoading: false,
        isError,
        fetchNextPage: paging?.fetchNextPage ?? noop
    };
}
