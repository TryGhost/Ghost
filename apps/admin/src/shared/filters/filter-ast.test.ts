import {describe, expect, it} from 'vitest';
import {extractComparator, extractFieldName} from './filter-ast';
import {parseFilterToAst} from './filter-query-core';
import type {AstNode} from './filter-ast';

function ast(filter: string): AstNode {
    const node = parseFilterToAst(filter);

    if (!node) {
        throw new Error(`could not parse: ${filter}`);
    }

    return node;
}

describe('filter-ast helpers', () => {
    it('extracts simple field names', () => {
        const node = ast('status:paid');

        expect(extractFieldName(node)).toBe('status');
    });

    it('extracts comparators from simple nodes', () => {
        const lessThanNode = ast('created_at:<\'2024-01-01\'');
        const equalNode = ast('status:paid');

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
        const compoundNode = ast('(status:paid+email:~\'ghost\')');

        expect(compoundNode.$and).toEqual([
            {status: 'paid'},
            {email: {$regex: /ghost/i}}
        ]);
    });

    it('returns undefined for non-simple nodes', () => {
        const compoundNode = ast('(status:paid+email:~\'ghost\')');

        expect(extractFieldName(compoundNode)).toBeUndefined();
        expect(extractComparator(compoundNode)).toBeUndefined();
    });
});
