import {Filter} from '@tryghost/shade/patterns';
import {hasTimezoneSensitiveCommentFilter, parseCommentFilter, serializeCommentFilters} from '../comment-filter-query';
import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface ClearFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: (options?: ClearFiltersOptions) => void;
}

interface ToSearchParamsOptions {
    baseSearchParams: URLSearchParams;
    filters: Filter[];
    timezone: string;
}

function toSearchParams({baseSearchParams, filters, timezone}: ToSearchParamsOptions): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const filter = serializeCommentFilters(filters, timezone);

    params.delete('filter');

    if (filter) {
        params.set('filter', filter);
    }

    return params;
}

export function shouldDelayCommentDateFilterHydration(
    filterParam: string | undefined,
    hasResolvedTimezone: boolean,
    isSettingsLoading: boolean = !hasResolvedTimezone
): boolean {
    return Boolean(filterParam) && isSettingsLoading && !hasResolvedTimezone && hasTimezoneSensitiveCommentFilter(filterParam);
}

export function useFilterState(timezone: string): UseFilterStateReturn {
    const [searchParams, setSearchParams] = useSearchParams();
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);

    const filters = useMemo(() => {
        return parseCommentFilter(filterParam, timezone);
    }, [filterParam, timezone]);

    const nql = useMemo(() => {
        return serializeCommentFilters(filters, timezone);
    }, [filters, timezone]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const newParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: newFilters,
            timezone
        });
        const replace = options.replace ?? true;

        setSearchParams(newParams, {replace});
    }, [filters, searchParams, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: ClearFiltersOptions = {}) => {
        const newParams = toSearchParams({
            baseSearchParams: searchParams,
            filters: [],
            timezone
        });

        setSearchParams(newParams, {replace});
    }, [searchParams, setSearchParams, timezone]);

    return {filters, nql, setFilters, clearFilters};
}
