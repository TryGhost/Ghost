import {describe, expect, it} from 'vitest';
import {deriveFilterFlags} from '@src/views/filters/filter-flags';

describe('deriveFilterFlags', () => {
    it('tracks hasFilters separately from hasSearch', () => {
        const flags = deriveFilterFlags({
            predicates: [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
            ],
            search: 'alex'
        });

        expect(flags).toEqual({
            hasFilters: true,
            hasSearch: true,
            hasFilterOrSearch: true
        });
    });
});
