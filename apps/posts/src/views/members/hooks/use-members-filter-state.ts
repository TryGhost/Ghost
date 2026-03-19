import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {hasTimezoneSensitiveMemberFilter, parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
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

function getFilterParam(filters: Filter[], timezone: string, preservedFilter?: string): string | undefined {
    const serializedFilter = serializeMemberFilters(filters, timezone);

    if (preservedFilter && serializedFilter) {
        return `${preservedFilter}+${serializedFilter}`;
    }

    return preservedFilter ?? serializedFilter;
}

function toSearchParams(filters: Filter[], search: string, timezone: string, preservedFilter?: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = getFilterParam(filters, timezone, preservedFilter);

    if (filter) {
        params.set('filter', filter);
    }

    if (search) {
        params.set('search', search);
    }

    return params;
}

export function useMembersFilterState(): UseMembersFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const hasTimezoneSensitiveFilter = useMemo(() => hasTimezoneSensitiveMemberFilter(filterParam), [filterParam]);
    const resolvedTimezone = useMemo(() => {
        if (!settingsData) {
            return null;
        }

        return getSiteTimezone(settingsData.settings ?? []);
    }, [settingsData]);
    const timezone = resolvedTimezone ?? 'Etc/UTC';
    const shouldPreserveRawFilter = Boolean(filterParam) && !resolvedTimezone && hasTimezoneSensitiveFilter;
    const preservedFilter = shouldPreserveRawFilter ? filterParam : undefined;

    const filters = useMemo(() => {
        if (shouldPreserveRawFilter) {
            return [];
        }

        return parseMemberFilter(filterParam, timezone);
    }, [filterParam, shouldPreserveRawFilter, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const setFilters = useCallback((nextFilters: Filter[], options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(nextFilters, search, timezone, preservedFilter), {replace});
    }, [preservedFilter, search, setSearchParams, timezone]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        setSearchParams(toSearchParams(filters, nextSearch, timezone, preservedFilter), {replace});
    }, [filters, preservedFilter, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(toSearchParams([], search, timezone), {replace});
    }, [search, setSearchParams, timezone]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => {
        if (shouldPreserveRawFilter) {
            return filterParam;
        }

        return serializeMemberFilters(filters, timezone);
    }, [filterParam, filters, shouldPreserveRawFilter, timezone]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: Boolean(filterParam) || search.length > 0
    };
}
