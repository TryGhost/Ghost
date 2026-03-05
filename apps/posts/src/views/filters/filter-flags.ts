import type {FilterState} from './filter-reducer';

export interface FilterFlags {
    hasFilters: boolean;
    hasSearch: boolean;
    hasFilterOrSearch: boolean;
}

export function deriveFilterFlags(state: Pick<FilterState, 'predicates' | 'search'>): FilterFlags {
    const hasFilters = state.predicates.length > 0;
    const hasSearch = Boolean(state.search?.trim());

    return {
        hasFilters,
        hasSearch,
        hasFilterOrSearch: hasFilters || hasSearch
    };
}
