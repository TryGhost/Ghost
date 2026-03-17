import {defineFields} from './filter-types';
import {describe, expect, it} from 'vitest';
import {importSimpleLegacyNodes, parseLegacyFilterToAst, stampImportedFilters} from './legacy-filter-import';
import {numberNql, scalarNql} from './filter-nql';
import type {AstNode} from './filter-ast';

const fields = defineFields({
    status: {
        operators: ['is', 'is-not'],
        ui: {
            label: 'Status',
            type: 'select'
        },
        ...scalarNql()
    },
    email_count: {
        operators: ['is', 'is-greater', 'is-or-less'],
        ui: {
            label: 'Email count',
            type: 'number'
        },
        ...numberNql()
    },
    author: {
        operators: ['is', 'is-not'],
        parseKeys: ['member_id'],
        ui: {
            label: 'Author',
            type: 'select'
        },
        ...scalarNql({field: 'member_id'})
    }
});

describe('legacy-filter-import', () => {
    it('parses NQL into a traversable AST for compatibility import', () => {
        const ast = parseLegacyFilterToAst('status:paid+email_count:>5');

        expect((ast as Record<string, unknown>).$and).toEqual([
            {status: 'paid'},
            {email_count: {$gt: 5}}
        ]);
    });

    it('returns undefined for malformed NQL', () => {
        expect(parseLegacyFilterToAst('status:(')).toBeUndefined();
    });

    it('imports simple nodes into unstamped filters', () => {
        const ast = parseLegacyFilterToAst('status:paid+email_count:>5');
        const filters = importSimpleLegacyNodes((ast as Record<string, unknown>).$and as AstNode[], fields, 'UTC');

        expect(filters).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'email_count', operator: 'is-greater', values: [5]}
        ]);
    });

    it('skips unknown simple nodes', () => {
        const ast = parseLegacyFilterToAst('status:paid+unknown:test');
        const filters = importSimpleLegacyNodes((ast as Record<string, unknown>).$and as AstNode[], fields, 'UTC');

        expect(filters).toEqual([
            {field: 'status', operator: 'is', values: ['paid']}
        ]);
    });

    it('imports through declared parse aliases when the AST field name differs', () => {
        const ast = parseLegacyFilterToAst('member_id:abc123');
        const filters = importSimpleLegacyNodes([ast as AstNode], fields, 'UTC');

        expect(filters).toEqual([
            {field: 'author', operator: 'is', values: ['abc123']}
        ]);
    });

    it('stamps imported filters with deterministic ids', () => {
        expect(stampImportedFilters([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'author', operator: 'is', values: ['abc123']}
        ])).toEqual([
            {id: 'status:1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'author:2', field: 'author', operator: 'is', values: ['abc123']}
        ]);
    });
});
