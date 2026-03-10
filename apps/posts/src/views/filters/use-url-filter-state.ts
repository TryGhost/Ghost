import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import {filterReducer} from './filter-reducer';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction = Filter[] | ((prevFilters: Filter[]) => Filter[]);

export interface UrlFilterStateOptions {
    replace?: boolean;
}

interface UseUrlFilterStateConfig<TDerived> {
    parseFilters: (searchParams: URLSearchParams) => Filter[];
    serializeFilters: (filters: Filter[], search?: string) => URLSearchParams;
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

    const state = useMemo(() => ({
        predicates: filters,
        search
    }), [filters, search]);

    const setFilters = useCallback((action: SetFiltersAction, options: UrlFilterStateOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const nextState = filterReducer(state, {
            type: 'setPredicates',
            predicates: newFilters
        });
        const newParams = serializeFilters(nextState.predicates, nextState.search || undefined);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [filters, serializeFilters, setSearchParams, state]);

    const setSearch = useCallback((newSearch: string, options: UrlFilterStateOptions = {}) => {
        const nextState = filterReducer(state, {
            type: 'setSearch',
            search: newSearch
        });
        const newParams = serializeFilters(nextState.predicates, nextState.search || undefined);

        const replace = options.replace ?? true;
        setSearchParams(newParams, {replace});
    }, [serializeFilters, setSearchParams, state]);

    const clearFilters = useCallback(({replace = true}: UrlFilterStateOptions = {}) => {
        const nextState = filterReducer(state, {
            type: 'clearPredicates'
        });
        const newParams = serializeFilters(nextState.predicates, nextState.search || undefined);

        setSearchParams(newParams, {replace});
    }, [serializeFilters, setSearchParams, state]);

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
