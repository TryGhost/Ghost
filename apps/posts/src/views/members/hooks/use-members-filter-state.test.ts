import {describe, expect, it} from 'vitest';
import {filtersToSearchParams, searchParamsToFilters} from '@src/views/members/hooks/use-members-filter-state';
import type {Filter} from '@tryghost/shade';

describe('use-members-filter-state URL helpers', () => {
    it('preserves duplicate field predicates through URL roundtrip', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
        ];

        const params = filtersToSearchParams(filters);
        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'status', operator: 'is_not', values: ['free']}
        ]);
    });
});
