import {useCallback, useMemo} from 'react';
import {useSearchParams} from '@tryghost/admin-x-framework';
import {derivePredicateActions, filterReducer, type FilterState} from './filter-reducer';
import type {Filter} from '@tryghost/shade';

type SetFiltersAction<TPredicate extends Filter> = TPredicate[] | ((prevFilters: TPredicate[]) => TPredicate[]);

export interface UrlFilterStateOptions {
    replace?: boolean;
}

interface UseUrlFilterStateConfig<TPredicate extends Filter, TDerived> {
    parseFilters: (searchParams: URLSearchParams) => TPredicate[];
    serializeFilters: (filters: TPredicate[], search?: string) => URLSearchParams;
    buildNql: (filters: TPredicate[]) => string | undefined;
    deriveState?: (params: {filters: TPredicate[]; search: string}) => TDerived;
}

interface BaseUrlFilterState<TPredicate extends Filter> {
    filters: TPredicate[];
    nql: string | undefined;
    search: string;
    setFilters: (action: SetFiltersAction<TPredicate>, options?: UrlFilterStateOptions) => void;
    setSearch: (search: string, options?: UrlFilterStateOptions) => void;
    clearFilters: (options?: UrlFilterStateOptions) => void;
    resetState: (options?: UrlFilterStateOptions) => void;
}

export function useUrlFilterState<TPredicate extends Filter = Filter, TDerived extends object = Record<string, never>>({
    parseFilters,
    serializeFilters,
    buildNql,
    deriveState
}: UseUrlFilterStateConfig<TPredicate, TDerived>): BaseUrlFilterState<TPredicate> & TDerived {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo(() => {
        return parseFilters(searchParams);
    }, [parseFilters, searchParams]);

    const search = useMemo(() => {
        return searchParams.get('search') ?? '';
    }, [searchParams]);

    const state = useMemo<FilterState<TPredicate>>(() => ({
        predicates: filters,
        search
    }), [filters, search]);

    const setFilters = useCallback((action: SetFiltersAction<TPredicate>, options: UrlFilterStateOptions = {}) => {
        const newFilters = typeof action === 'function' ? action(filters) : action;
        const predicateActions = derivePredicateActions(state.predicates, newFilters);
        const nextState = predicateActions.reduce<FilterState<TPredicate>>((currentState, predicateAction) => {
            return filterReducer(currentState, predicateAction);
        }, state);
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

    const resetState = useCallback(({replace = true}: UrlFilterStateOptions = {}) => {
        const nextState = filterReducer(state, {
            type: 'resetState'
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
        resetState,
        ...derivedState
    };
}
