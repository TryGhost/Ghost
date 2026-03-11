import {useMemo} from 'react';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Filter} from '@tryghost/shade';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';
import {buildMemberNqlFilter, parseMemberNqlFilterParam} from '@src/views/filters/filter-nql';
import {isMemberField, isMemberOperatorForField, MEMBER_STATIC_FIELDS, type MemberPredicate} from '@src/views/filters/member-fields';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';
import {UrlFilterStateOptions, useUrlFilterState} from '@src/views/filters/use-url-filter-state';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {deriveMemberFilterMetadata, MemberFilterColumnMetadata} from './member-filter-metadata';

export {buildMemberNqlFilter};

/**
 * Member filter field keys - single source of truth for filter definitions
 */
export const MEMBER_FILTER_FIELDS = [...MEMBER_STATIC_FIELDS, 'newsletters'] as const;

export type MemberFilterField = typeof MEMBER_FILTER_FIELDS[number];

// Fields that support multiselect (comma-separated values in URL)
const MULTISELECT_FIELDS = new Set<string>(['label', 'offer_redemptions', 'tier_id']);

/**
 * Parse URL search params into Filter objects
 */
export function coerceMemberFilters(filters: Filter[]): MemberPredicate[] {
    return filters.filter((filter): filter is MemberPredicate => {
        return isMemberField(filter.field) && isMemberOperatorForField(filter.field, filter.operator);
    });
}

/**
 * Parse URL search params into member predicates
 */
export function searchParamsToFilters(searchParams: URLSearchParams): MemberPredicate[] {
    const predicateFilters = parsePredicateParams({
        params: searchParams,
        multiselectFields: MULTISELECT_FIELDS,
        ignoredFields: new Set(['search'])
    }).map(predicate => ({
            id: predicate.id,
            field: predicate.field,
            operator: predicate.operator,
            values: predicate.values
        }));

    const legacyFilters = searchParams.getAll('filter')
        .flatMap(filterParam => parseMemberNqlFilterParam(filterParam));

    return legacyFilters.length > 0 ? legacyFilters : coerceMemberFilters(predicateFilters);
}

/**
 * Serialize filters to URL search params format
 */
export function filtersToSearchParams(filters: MemberPredicate[], search?: string): URLSearchParams {
    const predicates = coerceMemberFilters(filters)
        .filter((filter) => {
            if (MULTISELECT_FIELDS.has(filter.field)) {
                return true;
            }

            return filter.values[0] !== undefined;
        })
        .map((filter, index) => ({
            id: filter.id || `${filter.field}-${index + 1}`,
            field: filter.field,
            operator: filter.operator,
            values: filter.values.map(value => String(value))
        }));

    return serializePredicateParams({
        predicates,
        multiselectFields: MULTISELECT_FIELDS,
        search
    });
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
 * Hook to sync member filter state with URL query parameters
 *
 * URL format: ?status=is:paid&label=is:vip&search=john
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
