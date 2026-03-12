import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    replace?: boolean;
}

interface UseMembersFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    setSearch: (search: string, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
    clearAll: (options?: SetFiltersOptions) => void;
    hasFilterOrSearch: boolean;
}

function toSearchParams(filters: Filter[], search: string, timezone: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = serializeMemberFilters(filters, timezone);

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
    const timezone = useMemo(() => getSiteTimezone(settingsData?.settings ?? []), [settingsData?.settings]);

    const filters = useMemo(() => {
        return parseMemberFilter(searchParams.get('filter') ?? undefined, timezone);
    }, [searchParams, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(newFilters, search, timezone), {replace});
    }, [filters, search, setSearchParams, timezone]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(filters, nextSearch, timezone), {replace});
    }, [filters, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(toSearchParams([], search, timezone), {replace});
    }, [search, setSearchParams, timezone]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => serializeMemberFilters(filters, timezone), [filters, timezone]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: filters.length > 0 || search.length > 0
    };
}
