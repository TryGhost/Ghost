import {describe, expect, it} from 'vitest';
import {parseCommentFilter, serializeCommentFilters} from '@src/views/comments/comment-filter-query';
import type {FilterPredicate} from '@src/views/filters/filter-types';

function stripIds(predicates: FilterPredicate[]) {
    return predicates.map(predicate => ({
        field: predicate.field,
        operator: predicate.operator,
        values: predicate.values
    }));
}

describe('comment-filter-query', () => {
    it('parses exact-date compounds into a single predicate', () => {
        const predicates = parseCommentFilter(
            'created_at:>=\'2024-01-01T00:00:00.000Z\'+created_at:<=\'2024-01-01T23:59:59.999Z\'',
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
            'created_at:<=\'2024-01-01T23:59:59.999Z\'+created_at:>=\'2024-01-01T00:00:00.000Z\''
        );
    });

    it('round-trips comment filters in a non-UTC site timezone', () => {
        const parsed = parseCommentFilter(
            'created_at:>=\'2024-01-01T05:00:00.000Z\'+created_at:<=\'2024-01-02T04:59:59.999Z\'+member_id:member_123+status:published',
            'America/New_York'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            },
            {
                field: 'author',
                operator: 'is',
                values: ['member_123']
            },
            {
                field: 'status',
                operator: 'is',
                values: ['published']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'America/New_York')).toBe(
            'created_at:<=\'2024-01-02T04:59:59.999Z\'+created_at:>=\'2024-01-01T05:00:00.000Z\'+member_id:member_123+status:published'
        );
    });

    it('round-trips exact dates across DST transitions', () => {
        const parsed = parseCommentFilter(
            'created_at:>=\'2024-03-10T05:00:00.000Z\'+created_at:<=\'2024-03-11T03:59:59.999Z\'',
            'America/New_York'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-03-10']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'America/New_York')).toBe(
            'created_at:<=\'2024-03-11T03:59:59.999Z\'+created_at:>=\'2024-03-10T05:00:00.000Z\''
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

    it('round-trips mapped comment fields through canonical NQL', () => {
        const parsed = parseCommentFilter(
            'count.reports:0+html:~\'ghost\'+member_id:member_123+post_id:post_456+status:hidden',
            'UTC'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'reported',
                operator: 'is',
                values: ['false']
            },
            {
                field: 'body',
                operator: 'contains',
                values: ['ghost']
            },
            {
                field: 'author',
                operator: 'is',
                values: ['member_123']
            },
            {
                field: 'post',
                operator: 'is',
                values: ['post_456']
            },
            {
                field: 'status',
                operator: 'is',
                values: ['hidden']
            }
        ]);

        expect(serializeCommentFilters(parsed, 'UTC')).toBe(
            'count.reports:0+html:~\'ghost\'+member_id:member_123+post_id:post_456+status:hidden'
        );
    });

    it('drops unsupported fields such as id from canonical parsing', () => {
        const parsed = parseCommentFilter('id:comment_123+status:published', 'UTC');

        expect(stripIds(parsed)).toEqual([
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
