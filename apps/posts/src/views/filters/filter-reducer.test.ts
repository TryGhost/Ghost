import {describe, expect, it} from 'vitest';
import {derivePredicateActions, filterReducer} from '@src/views/filters/filter-reducer';

describe('filterReducer', () => {
    it('derives an add action when the next payload appends a predicate', () => {
        const currentPredicates = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
        ];

        const nextPredicates = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
        ];

        expect(derivePredicateActions(currentPredicates, nextPredicates)).toEqual([
            {
                type: 'addPredicate',
                predicate: {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
            }
        ]);
    });

    it('falls back to setPredicates when the next payload only changes order', () => {
        const currentPredicates = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']}
        ];

        const nextPredicates = [
            {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']},
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
        ];

        expect(derivePredicateActions(currentPredicates, nextPredicates)).toEqual([
            {
                type: 'setPredicates',
                predicates: nextPredicates
            }
        ]);
    });

    it('falls back to setPredicates when removals and reordering happen together', () => {
        const currentPredicates = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']},
            {id: 'label-1', field: 'label', operator: 'is_any_of', values: ['vip']}
        ];

        const nextPredicates = [
            {id: 'label-1', field: 'label', operator: 'is_any_of', values: ['vip']},
            {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']}
        ];

        expect(derivePredicateActions(currentPredicates, nextPredicates)).toEqual([
            {
                type: 'setPredicates',
                predicates: nextPredicates
            }
        ]);
    });

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

    it('resets predicates and search together', () => {
        const state = {
            predicates: [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
            ],
            search: 'alex'
        };

        const nextState = filterReducer(state, {type: 'resetState'});

        expect(nextState).toEqual({
            predicates: [],
            search: ''
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
