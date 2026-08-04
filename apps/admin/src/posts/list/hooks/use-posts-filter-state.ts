import {POST_FILTER_PARAMS, parsePostFilters, serializePostFilters} from '@/posts/list/post-filter-query';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router';
import type {Filter} from '@tryghost/shade/patterns';
import type {PostListParams} from '@/posts/list/post-query-params';

/**
 * Owns the posts/pages screen state that lives in the URL.
 *
 * The URL is the source of truth, and this hook is deliberately quieter than
 * the members equivalent: it never writes on hydration. A posts URL is a saved
 * view's identity - the sidebar persists `{type, visibility, author, tag,
 * order}` records and compares them verbatim - so canonicalising a URL just
 * because we parsed it would silently corrupt the user's view, and the Ember
 * screen would then read something different. Values we don't recognise are
 * carried through untouched for the same reason.
 *
 * `order` is kept out of the chip model because it is a sort, not a filter.
 */

const ORDER_PARAM = 'order';

interface SetOptions {
    /** Filter changes replace history by default, matching Ember. */
    replace?: boolean;
}

export interface UsePostsFilterStateReturn {
    /** Chip model for the Shade `Filters` component. */
    filters: Filter[];
    /** The raw param record, for building API queries and matching saved views. */
    params: PostListParams;
    order: string | null;
    setFilters: (filters: Filter[], options?: SetOptions) => void;
    setOrder: (order: string | null, options?: SetOptions) => void;
    /** Clears the filters but keeps the sort, matching Ember. */
    clearFilters: (options?: SetOptions) => void;
    /** Whether any *filter* is active. Sorting deliberately doesn't count. */
    hasFilters: boolean;
}

function readParams(searchParams: URLSearchParams): PostListParams {
    const params: PostListParams = {};

    POST_FILTER_PARAMS.forEach((param) => {
        params[param] = searchParams.get(param);
    });

    params.order = searchParams.get(ORDER_PARAM);

    return params;
}

/** Applies a param record to a copy of the URL, leaving other params alone. */
function writeParams(
    searchParams: URLSearchParams,
    values: Partial<Record<string, string | null>>
): URLSearchParams {
    const next = new URLSearchParams(searchParams);

    Object.entries(values).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            next.delete(key);
        } else {
            next.set(key, value);
        }
    });

    return next;
}

export function usePostsFilterState(): UsePostsFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    const params = useMemo(() => readParams(searchParams), [searchParams]);
    const filters = useMemo(() => parsePostFilters(params), [params]);
    const order = params.order ?? null;

    const apply = useCallback((
        values: Partial<Record<string, string | null>>,
        {replace = true}: SetOptions = {}
    ) => {
        setSearchParams(current => writeParams(current, values), {replace});
    }, [setSearchParams]);

    const setFilters = useCallback((nextFilters: Filter[], options?: SetOptions) => {
        apply(serializePostFilters(nextFilters), options);
    }, [apply]);

    const setOrder = useCallback((nextOrder: string | null, options?: SetOptions) => {
        apply({[ORDER_PARAM]: nextOrder}, options);
    }, [apply]);

    /**
     * Clears the filters and leaves the sort alone — Ember's "Show all posts"
     * link resets `type`, `author`, `tag` and `visibility` but deliberately
     * not `order` (`templates/posts.hbs:51`), so a chosen sort survives.
     *
     * Pushes a history entry rather than replacing, so back returns to the
     * filtered view the way Ember's `LinkTo` does.
     */
    const clearFilters = useCallback((options?: SetOptions) => {
        apply(serializePostFilters([]), {replace: false, ...options});
    }, [apply]);

    const hasFilters = POST_FILTER_PARAMS.some(param => Boolean(params[param]));

    return {filters, params, order, setFilters, setOrder, clearFilters, hasFilters};
}
