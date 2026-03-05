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
});
