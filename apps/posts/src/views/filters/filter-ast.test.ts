import nql from '@tryghost/nql-lang';
import {describe, expect, it} from 'vitest';
import {extractComparator, extractFieldName} from './filter-ast';

describe('filter-ast helpers', () => {
    it('extracts simple field names', () => {
        const node = nql.parse('status:paid') as Record<string, unknown>;

        expect(extractFieldName(node)).toBe('status');
    });

    it('extracts comparators from simple nodes', () => {
        const lessThanNode = nql.parse('created_at:<\'2024-01-01\'') as Record<string, unknown>;
        const equalNode = nql.parse('status:paid') as Record<string, unknown>;

        expect(extractComparator(lessThanNode)).toEqual({
            field: 'created_at',
            operator: '$lt',
            value: '2024-01-01'
        });
        expect(extractComparator(equalNode)).toEqual({
            field: 'status',
            operator: '$eq',
            value: 'paid'
        });
    });

    it('preserves grouped nodes in the parsed AST', () => {
        const compoundNode = nql.parse('(status:paid+email:~\'ghost\')') as Record<string, unknown>;

        expect(compoundNode.$and).toEqual([
            {status: 'paid'},
            {email: {$regex: /ghost/i}}
        ]);
    });

    it('returns undefined for non-simple nodes', () => {
        const compoundNode = nql.parse('(status:paid+email:~\'ghost\')') as Record<string, unknown>;

        expect(extractFieldName(compoundNode)).toBeUndefined();
        expect(extractComparator(compoundNode)).toBeUndefined();
    });
});
