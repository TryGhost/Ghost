import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {Filter} from '@tryghost/shade';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {parseCommentFilter, serializeCommentFilters} from '../comment-filter-query';

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

function toSearchParams(filters: Filter[], timezone: string): URLSearchParams {
    const params = new URLSearchParams();
    const filter = serializeCommentFilters(filters, timezone);

    if (filter) {
        params.set('filter', filter);
    }

    return params;
}

export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const timezone = useMemo(() => getSiteTimezone(settingsData?.settings ?? []), [settingsData?.settings]);

    const filters = useMemo(() => {
        return parseCommentFilter(searchParams.get('filter') ?? undefined, timezone);
    }, [searchParams, timezone]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(toSearchParams(newFilters, timezone), {replace});
    }, [filters, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: ClearFiltersOptions = {}) => {
        setSearchParams(new URLSearchParams(), {replace});
    }, [setSearchParams]);

    const nql = useMemo(() => serializeCommentFilters(filters, timezone), [filters, timezone]);

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
