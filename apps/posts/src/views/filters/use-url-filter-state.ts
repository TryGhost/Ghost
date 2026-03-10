import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

export interface UrlFilterStateOptions {
    replace?: boolean;
}

interface UseUrlFilterStateConfig<TDerived> {
    parseFilters: (searchParams: URLSearchParams) => Filter[];
    serializeFilters: (filters: Filter[], search?: string) => URLSearchParams;
    clearSearchParams: (searchParams: URLSearchParams) => URLSearchParams;
    buildNql: (filters: Filter[]) => string | undefined;
    deriveState?: (params: {filters: Filter[]; search: string}) => TDerived;
}

interface BaseUrlFilterState {
    filters: Filter[];
    nql: string | undefined;
    search: string;
    setFilters: (action: SetFiltersAction, options?: UrlFilterStateOptions) => void;
    setSearch: (search: string, options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
}

export function useUrlFilterState<TDerived extends object = Record<string, never>>({
    parseFilters,
    serializeFilters,
    clearSearchParams,
    buildNql,
    deriveState
}: UseUrlFilterStateConfig<TDerived>): BaseUrlFilterState & TDerived {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo(() => {
        return parseFilters(searchParams);
    }, [parseFilters, searchParams]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const setFilters = useCallback((action: SetFiltersAction, options: UrlFilterStateOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const currentSearch = searchParams.get('search') ?? undefined;
        const newParams = serializeFilters(newFilters, currentSearch);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, searchParams, serializeFilters, setSearchParams]);

    const setSearch = useCallback((newSearch: string, options: UrlFilterStateOptions = {}) => {
        const newParams = serializeFilters(filters, newSearch || undefined);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, serializeFilters, setSearchParams]);

    const clearFilters = useCallback(({replace = true}: UrlFilterStateOptions = {}) => {
        setSearchParams(clearSearchParams(searchParams), {replace});
    }, [clearSearchParams, searchParams, setSearchParams]);

    const nql = useMemo(() => buildNql(filters), [buildNql, filters]);

    const derivedState = useMemo(() => {
        return deriveState?.({filters, search}) ?? {} as TDerived;
    }, [deriveState, filters, search]);

    return {
        filters,
        nql,
        search,
        setFilters,
        setSearch,
        clearFilters,
        ...derivedState
    };
}
