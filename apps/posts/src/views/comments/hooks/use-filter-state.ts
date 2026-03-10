import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';
import {serializeCommentFilters} from '@src/views/filters/comment-nql';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';

/**
 * Comment filter field keys - single source of truth for filter definitions
 */
export const COMMENT_FILTER_FIELDS = ['id', 'status', 'created_at', 'body', 'post', 'author', 'reported'] as const;

export type CommentFilterField = typeof COMMENT_FILTER_FIELDS[number];

export function buildNqlFilter(filters: Filter[]): string | undefined {
    return serializeCommentFilters(filters);
}
/**
 * Parse URL search params into Filter objects
 * Preserves the order of filters as they appear in the URL
 */
export function searchParamsToFilters(searchParams: URLSearchParams): Filter[] {
    return parsePredicateParams({
        params: searchParams,
        multiselectFields: new Set()
    }).filter(({field}) => COMMENT_FILTER_FIELDS.includes(field as CommentFilterField)).map(predicate => ({
        id: predicate.id,
        field: predicate.field,
        operator: predicate.operator,
        values: predicate.values
    }));
}

/**
 * Serialize filters to URL search params format
 */
export function filtersToSearchParams(filters: Filter[]): URLSearchParams {
    return serializePredicateParams({
        predicates: filters
            .filter(filter => COMMENT_FILTER_FIELDS.includes(filter.field as CommentFilterField) && filter.values[0] !== undefined)
            .map((filter, index) => ({
                id: filter.id || `${filter.field}-${index + 1}`,
                field: filter.field,
                operator: filter.operator,
                values: filter.values.map(value => String(value))
            })),
        multiselectFields: new Set()
    });
}

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface ClearFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: (options?: ClearFiltersOptions) => void;
    /** True when the only active filter is a single comment ID (used for deep linking) */
    isSingleIdFilter: boolean;
}

/**
 * Hook to sync comment filter state with URL query parameters
 *
 * URL format: ?status=is:published&author=is:member-id&body=contains:search+term
 */
export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse filters from URL
    const filters = useMemo(() => {
        return searchParamsToFilters(searchParams);
    }, [searchParams]);

    // Update URL when filters change
    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const newParams = filtersToSearchParams(newFilters);

        // Update URL - replace by default, but allow pushing to history
        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, setSearchParams]);

    // Clear all filter params from URL
    const clearFilters = useCallback(({replace = true}: {replace?: boolean} = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => buildNqlFilter(filters), [filters]);

    // Check if the only active filter is a single comment ID (used for deep linking)
    const isSingleIdFilter = useMemo(() => {
        return filters.length === 1 && filters[0].field === 'id';
    }, [filters]);

    return {filters, nql, setFilters, clearFilters, isSingleIdFilter};
}
