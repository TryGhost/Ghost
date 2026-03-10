export interface FilterPredicate<
    TField extends string = string,
    TOperator extends string = string,
    TValue = unknown
> {
    id: string;
    field: TField;
    operator: TOperator;
    values: TValue[];
}

export interface FilterState<TPredicate extends FilterPredicate = FilterPredicate> {
    predicates: TPredicate[];
    search?: string;
}

export type FilterAction<TPredicate extends FilterPredicate = FilterPredicate> =
    | {
        type: 'setPredicates';
        predicates: TPredicate[];
    }
    | {
        type: 'addPredicate';
        predicate: TPredicate;
    }
    | {
        type: 'replacePredicate';
        predicateId: string;
        predicate: TPredicate;
    }
    | {
        type: 'removePredicate';
        predicateId: string;
    }
    | {
        type: 'clearPredicates';
    }
    | {
        type: 'setSearch';
        search: string;
    };

export function filterReducer<TPredicate extends FilterPredicate>(
    state: FilterState<TPredicate>,
    action: FilterAction<TPredicate>
): FilterState<TPredicate> {
    switch (action.type) {
    case 'setPredicates':
        return {
            ...state,
            predicates: action.predicates
        };
    case 'addPredicate':
        return {
            ...state,
            predicates: [...state.predicates, action.predicate]
        };
    case 'replacePredicate':
        return {
            ...state,
            predicates: state.predicates.map(predicate => (
                predicate.id === action.predicateId ? action.predicate : predicate
            ))
        };
    case 'removePredicate':
        return {
            ...state,
            predicates: state.predicates.filter(predicate => predicate.id !== action.predicateId)
        };
    case 'clearPredicates':
        return {
            ...state,
            predicates: []
        };
    case 'setSearch':
        return {
            ...state,
            search: action.search
        };
    }
}
