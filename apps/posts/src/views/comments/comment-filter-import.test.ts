import {describe, expect, it} from 'vitest';
import {importLegacyCommentFilters} from './comment-filter-import';
import type {Filter} from '@tryghost/shade';

function stripIds(filters: Filter[]) {
    return filters.map(filter => ({
        field: filter.field,
        operator: filter.operator,
        values: filter.values
    }));
}

describe('comment-filter-import', () => {
    it('parses exact-date compounds into a single filter', () => {
        const filters = importLegacyCommentFilters(
            'created_at:>=\'2024-01-01T00:00:00.000Z\'+created_at:<=\'2024-01-01T23:59:59.999Z\'',
            'UTC'
        );

        expect(stripIds(filters)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            }
        ]);
    });

    it('imports exact-date compounds in site timezones', () => {
        const parsed = importLegacyCommentFilters(
            'created_at:>=\'2024-01-31T23:00:00.000Z\'+created_at:<=\'2024-02-01T22:59:59.999Z\'',
            'Europe/Stockholm'
        );

        expect(stripIds(parsed)).toEqual([
            {
                field: 'created_at',
                operator: 'is',
                values: ['2024-02-01']
            }
        ]);
    });

    it('parses reported filters', () => {
        const parsed = importLegacyCommentFilters('count.reports:>0', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {
                field: 'reported',
                operator: 'is',
                values: ['true']
            }
        ]);
    });

    it('imports the id quick filter canonically', () => {
        const parsed = importLegacyCommentFilters('id:comment_123', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {
                field: 'id',
                operator: 'is',
                values: ['comment_123']
            }
        ]);
    });

    it('claims exact-date compounds before leaving leftovers to simple import', () => {
        const parsed = importLegacyCommentFilters(
            'created_at:>=\'2024-01-01T00:00:00.000Z\'+created_at:<=\'2024-01-01T23:59:59.999Z\'+id:comment_123',
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
        const parsed = importLegacyCommentFilters(
            '((created_at:>=\'2024-01-01T00:00:00.000Z\'+created_at:<=\'2024-01-01T23:59:59.999Z\')+status:published)',
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
        expect(importLegacyCommentFilters('created_at:(', 'UTC')).toEqual([]);
    });

    it('ignores invalid exact-date compounds', () => {
        expect(importLegacyCommentFilters(
            'created_at:>=\'not-a-date\'+created_at:<=\'2024-01-01T23:59:59.999Z\'',
            'UTC'
        )).toEqual([]);
    });
});
