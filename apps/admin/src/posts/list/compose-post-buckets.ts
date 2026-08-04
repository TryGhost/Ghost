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

    // Nothing renders until every bucket's first page has landed. This mirrors
    // Ember, whose route returns `RSVP.hash` of all three models and shows a
    // skeleton until they all resolve (`routes/posts.js:177`,
    // `templates/posts-loading.hbs`).
    //
    // Releasing earlier looks tempting - one slow query then can't hide the
    // rest - but it is wrong in a way that bites on nearly every site: most
    // have zero scheduled posts, so that bucket answers first and instantly.
    // Releasing there renders an empty list, and once the real empty state
    // exists it would flash "Start creating content" on almost every page
    // load, while also reporting the list complete with two queries still in
    // flight. Progressive rendering would need a "settled" signal distinct
    // from "complete", not an earlier release here.
    if (results.some(result => result.isLoading)) {
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

    // Everything has answered; now apply the sequential-drain rule - a bucket
    // only opens once every earlier one has loaded all of its pages.
    const visible: PostBucketResult<TItem>[] = [];
    let paging: PostBucketResult<TItem> | undefined;

    for (const result of results) {
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
        isLoading: false,
        isError,
        fetchNextPage: paging?.fetchNextPage ?? noop
    };
}
