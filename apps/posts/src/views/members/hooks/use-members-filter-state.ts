import {useMemo} from 'react';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Filter} from '@tryghost/shade';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';
import {buildMemberNqlFilter, parseMemberNqlFilterParam} from '@src/views/filters/filter-nql';
import {isMemberField, isMemberOperatorForField, MEMBER_STATIC_FIELDS, type MemberPredicate} from '@src/views/filters/member-fields';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {deriveMemberFilterMetadata, MemberFilterColumnMetadata} from './member-filter-metadata';

export {buildMemberNqlFilter};

/**
 * Member filter field keys - single source of truth for filter definitions
 */
export const MEMBER_FILTER_FIELDS = [...MEMBER_STATIC_FIELDS, 'newsletters'] as const;

export type MemberFilterField = typeof MEMBER_FILTER_FIELDS[number];

/**
 * Coerce generic Shade filters at the UI boundary into typed member predicates.
 */
export function coerceMemberFilters(filters: Filter[]): MemberPredicate[] {
    return filters.filter((filter): filter is MemberPredicate => {
        return isMemberField(filter.field) && isMemberOperatorForField(filter.field, filter.operator);
    });
}

/**
 * Parse Ember-style filter NQL from URL search params into member predicates.
 */
export function searchParamsToFilters(searchParams: URLSearchParams): MemberPredicate[] {
    const legacyFilters = searchParams.getAll('filter')
        .flatMap(filterParam => parseMemberNqlFilterParam(filterParam));

    return legacyFilters;
}

/**
 * Serialize member predicates into Ember-style filter NQL URL search params.
 */
export function filtersToSearchParams(filters: MemberPredicate[], search?: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = buildMemberNqlFilter(coerceMemberFilters(filters));

    if (filter) {
        params.set('filter', filter);
    }

    if (search?.trim()) {
        params.set('search', search);
    }

    return params;
}

interface UseFilterStateReturn {
    filters: MemberPredicate[];
    nql: string | undefined;
    search: string;
    setFilters: (action: MemberPredicate[] | ((prevFilters: MemberPredicate[]) => MemberPredicate[]), options?: UrlFilterStateOptions) => void;
    setSearch: (search: string, options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
    resetFiltersAndSearch: (options?: UrlFilterStateOptions) => void;
    hasFilters: boolean;
    hasSearch: boolean;
    hasFilterOrSearch: boolean;
    activeFields: string[];
    activeColumns: MemberFilterColumnMetadata[];
}

/**
 * Hook to sync member filter state with Ember-style URL query parameters.
 *
 * URL format: ?filter=status:paid+label:[vip]&search=john
 */
export function useMembersFilterState(): UseFilterStateReturn {
    const {data: settingsData} = useBrowseSettings({});

    const siteTimezone = useMemo(() => {
        return getSiteTimezone(settingsData?.settings ?? []);
    }, [settingsData?.settings]);

    const {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        resetState,
        hasFilters,
        hasSearch,
        hasFilterOrSearch,
        activeFields,
        activeColumns
    } = useUrlFilterState<MemberPredicate, {
        hasFilters: boolean;
        hasSearch: boolean;
        hasFilterOrSearch: boolean;
        activeFields: string[];
        activeColumns: MemberFilterColumnMetadata[];
    }>({
        parseFilters: searchParamsToFilters,
        serializeFilters: filtersToSearchParams,
        buildNql: currentFilters => buildMemberNqlFilter(currentFilters, {timezone: siteTimezone}),
        deriveState: ({filters: currentFilters, search: currentSearch}) => {
            const flags = deriveFilterFlags({
                predicates: currentFilters.map(filter => ({
                    id: filter.id || `${filter.field}-${filter.operator}`,
                    field: filter.field,
                    operator: filter.operator,
                    values: filter.values
                })),
                search: currentSearch
            });
            const metadata = deriveMemberFilterMetadata(currentFilters);

            return {
                ...flags,
                activeFields: metadata.activeFields,
                activeColumns: metadata.activeColumns
            };
        }
    });

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        resetFiltersAndSearch: resetState,
        hasFilters,
        hasSearch,
        hasFilterOrSearch,
        activeFields,
        activeColumns
    };
}
