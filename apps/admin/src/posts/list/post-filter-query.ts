import {stampPredicates} from '@/shared/filters';
import type {Filter} from '@tryghost/shade/patterns';
import type {PostListParams} from './post-query-params';

/**
 * Bridges the posts/pages URL params and the Shade `Filters` chip model.
 *
 * Unlike members, which round-trips a single NQL `?filter=` string, posts are
 * addressed by discrete params (`?type=draft&tag=news`). That shape is fixed:
 * sidebar saved views persist exactly it, and the Ember and React screens have
 * to agree on it while both exist. So this is a small dedicated codec rather
 * than a use of `@/shared/filters`' NQL engine - only `stampPredicates` is
 * shared.
 *
 * `order` is deliberately absent: it is a sort, not a filter, so it has no
 * operator and would read as a nonsense chip. It is carried alongside these.
 */

export const POST_FILTER_PARAMS = ['type', 'visibility', 'author', 'tag'] as const;

export type PostFilterParam = (typeof POST_FILTER_PARAMS)[number];

export type PostFilterParamValues = Record<PostFilterParam, string | null>;

const EMPTY_PARAMS: PostFilterParamValues = {
    type: null,
    visibility: null,
    author: null,
    tag: null
};

/** These fields are single-select equality; Ember offers nothing else. */
const OPERATOR = 'is';

function isFilterParam(field: string): field is PostFilterParam {
    return (POST_FILTER_PARAMS as readonly string[]).includes(field);
}

/**
 * Values are carried through verbatim, including ones we don't recognise: a
 * saved view may point at a since-renamed tag, or at a value only a newer
 * build understands. Dropping it would silently rewrite the user's URL.
 */
export function parsePostFilters(params: PostListParams): Filter[] {
    const predicates = POST_FILTER_PARAMS.flatMap((param) => {
        const value = params[param];

        if (value === null || value === undefined || value === '') {
            return [];
        }

        return [{field: param, operator: OPERATOR, values: [value]}];
    });

    return stampPredicates(predicates);
}

/**
 * URL params are strings. Anything else a chip might carry is not
 * representable in the URL, so it clears the param rather than serialising as
 * "[object Object]".
 */
function toParamValue(value: unknown): string | null {
    if (typeof value === 'string') {
        return value === '' ? null : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return null;
}

/**
 * The inverse. A filter with no value yet - Shade creates one as soon as a
 * field is picked - clears its param rather than writing an empty one.
 */
export function serializePostFilters(filters: Filter[]): PostFilterParamValues {
    const params: PostFilterParamValues = {...EMPTY_PARAMS};

    filters.forEach((filter) => {
        if (!isFilterParam(filter.field)) {
            return;
        }

        params[filter.field] = toParamValue(filter.values[0]);
    });

    return params;
}
