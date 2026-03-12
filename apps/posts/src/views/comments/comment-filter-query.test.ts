import {describe, expect, it} from 'vitest';
import {parseCommentFilter, serializeCommentFilters} from './comment-filter-query';
import type {FilterPredicate} from '../filters/filter-types';

function stripIds(predicates: FilterPredicate[]) {
    return predicates.map(({id: _id, ...predicate}) => predicate);
}

describe('comment-filter-query', () => {
    it('parses exact-date compounds into a single predicate', () => {
        const predicates = parseCommentFilter(
            "created_at:>='2024-01-01T00:00:00.000Z'+created_at:<='2024-01-01T23:59:59.999Z'",
            'UTC'
        );

        expect(stripIds(predicates)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            }
        ]);
    });

    it('serializes exact-date compounds canonically', () => {
        const predicates: FilterPredicate[] = [
            {
                id: '1',
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            }
        ];

        expect(serializeCommentFilters(predicates, 'UTC')).toBe(
            "created_at:<='2024-01-01T23:59:59.999Z'+created_at:>='2024-01-01T00:00:00.000Z'"
        );
    });

    it('round-trips exact-date compounds in site timezones', () => {
        const parsed = parseCommentFilter(
            "created_at:>='2024-01-31T23:00:00.000Z'+created_at:<='2024-02-01T22:59:59.999Z'",
            'Europe/Stockholm'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-02-01']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'Europe/Stockholm')).toBe(
            "created_at:<='2024-02-01T22:59:59.999Z'+created_at:>='2024-01-31T23:00:00.000Z'"
        );
    });

    it('parses and serializes reported filters', () => {
        const parsed = parseCommentFilter('count.reports:>0', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {
                field: 'reported',
                operator: 'is',
                values: ['true']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'UTC')).toBe('count.reports:>0');
    });

    it('round-trips the id quick filter canonically', () => {
        const parsed = parseCommentFilter('id:comment_123', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {
                field: 'id',
                operator: 'is',
                values: ['comment_123']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'UTC')).toBe('id:comment_123');
    });

    it('sorts clauses canonically on serialize', () => {
        const predicates: FilterPredicate[] = [
            {id: '2', field: 'status', operator: 'is', values: ['published']},
            {id: '1', field: 'reported', operator: 'is', values: ['false']}
        ];

        expect(serializeCommentFilters(predicates, 'UTC')).toBe('count.reports:0+status:published');
    });

    it('round-trips canonical comment examples', () => {
        const filter = "count.reports:0+created_at:>='2024-01-01T00:00:00.000Z'+created_at:<='2024-01-01T23:59:59.999Z'+status:published";
        const parsed = parseCommentFilter(filter, 'UTC');

        expect(serializeCommentFilters(parsed, 'UTC')).toBe(
            "count.reports:0+created_at:<='2024-01-01T23:59:59.999Z'+created_at:>='2024-01-01T00:00:00.000Z'+status:published"
        );
    });

    it('claims exact-date compounds before leaving leftovers to simple dispatch', () => {
        const parsed = parseCommentFilter(
            "created_at:>='2024-01-01T00:00:00.000Z'+created_at:<='2024-01-01T23:59:59.999Z'+id:comment_123",
            'UTC'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            },
            {
                field: 'id',
                operator: 'is',
                values: ['comment_123']
            }
        ]);
    });

    it('parses nested exact-date compounds recursively', () => {
        const parsed = parseCommentFilter(
            "((created_at:>='2024-01-01T00:00:00.000Z'+created_at:<='2024-01-01T23:59:59.999Z')+status:published)",
            'UTC'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            },
            {
                field: 'status',
                operator: 'is',
                values: ['published']
            }
        ]);
    });

    it('ignores malformed NQL input', () => {
        expect(parseCommentFilter('created_at:(', 'UTC')).toEqual([]);
    });
});
