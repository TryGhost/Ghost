import {hasTimezoneSensitiveMemberFilter, parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
import {useCallback, useEffect, useMemo} from 'react';
import {useSearchParams} from 'react-router';
import type {Filter} from '@tryghost/shade';

interface SetFiltersOptions {
    replace?: boolean;
}

interface UseMembersFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (filters: Filter[], options?: SetFiltersOptions) => void;
    setSearch: (search: string, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
    clearAll: (options?: SetFiltersOptions) => void;
    hasFilterOrSearch: boolean;
}

interface ToSearchParamsOptions {
    baseSearchParams: URLSearchParams;
    filters: Filter[];
    search: string;
    timezone: string;
}

export function shouldDelayMembersDateFilterHydration(
    filterParam: string | undefined,
    hasResolvedTimezone: boolean,
    isSettingsLoading: boolean = !hasResolvedTimezone
): boolean {
    return Boolean(filterParam) && isSettingsLoading && !hasResolvedTimezone && hasTimezoneSensitiveMemberFilter(filterParam);
}

function toSearchParams({baseSearchParams, filters, search, timezone}: ToSearchParamsOptions): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const filter = serializeMemberFilters(filters, timezone);

    params.delete('filter');
    params.delete('search');

    if (filter) {
        params.set('filter', filter);
    }

    if (search) {
        params.set('search', search);
    }

    return params;
}

export function useMembersFilterState(timezone: string): UseMembersFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);

    const filters = useMemo(() => {
        return parseMemberFilter(filterParam, timezone);
    }, [filterParam, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const nql = useMemo(() => {
        return serializeMemberFilters(filters, timezone);
    }, [filters, timezone]);

    useEffect(() => {
        const currentQuery = searchParams.toString();
        const nextParams = toSearchParams({
            baseSearchParams: searchParams,
            filters,
            search,
            timezone
        });
        const nextQuery = nextParams.toString();

        if (nextQuery !== currentQuery) {
            setSearchParams(nextParams, {replace: true});
        }
    }, [filters, search, searchParams, setSearchParams, timezone]);

    const setFilters = useCallback((nextFilters: Filter[], options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams({
            baseSearchParams: searchParams,
            filters: nextFilters,
            search,
            timezone
        }), {replace});
    }, [search, searchParams, setSearchParams, timezone]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        setSearchParams(toSearchParams({
            baseSearchParams: searchParams,
            filters,
            search: nextSearch,
            timezone
        }), {replace});
    }, [filters, searchParams, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            search,
            timezone
        }), {replace});
    }, [search, searchParams, setSearchParams, timezone]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            search: '',
            timezone
        }), {replace});
    }, [searchParams, setSearchParams, timezone]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: Boolean(nql) || search.length > 0
    };
}
