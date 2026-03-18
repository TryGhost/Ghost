import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {hasUnsupportedMemberOrFilter, parseMemberFilter, serializeMemberFilters} from '../member-filter-query';
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
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const hasUnsupportedOrFilter = useMemo(() => hasUnsupportedMemberOrFilter(filterParam), [filterParam]);
    const resolvedTimezone = useMemo(() => {
        if (!settingsData) {
            return null;
        }

        return getSiteTimezone(settingsData.settings ?? []);
    }, [settingsData]);
    const timezone = resolvedTimezone ?? 'Etc/UTC';
    const shouldPreserveRawFilter = Boolean(filterParam) && (!resolvedTimezone || hasUnsupportedOrFilter);

    const filters = useMemo(() => {
        if (hasUnsupportedOrFilter) {
            return [];
        }

        return parseMemberFilter(filterParam, timezone);
    }, [filterParam, hasUnsupportedOrFilter, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const setFilters = useCallback((nextFilters: Filter[], options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(nextFilters, search, timezone), {replace});
    }, [search, setSearchParams, timezone]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        const params = new URLSearchParams();

        if (shouldPreserveRawFilter && filterParam) {
            params.set('filter', filterParam);
        } else {
            const filter = serializeMemberFilters(filters, timezone);

            if (filter) {
                params.set('filter', filter);
            }
        }

        if (nextSearch) {
            params.set('search', nextSearch);
        }

        setSearchParams(params, {replace});
    }, [filterParam, filters, setSearchParams, shouldPreserveRawFilter, timezone]);

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
