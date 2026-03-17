import {compileMemberFilters, hasUnsupportedMemberOrFilter} from '../member-filter-query';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {importLegacyMemberFilters} from '../member-filter-import';
import {memberFields} from '../member-fields';
import {parseBrowserFilters, replaceBrowserFiltersInSearchParams} from '../../filters/browser-filter-params';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
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

function rewriteBrowserParams(currentParams: URLSearchParams, filters: Filter[]): URLSearchParams {
    const params = replaceBrowserFiltersInSearchParams(currentParams, filters, memberFields);
    params.delete('filter');
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

    const browserFilters = useMemo(() => {
        return parseBrowserFilters(searchParams, memberFields);
    }, [searchParams]);

    const shouldPreserveRawFilter = browserFilters.length === 0 && Boolean(filterParam) && (!resolvedTimezone || hasUnsupportedOrFilter);

    const filters = useMemo(() => {
        if (browserFilters.length > 0) {
            return browserFilters;
        }

        if (shouldPreserveRawFilter) {
            return [];
        }

        return importLegacyMemberFilters(filterParam, timezone);
    }, [browserFilters, filterParam, shouldPreserveRawFilter, timezone]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    useEffect(() => {
        const legacyFilter = filterParam;
        const rewrittenBrowserParams = rewriteBrowserParams(searchParams, browserFilters);

        if (browserFilters.length > 0) {
            if (rewrittenBrowserParams.toString() !== searchParams.toString()) {
                setSearchParams(rewrittenBrowserParams, {replace: true});
            }

            return;
        }

        if (!legacyFilter || shouldPreserveRawFilter) {
            return;
        }

        const importedFilters = importLegacyMemberFilters(legacyFilter, timezone);
        const rewrittenParams = rewriteBrowserParams(searchParams, importedFilters);

        if (rewrittenParams.toString() !== searchParams.toString()) {
            setSearchParams(rewrittenParams, {replace: true});
        }
    }, [browserFilters, filterParam, searchParams, setSearchParams, shouldPreserveRawFilter, timezone]);

    const setFilters = useCallback((nextFilters: Filter[], options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        const params = rewriteBrowserParams(searchParams, nextFilters);

        setSearchParams(params, {replace});
    }, [searchParams, setSearchParams]);

    const setSearch = useCallback((nextSearch: string, options: SetFiltersOptions = {}) => {
        const replace = options.replace ?? true;
        const params = shouldPreserveRawFilter && filterParam
            ? new URLSearchParams(searchParams)
            : rewriteBrowserParams(searchParams, filters);

        if (nextSearch) {
            params.set('search', nextSearch);
        } else {
            params.delete('search');
        }

        setSearchParams(params, {replace});
    }, [filterParam, filters, searchParams, setSearchParams, shouldPreserveRawFilter]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        const params = rewriteBrowserParams(searchParams, []);
        setSearchParams(params, {replace});
    }, [searchParams, setSearchParams]);

    const clearAll = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => {
        if (shouldPreserveRawFilter) {
            return filterParam;
        }

        return compileMemberFilters(filters, timezone);
    }, [filterParam, filters, shouldPreserveRawFilter, timezone]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        clearAll,
        hasFilterOrSearch: Boolean(filterParam) || filters.length > 0 || search.length > 0
    };
}
