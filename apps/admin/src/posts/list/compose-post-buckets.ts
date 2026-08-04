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

    // Walk in order, taking buckets until one isn't finished. Only *later*
    // buckets depend on earlier ones, so an earlier bucket shows as soon as it
    // has answered - holding the list until every bucket replies would let one
    // slow query hide everything. Conversely a bucket whose predecessor hasn't
    // answered stays hidden, or drafts flash in above scheduled.
    const visible: PostBucketResult<TItem>[] = [];
    let paging: PostBucketResult<TItem> | undefined;

    for (const result of results) {
        if (result.isLoading) {
            break;
        }

        visible.push(result);

        // A bucket that failed never drained, so nothing after it may open -
        // otherwise a transient error silently reorders the list.
        if (result.isError) {
            break;
        }

        if (result.hasNextPage) {
            paging = result;
            break;
        }
    }

    return {
        items: visible.flatMap(result => result.items),
        totalItems,
        hasNextPage: Boolean(paging),
        isFetchingNextPage: paging?.isFetchingNextPage ?? false,
        // Only "loading" while there is genuinely nothing to show yet.
        isLoading: visible.length === 0 && results.some(result => result.isLoading),
        isError,
        fetchNextPage: paging?.fetchNextPage ?? noop
    };
}
