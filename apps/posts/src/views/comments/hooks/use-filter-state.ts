import {commentFields} from '../comment-fields';
import {compileCommentFilters} from '../comment-filter-query';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {parseBrowserFilters, replaceBrowserFiltersInSearchParams} from '../../filters/browser-filter-params';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from 'react-router';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    replace?: boolean;
}

interface ClearFiltersOptions {
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: (options?: ClearFiltersOptions) => void;
    isSingleIdFilter: boolean;
}

export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const timezone = useMemo(() => getSiteTimezone(settingsData?.settings ?? []), [settingsData?.settings]);

    const filters = useMemo(() => {
        return parseBrowserFilters(searchParams, commentFields);
    }, [searchParams]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(replaceBrowserFiltersInSearchParams(searchParams, newFilters, commentFields), {replace});
    }, [filters, searchParams, setSearchParams]);

    const clearFilters = useCallback(({replace = true}: ClearFiltersOptions = {}) => {
        setSearchParams(replaceBrowserFiltersInSearchParams(searchParams, [], commentFields), {replace});
    }, [searchParams, setSearchParams]);

    const nql = useMemo(() => compileCommentFilters(filters, timezone), [filters, timezone]);

    const isSingleIdFilter = useMemo(() => {
        return filters.length === 1 && filters[0].field === 'id';
    }, [filters]);

    return {
        filters,
        nql,
        setFilters,
        clearFilters,
        isSingleIdFilter
    };
}
