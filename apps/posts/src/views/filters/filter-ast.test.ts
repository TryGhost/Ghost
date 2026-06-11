import nql from '@tryghost/nql-lang';
import {describe, expect, it} from 'vitest';
import {extractAndClauses, extractComparator, extractFieldName, serializeAstToNql} from './filter-ast';
import type {AstNode} from './filter-ast';

function parse(filter: string): AstNode {
    return nql.parse(filter, {preserveRelativeDates: true}) as AstNode;
}

function roundTrip(filter: string): string | undefined {
    return serializeAstToNql(parse(filter));
}

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

describe('extractAndClauses', () => {
    it('returns the children of a root AND', () => {
        expect(extractAndClauses(parse('status:paid+label:vip+email_count:>5'))).toEqual([
            {status: 'paid'},
            {label: 'vip'},
            {email_count: {$gt: 5}}
        ]);
    });

    it('keeps parenthesized groups as a single clause', () => {
        expect(extractAndClauses(parse('(status:paid,label:vip)+created_at:>now+7d'))).toEqual([
            {$or: [{status: 'paid'}, {label: 'vip'}]},
            {created_at: {$gt: {$relativeDate: {op: 'add', amount: 7, unit: 'days'}}}}
        ]);
    });

    it('treats a filter without a root AND as a single clause', () => {
        expect(extractAndClauses(parse('status:paid,label:vip'))).toEqual([
            {$or: [{status: 'paid'}, {label: 'vip'}]}
        ]);
    });
});

describe('serializeAstToNql', () => {
    it('round-trips comparisons, lists and booleans', () => {
        expect(roundTrip('status:paid')).toBe('status:paid');
        expect(roundTrip('status:-free')).toBe('status:-free');
        expect(roundTrip('email_count:>5')).toBe('email_count:>5');
        expect(roundTrip('email_count:>=5+email_count:<=10')).toBe('email_count:>=5+email_count:<=10');
        expect(roundTrip('label:[vip,gold]')).toBe('label:[vip,gold]');
        expect(roundTrip('label:-[vip,gold]')).toBe('label:-[vip,gold]');
        expect(roundTrip('subscribed:true+email_disabled:0')).toBe('subscribed:true+email_disabled:0');
        expect(roundTrip('deleted_at:null')).toBe('deleted_at:null');
    });

    it('round-trips contains, starts-with, ends-with and negated regex forms', () => {
        expect(roundTrip('name:~\'jamie\'')).toBe('name:~\'jamie\'');
        expect(roundTrip('name:~^\'jamie\'')).toBe('name:~^\'jamie\'');
        expect(roundTrip('name:~$\'jamie\'')).toBe('name:~$\'jamie\'');
        expect(roundTrip('name:-~\'jamie\'')).toBe('name:-~\'jamie\'');
        expect(roundTrip('name:~\'a+b.c\'')).toBe('name:~\'a+b.c\'');
    });

    it('round-trips relative dates', () => {
        expect(roundTrip('created_at:>=now-30d')).toBe('created_at:>=now-30d');
        expect(roundTrip('expiry:<now+2w')).toBe('expiry:<now+2w');
    });

    it('round-trips compounds, parenthesizing nested groups but not a root OR', () => {
        expect(roundTrip('status:paid,label:vip')).toBe('status:paid,label:vip');
        expect(roundTrip('(status:paid,label:vip)')).toBe('status:paid,label:vip');
        expect(roundTrip('status:free+(label:vip,name:jamie)')).toBe('status:free+(label:vip,name:jamie)');
        expect(roundTrip('(subscribed:true+email_disabled:0),status:comped')).toBe('(subscribed:true+email_disabled:0),status:comped');
    });

    it('quotes values that would change type or fail to lex when bare', () => {
        expect(roundTrip('label:\'two words\'')).toBe('label:\'two words\'');
        expect(roundTrip('label:\'123\'')).toBe('label:\'123\'');
        expect(roundTrip('label:\'true\'')).toBe('label:\'true\'');
        expect(roundTrip('label:\'now-7d\'')).toBe('label:\'now-7d\'');
        expect(roundTrip('label:\'it\\\'s\'')).toBe('label:\'it\\\'s\'');
        expect(roundTrip('created_at:<\'2024-01-01 00:00:00\'')).toBe('created_at:<\'2024-01-01 00:00:00\'');
    });

    it('emits lexer-safe literals bare', () => {
        expect(roundTrip('email:jamie@example.com')).toBe('email:jamie@example.com');
        expect(roundTrip('newsletters.slug:weekly-news')).toBe('newsletters.slug:weekly-news');
    });

    it('reparses to the identical AST', () => {
        const filters = [
            'count.active_stripe_customers:>1',
            '(status:paid,label:vip)+name:~\'a+b\'',
            'created_at:>=now-30d+label:-[vip]',
            'subscribed:false,email_disabled:1'
        ];

        for (const filter of filters) {
            const serialized = serializeAstToNql(parse(filter));

            expect(serialized).toBeDefined();
            expect(parse(serialized as string)).toEqual(parse(filter));
        }
    });

    it('returns undefined for shapes the parser cannot produce', () => {
        expect(serializeAstToNql({})).toBeUndefined();
        expect(serializeAstToNql({status: 'paid', label: 'vip'})).toBeUndefined();
        expect(serializeAstToNql({$unknown: [{status: 'paid'}]})).toBeUndefined();
        expect(serializeAstToNql({status: {$exists: true}})).toBeUndefined();
        expect(serializeAstToNql({email_count: -5})).toBeUndefined();
        expect(serializeAstToNql({name: {$regex: /jamie/}})).toBeUndefined();
        expect(serializeAstToNql({name: {$regex: /jam.e/i}})).toBeUndefined();
        expect(serializeAstToNql({label: {$in: []}})).toBeUndefined();
    });
});
