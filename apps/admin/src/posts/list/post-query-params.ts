/**
 * Turns the posts/pages URL params into the API queries that back the list.
 *
 * Ported from `apps/ember-admin/app/routes/posts.js`. Two things here are
 * load-bearing beyond "it fetches posts":
 *
 * - The list is not one query but three, drained in order (scheduled, then
 *   drafts, then published/sent), each with its own default sort. Drafts have
 *   no `published_at`, so they sort by when they were last touched.
 * - `buildAllFilter` also feeds the inverted "select all" filter that bulk
 *   edit and bulk delete run against server-side, including posts that were
 *   never loaded. Its exact output matters.
 */

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'sent';

/** The three queries the list is assembled from, in render order. */
export type PostBucket = 'scheduled' | 'draft' | 'publishedAndSent';

export const BUCKET_ORDER: readonly PostBucket[] = ['scheduled', 'draft', 'publishedAndSent'];

const ALL_STATUSES: readonly PostStatus[] = ['draft', 'scheduled', 'published', 'sent'];

const TYPE_TO_STATUSES: Record<string, readonly PostStatus[]> = {
    draft: ['draft'],
    published: ['published'],
    scheduled: ['scheduled'],
    sent: ['sent']
};

/** Rows per request. Matches Ember; also decides when a bucket "opens". */
export const POSTS_PER_PAGE = 30;

/**
 * The five URL params the screen is addressed by. This shape is the source of
 * truth: it is what the URL carries and what sidebar saved views persist, so
 * it must round-trip byte-identically between the Ember and React screens.
 */
export interface PostListParams {
    type?: string | null;
    visibility?: string | null;
    author?: string | null;
    tag?: string | null;
    order?: string | null;
}

export interface PostFilterContext {
    /**
     * Set for authors and contributors, who may only ever see their own posts.
     * When set it wins over the `author` param entirely.
     */
    ownAuthorSlug?: string | null;
}

/**
 * `featured` is not a status - it means every status *and* `featured:true`.
 * An unrecognised type falls back to everything, matching Ember's `switch`.
 */
export function getStatusesForType(type?: string | null): PostStatus[] {
    return [...(TYPE_TO_STATUSES[type ?? ''] ?? ALL_STATUSES)];
}

function statusClause(statuses: PostStatus[]): string {
    return statuses.length === 1 ? statuses[0] : `[${statuses.join(',')}]`;
}

/**
 * Joins `key:value` pairs with `+`, dropping blanks. Values are interpolated
 * verbatim - `visibility=[paid,tiers]` is an opaque option value, not
 * structure to be parsed.
 */
function toFilterString(clauses: Array<[string, string | null | undefined]>): string {
    return clauses
        .filter((entry): entry is [string, string] => {
            const value = entry[1];
            return value !== null && value !== undefined && value !== '';
        })
        .map(([key, value]) => `${key}:${value}`)
        .join('+');
}

/**
 * Clause order is fixed (tag, visibility, status, featured, authors) so filters
 * built here compare equal to the ones Ember builds.
 */
function filterClauses(
    params: PostListParams,
    statuses: PostStatus[],
    {ownAuthorSlug}: PostFilterContext
): Array<[string, string | null | undefined]> {
    return [
        ['tag', params.tag],
        ['visibility', params.visibility],
        ['status', statusClause(statuses)],
        ['featured', params.type === 'featured' ? 'true' : null],
        ['authors', ownAuthorSlug || params.author]
    ];
}

/**
 * The filter for everything matching the current params, across all statuses.
 * Used as the parent filter for bulk actions on an inverted selection.
 */
export function buildAllFilter(params: PostListParams, context: PostFilterContext = {}): string {
    return toFilterString(filterClauses(params, getStatusesForType(params.type), context));
}

/** Which of the three queries the current params need, in render order. */
export function getActiveBuckets(params: PostListParams): PostBucket[] {
    const statuses = getStatusesForType(params.type);

    return BUCKET_ORDER.filter((bucket) => {
        if (bucket === 'publishedAndSent') {
            return statuses.includes('published') || statuses.includes('sent');
        }
        return statuses.includes(bucket);
    });
}

function bucketStatuses(bucket: PostBucket, params: PostListParams): PostStatus[] {
    if (bucket !== 'publishedAndSent') {
        return [bucket];
    }

    // The bucket is shared, but filtering by Published must not return emails.
    return getStatusesForType(params.type).filter(
        (status): status is PostStatus => status === 'published' || status === 'sent'
    );
}

export function buildBucketFilter(
    bucket: PostBucket,
    params: PostListParams,
    context: PostFilterContext = {}
): string {
    return toFilterString(filterClauses(params, bucketStatuses(bucket, params), context));
}

/**
 * An explicit `order` param overrides every bucket. Otherwise drafts sort by
 * `updated_at` (they have no publish date) and the rest by `published_at`.
 */
export function getBucketOrder(bucket: PostBucket, order?: string | null): string {
    if (order) {
        return order;
    }

    return bucket === 'draft' ? 'updated_at desc' : 'published_at desc';
}

/**
 * Search params for one bucket's request. Deliberately omits `include` and
 * `formats`: the server's default relations already attach tags, authors,
 * email, tiers and click counts, and Ember's `formats=mobiledoc,lexical`
 * drags entire post bodies into a 30-row list for no visible benefit.
 */
export function getBucketSearchParams(
    bucket: PostBucket,
    params: PostListParams,
    context: PostFilterContext = {}
): Record<string, string> {
    return {
        filter: buildBucketFilter(bucket, params, context),
        order: getBucketOrder(bucket, params.order),
        limit: String(POSTS_PER_PAGE)
    };
}
