import type {Filter} from '@tryghost/shade';
import {serializeCommentFilters} from '@src/views/filters/comment-nql';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';

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

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: Filter[] | ((prevFilters: Filter[]) => Filter[]), options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
    /** True when the only active filter is a single comment ID (used for deep linking) */
    isSingleIdFilter: boolean;
}

/**
 * Hook to sync comment filter state with URL query parameters
 *
 * URL format: ?status=is:published&author=is:member-id&body=contains:search+term
 */
export function useFilterState(): UseFilterStateReturn {
    const {filters, nql, setFilters, clearFilters, isSingleIdFilter} = useUrlFilterState({
        parseFilters: searchParamsToFilters,
        serializeFilters: (newFilters) => filtersToSearchParams(newFilters),
        clearSearchParams: () => new URLSearchParams(),
        buildNql: buildNqlFilter,
        deriveState: ({filters: currentFilters}) => ({
            isSingleIdFilter: currentFilters.length === 1 && currentFilters[0].field === 'id'
        })
    });

    return {filters, nql, setFilters, clearFilters, isSingleIdFilter};
}
