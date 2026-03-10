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
        type: 'resetState';
    }
    | {
        type: 'setSearch';
        search: string;
    };

function predicatesEqual<TPredicate extends FilterPredicate>(left: TPredicate, right: TPredicate): boolean {
    return left.id === right.id
        && left.field === right.field
        && left.operator === right.operator
        && left.values.length === right.values.length
        && left.values.every((value, index) => value === right.values[index]);
}

function predicateIdOrderEqual<TPredicate extends FilterPredicate>(left: TPredicate[], right: TPredicate[]): boolean {
    return left.length === right.length
        && left.every((predicate, index) => predicate.id === right[index]?.id);
}

function applyPredicateActions<TPredicate extends FilterPredicate>(
    currentPredicates: TPredicate[],
    actions: Array<FilterAction<TPredicate>>
): TPredicate[] {
    return actions.reduce((predicates, action) => {
        switch (action.type) {
        case 'setPredicates':
            return action.predicates;
        case 'addPredicate':
            return [...predicates, action.predicate];
        case 'replacePredicate':
            return predicates.map(predicate => (
                predicate.id === action.predicateId ? action.predicate : predicate
            ));
        case 'removePredicate':
            return predicates.filter(predicate => predicate.id !== action.predicateId);
        case 'clearPredicates':
            return [];
        case 'resetState':
            return [];
        case 'setSearch':
            return predicates;
        }
    }, currentPredicates);
}

export function derivePredicateActions<TPredicate extends FilterPredicate>(
    currentPredicates: TPredicate[],
    nextPredicates: TPredicate[]
): Array<FilterAction<TPredicate>> {
    const actions: Array<FilterAction<TPredicate>> = [];
    const currentById = new Map(currentPredicates.map(predicate => [predicate.id, predicate]));
    const nextById = new Map(nextPredicates.map(predicate => [predicate.id, predicate]));

    for (const predicate of currentPredicates) {
        if (!nextById.has(predicate.id)) {
            actions.push({
                type: 'removePredicate',
                predicateId: predicate.id
            });
        }
    }

    for (const predicate of nextPredicates) {
        const currentPredicate = currentById.get(predicate.id);

        if (!currentPredicate) {
            actions.push({
                type: 'addPredicate',
                predicate
            });
            continue;
        }

        if (!predicatesEqual(currentPredicate, predicate)) {
            actions.push({
                type: 'replacePredicate',
                predicateId: predicate.id,
                predicate
            });
        }
    }

    const projectedPredicates = applyPredicateActions(currentPredicates, actions);

    if (!predicateIdOrderEqual(projectedPredicates, nextPredicates)
        || projectedPredicates.some((predicate, index) => !predicatesEqual(predicate, nextPredicates[index]!))) {
        return [{
            type: 'setPredicates',
            predicates: nextPredicates
        }];
    }

    return actions;
}

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
    case 'resetState':
        return {
            predicates: [],
            search: ''
        };
    case 'setSearch':
        return {
            ...state,
            search: action.search
        };
    }
}
