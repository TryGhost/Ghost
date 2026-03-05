export interface FilterPredicate {
    id: string;
    field: string;
    operator: string;
    values: unknown[];
}

export interface FilterState {
    predicates: FilterPredicate[];
    search?: string;
}

export type FilterAction =
    {
        type: 'clearPredicates';
    }
    | {
        type: 'addPredicate';
        predicate: FilterPredicate;
    };

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
    switch (action.type) {
    case 'clearPredicates':
        return {
            ...state,
            predicates: []
        };
    case 'addPredicate':
        return {
            ...state,
            predicates: [...state.predicates, action.predicate]
        };
    }
}
