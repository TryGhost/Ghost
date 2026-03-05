import {describe, expect, it} from 'vitest';
import {parsePredicateParams, serializePredicateParams} from '@src/views/filters/url-predicate-params';

describe('predicate URL params', () => {
    it('preserves duplicate field predicates and separate search channel', () => {
        const serialized = serializePredicateParams({
            predicates: [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
                {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
            ],
            search: 'alex',
            multiselectFields: new Set()
        });

        expect(serialized.getAll('status')).toEqual(['is:paid', 'is_not:free']);
        expect(serialized.get('search')).toBe('alex');

        const parsed = parsePredicateParams({
            params: serialized,
            multiselectFields: new Set(),
            ignoredFields: new Set(['search'])
        });

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'status', operator: 'is_not', values: ['free']}
        ]);
    });
});
