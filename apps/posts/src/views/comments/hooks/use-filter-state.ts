import type {Filter} from '@tryghost/shade';
import {COMMENT_FIELDS, CommentPredicate, isCommentField, isCommentOperatorForField} from '@src/views/filters/comment-fields';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';
import {serializeCommentFilters} from '@src/views/filters/filter-nql';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';

/**
 * Comment filter field keys - single source of truth for filter definitions
 */
export const COMMENT_FILTER_FIELDS = COMMENT_FIELDS;

export type CommentFilterField = typeof COMMENT_FILTER_FIELDS[number];

export function buildNqlFilter(filters: CommentPredicate[]): string | undefined {
    return serializeCommentFilters(filters);
}

export function coerceCommentFilters(filters: Filter[]): CommentPredicate[] {
    return filters.filter((filter): filter is CommentPredicate => {
        return isCommentField(filter.field) && isCommentOperatorForField(filter.field, filter.operator);
    });
}
/**
 * Parse URL search params into Filter objects
 * Preserves the order of filters as they appear in the URL
 */
export function searchParamsToFilters(searchParams: URLSearchParams): CommentPredicate[] {
    return parsePredicateParams({
        params: searchParams,
        multiselectFields: new Set()
    }).filter(({field, operator}) => isCommentField(field) && isCommentOperatorForField(field, operator)).map(predicate => ({
        id: predicate.id,
        field: predicate.field,
        operator: predicate.operator,
        values: predicate.values
    })) as CommentPredicate[];
}

/**
 * Serialize filters to URL search params format
 */
export function filtersToSearchParams(filters: CommentPredicate[]): URLSearchParams {
    return serializePredicateParams({
        predicates: filters
            .filter(filter => isCommentField(filter.field) && filter.values[0] !== undefined)
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
    filters: CommentPredicate[];
    nql: string | undefined;
    setFilters: (action: CommentPredicate[] | ((prevFilters: CommentPredicate[]) => CommentPredicate[]), options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
    /** True when the only active filter is a single comment ID (used for deep linking) */
    isSingleIdFilter: boolean;
    hasFilters: boolean;
}

/**
 * Hook to sync comment filter state with URL query parameters
 *
 * URL format: ?status=is:published&author=is:member-id&body=contains:search+term
 */
export function useFilterState(): UseFilterStateReturn {
    const {filters, nql, setFilters, clearFilters, isSingleIdFilter, hasFilters} = useUrlFilterState<CommentPredicate, {
        isSingleIdFilter: boolean;
        hasFilters: boolean;
        hasSearch: boolean;
        hasFilterOrSearch: boolean;
    }>({
        parseFilters: searchParamsToFilters,
        serializeFilters: (newFilters) => filtersToSearchParams(newFilters),
        buildNql: buildNqlFilter,
        deriveState: ({filters: currentFilters}) => ({
            ...deriveFilterFlags({predicates: currentFilters}),
            isSingleIdFilter: currentFilters.length === 1 && currentFilters[0].field === 'id'
        })
    });

    return {filters, nql, setFilters, clearFilters, isSingleIdFilter, hasFilters};
}
