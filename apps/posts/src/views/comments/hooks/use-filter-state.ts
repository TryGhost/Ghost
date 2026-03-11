import type {Filter} from '@tryghost/shade';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {COMMENT_FIELDS, CommentPredicate, isCommentField, isCommentOperatorForField} from '@src/views/filters/comment-fields';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';
import {parseCommentNqlFilterParam, serializeCommentFilters} from '@src/views/filters/filter-nql';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';

/**
 * Comment filter field keys - single source of truth for filter definitions
 */
export const COMMENT_FILTER_FIELDS = COMMENT_FIELDS;

export type CommentFilterField = typeof COMMENT_FILTER_FIELDS[number];

export function buildNqlFilter(filters: CommentPredicate[], options: {timezone?: string} = {}): string | undefined {
    return serializeCommentFilters(filters, options);
}

export function coerceCommentFilters(filters: Filter[]): CommentPredicate[] {
    return filters.filter((filter): filter is CommentPredicate => {
        return isCommentField(filter.field) && isCommentOperatorForField(filter.field, filter.operator);
    });
}
/**
 * Parse Ember-style filter NQL from URL search params into comment predicates.
 */
export function searchParamsToFilters(searchParams: URLSearchParams, options: {timezone?: string} = {}): CommentPredicate[] {
    return parseCommentNqlFilterParam(searchParams.get('filter') ?? '', options);
}

/**
 * Serialize comment predicates into Ember-style filter NQL URL search params.
 */
export function filtersToSearchParams(filters: CommentPredicate[], options: {timezone?: string} = {}): URLSearchParams {
    const params = new URLSearchParams();
    const filter = serializeCommentFilters(filters, options);

    if (filter) {
        params.set('filter', filter);
    }

    return params;
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
 * Hook to sync comment filter state with Ember-style URL query parameters.
 *
 * URL format: ?filter=status:published+html:~'needs review'
 */
export function useFilterState(): UseFilterStateReturn {
    const {data: settingsData} = useBrowseSettings({});
    const siteTimezone = getSiteTimezone(settingsData?.settings ?? []);

    const {filters, nql, setFilters, clearFilters, isSingleIdFilter, hasFilters} = useUrlFilterState<CommentPredicate, {
        isSingleIdFilter: boolean;
        hasFilters: boolean;
        hasSearch: boolean;
        hasFilterOrSearch: boolean;
    }>({
        parseFilters: searchParams => parseCommentNqlFilterParam(searchParams.get('filter') ?? '', {timezone: siteTimezone}),
        serializeFilters: newFilters => filtersToSearchParams(newFilters, {timezone: siteTimezone}),
        buildNql: currentFilters => buildNqlFilter(currentFilters, {timezone: siteTimezone}),
        deriveState: ({filters: currentFilters}) => ({
            ...deriveFilterFlags({predicates: currentFilters}),
            isSingleIdFilter: currentFilters.length === 1 && currentFilters[0].field === 'id'
        })
    });

    return {filters, nql, setFilters, clearFilters, isSingleIdFilter, hasFilters};
}
