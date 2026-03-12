import {defineFields} from './filter-types';
import {describe, expect, it} from 'vitest';
import {dispatchSimpleNodes, parseFilterToAst, serializePredicates} from './filter-query-core';
import {numberCodec, scalarCodec} from './filter-codecs';
import type {AstNode} from './filter-ast';
import type {FilterPredicate} from './filter-types';

const fields = defineFields({
    status: {
        operators: ['is', 'is-not'],
        ui: {
            label: 'Status',
            type: 'select'
        },
        codec: scalarCodec()
    },
    email_count: {
        operators: ['is', 'is-greater', 'is-or-less'],
        ui: {
            label: 'Email count',
            type: 'number'
        },
        codec: numberCodec()
    },
    'newsletters.:slug': {
        operators: ['is', 'is-not'],
        ui: {
            label: 'Newsletter',
            type: 'select'
        },
        codec: scalarCodec()
    },
    author: {
        operators: ['is', 'is-not'],
        parseKeys: ['member_id'],
        ui: {
            label: 'Author',
            type: 'select'
        },
        codec: scalarCodec({field: 'member_id'})
    }
});

describe('filter-query-core', () => {
    it('parses NQL into a traversable AST for surface-level composition', () => {
        const ast = parseFilterToAst('status:paid+email_count:>5');

        expect((ast as Record<string, unknown>).$and).toEqual([
            {status: 'paid'},
            {email_count: {$gt: 5}}
        ]);
    });

    it('returns undefined for malformed NQL', () => {
        expect(parseFilterToAst('status:(')).toBeUndefined();
    });

    it('dispatches simple nodes into parsed predicates', () => {
        const ast = parseFilterToAst('status:paid+email_count:>5');
        const predicates = dispatchSimpleNodes((ast as Record<string, unknown>).$and as AstNode[], fields, 'UTC');

        expect(predicates).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'email_count', operator: 'is-greater', values: [5]}
        ]);
    });

    it('skips unknown simple nodes', () => {
        const ast = parseFilterToAst('status:paid+unknown:test');
        const predicates = dispatchSimpleNodes((ast as Record<string, unknown>).$and as AstNode[], fields, 'UTC');

        expect(predicates).toEqual([
            {field: 'status', operator: 'is', values: ['paid']}
        ]);
    });

    it('dispatches through declared parse aliases when the AST field name differs', () => {
        const ast = parseFilterToAst('member_id:abc123');
        const predicates = dispatchSimpleNodes([ast as AstNode], fields, 'UTC');

        expect(predicates).toEqual([
            {field: 'author', operator: 'is', values: ['abc123']}
        ]);
    });

    it('serializes predicates through resolved fields and drops unresolved ones', () => {
        const predicates: FilterPredicate[] = [
            {id: '1', field: 'status', operator: 'is', values: ['paid']},
            {id: '2', field: 'newsletters.weekly', operator: 'is-not', values: ['inactive']},
            {id: '3', field: 'unknown', operator: 'is', values: ['test']}
        ];

        expect(serializePredicates(predicates, fields, 'UTC')).toBe('newsletters.weekly:-inactive+status:paid');
    });

    it('round-trips simple predicates canonically', () => {
        const ast = parseFilterToAst('status:paid+email_count:>5');
        const parsed = dispatchSimpleNodes((ast as Record<string, unknown>).$and as AstNode[], fields, 'UTC').map((predicate, index) => ({
            ...predicate,
            id: String(index + 1)
        }));

        expect(serializePredicates(parsed, fields, 'UTC')).toBe('email_count:>5+status:paid');
    });
});
