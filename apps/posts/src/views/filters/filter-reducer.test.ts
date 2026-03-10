import {describe, expect, it} from 'vitest';
import {filterReducer} from '@src/views/filters/filter-reducer';

describe('filterReducer', () => {
    it('clears predicates without clearing search', () => {
        const state = {
            predicates: [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
            ],
            search: 'alex'
        };

        const nextState = filterReducer(state, {type: 'clearPredicates'});

        expect(nextState).toEqual({
            predicates: [],
            search: 'alex'
        });
    });

    it('allows multiple predicates with the same field', () => {
        const firstPredicate = {
            id: 'status-1',
            field: 'status',
            operator: 'is',
            values: ['paid']
        };

        const secondPredicate = {
            id: 'status-2',
            field: 'status',
            operator: 'is_not',
            values: ['free']
        };

        const state = {
            predicates: [firstPredicate]
        };

        const nextState = filterReducer(state, {
            type: 'addPredicate',
            predicate: secondPredicate
        });

        expect(nextState.predicates).toEqual([firstPredicate, secondPredicate]);
    });

    it('removes one predicate by id without disturbing duplicates', () => {
        const firstPredicate = {
            id: 'status-1',
            field: 'status',
            operator: 'is',
            values: ['paid']
        };

        const secondPredicate = {
            id: 'status-2',
            field: 'status',
            operator: 'is_not',
            values: ['free']
        };

        const nextState = filterReducer({
            predicates: [firstPredicate, secondPredicate]
        }, {
            type: 'removePredicate',
            predicateId: 'status-1'
        });

        expect(nextState.predicates).toEqual([secondPredicate]);
    });

    it('replaces one predicate by id without disturbing others', () => {
        const firstPredicate = {
            id: 'status-1',
            field: 'status',
            operator: 'is',
            values: ['paid']
        };

        const secondPredicate = {
            id: 'email-1',
            field: 'email',
            operator: 'contains',
            values: ['alex@example.com']
        };

        const updatedPredicate = {
            id: 'status-1',
            field: 'status',
            operator: 'is_not',
            values: ['free']
        };

        const nextState = filterReducer({
            predicates: [firstPredicate, secondPredicate]
        }, {
            type: 'replacePredicate',
            predicateId: 'status-1',
            predicate: updatedPredicate
        });

        expect(nextState.predicates).toEqual([updatedPredicate, secondPredicate]);
    });

    it('updates search without touching predicates', () => {
        const predicate = {
            id: 'status-1',
            field: 'status',
            operator: 'is',
            values: ['paid']
        };

        const nextState = filterReducer({
            predicates: [predicate],
            search: 'alex'
        }, {
            type: 'setSearch',
            search: 'jamie'
        });

        expect(nextState).toEqual({
            predicates: [predicate],
            search: 'jamie'
        });
    });
});
