import {Filter} from '@tryghost/shade/patterns';
import {hasTimezoneSensitiveCommentFilter, parseCommentFilter, serializeCommentFilters} from '../comment-filter-query';
import {parseLegacyCommentFilters, removeLegacyCommentFilterParams} from '../legacy-comment-filter-query';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

interface SetFiltersOptions {
    /** Whether to replace the current history entry (default: true) */
    replace?: boolean;
}

interface UseFilterStateReturn {
    filters: Filter[];
    nql: string | undefined;
    setFilters: (action: SetFiltersAction, options?: SetFiltersOptions) => void;
    clearFilters: (options?: SetFiltersOptions) => void;
}

function toSearchParams(baseSearchParams: URLSearchParams, filters: Filter[], timezone: string): URLSearchParams {
    const params = new URLSearchParams(baseSearchParams);
    const filter = serializeCommentFilters(filters, timezone);

    params.delete('filter');
    removeLegacyCommentFilterParams(params);

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
    const lastWrittenQueryRef = useRef<string | null>(null);
    const filterParam = useMemo(() => searchParams.get('filter') ?? undefined, [searchParams]);
    const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);

    const parsedFilters = useMemo(() => {
        if (filterParam !== undefined) {
            return parseCommentFilter(filterParam, timezone);
        }

        return parseLegacyCommentFilters(searchParams);
    }, [filterParam, searchParams, timezone]);
    const [filters, setDraftFilters] = useState<Filter[]>(parsedFilters);

    const nql = useMemo(() => {
        return serializeCommentFilters(filters, timezone);
    }, [filters, timezone]);

    useEffect(() => {
        if (currentQuery !== lastWrittenQueryRef.current) {
            setDraftFilters(parsedFilters);
            lastWrittenQueryRef.current = currentQuery;
        }
    }, [currentQuery, parsedFilters]);

    useEffect(() => {
        if (lastWrittenQueryRef.current !== null && currentQuery !== lastWrittenQueryRef.current) {
            return;
        }

        const nextParams = toSearchParams(searchParams, filters, timezone);
        const nextQuery = nextParams.toString();

        if (nextQuery !== currentQuery) {
            lastWrittenQueryRef.current = nextQuery;
            setSearchParams(nextParams, {replace: true});
        }
    }, [currentQuery, filters, searchParams, setSearchParams, timezone]);

    const setFilters = useCallback((action: SetFiltersAction, options: SetFiltersOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const newParams = toSearchParams(searchParams, newFilters, timezone);
        const replace = options.replace ?? true;

        setDraftFilters(newFilters);
        lastWrittenQueryRef.current = newParams.toString();
        setSearchParams(newParams, {replace});
    }, [filters, searchParams, setSearchParams, timezone]);

    const clearFilters = useCallback(({replace = true}: SetFiltersOptions = {}) => {
        const newParams = new URLSearchParams(searchParams);

        newParams.delete('filter');

        removeLegacyCommentFilterParams(newParams);
        setDraftFilters([]);
        lastWrittenQueryRef.current = newParams.toString();
        setSearchParams(newParams, {replace});
    }, [searchParams, setSearchParams]);

    return {filters, nql, setFilters, clearFilters};
}
