import {commentFields} from '../comment-fields';
import {compileCommentFilters} from '../comment-filter-query';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {importLegacyCommentFilters} from '../comment-filter-import';
import {parseBrowserFilters, replaceBrowserFiltersInSearchParams} from '../../filters/browser-filter-params';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useEffect, useMemo} from 'react';
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

function rewriteLegacyParams(currentParams: URLSearchParams, filters: Filter[]): URLSearchParams {
    const params = replaceBrowserFiltersInSearchParams(currentParams, filters, commentFields);
    params.delete('filter');
    return params;
}

export function useFilterState(): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: settingsData} = useBrowseSettings({});
    const timezone = useMemo(() => getSiteTimezone(settingsData?.settings ?? []), [settingsData?.settings]);

    const browserFilters = useMemo(() => {
        return parseBrowserFilters(searchParams, commentFields);
    }, [searchParams]);

    const filters = useMemo(() => {
        if (browserFilters.length > 0) {
            return browserFilters;
        }

        return importLegacyCommentFilters(searchParams.get('filter') ?? undefined, timezone);
    }, [browserFilters, searchParams, timezone]);

    useEffect(() => {
        const legacyFilter = searchParams.get('filter');
        const rewrittenBrowserParams = rewriteLegacyParams(searchParams, browserFilters);

        if (browserFilters.length > 0) {
            if (rewrittenBrowserParams.toString() !== searchParams.toString()) {
                setSearchParams(rewrittenBrowserParams, {replace: true});
            }

            return;
        }

        if (!legacyFilter) {
            return;
        }

        const importedFilters = importLegacyCommentFilters(legacyFilter, timezone);
        const rewrittenParams = rewriteLegacyParams(searchParams, importedFilters);

        setSearchParams(rewrittenParams, {replace: true});
    }, [browserFilters, searchParams, setSearchParams, timezone]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const replace = options.replace ?? true;

        setSearchParams(rewriteLegacyParams(searchParams, newFilters), {replace});
    }, [filters, searchParams, setSearchParams]);

    const clearFilters = useCallback(({replace = true}: ClearFiltersOptions = {}) => {
        setSearchParams(rewriteLegacyParams(searchParams, []), {replace});
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
