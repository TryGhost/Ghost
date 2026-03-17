import {compileCommentFilters} from './comment-filter-query';
import {describe, expect, it} from 'vitest';
import type {Filter} from '@tryghost/shade';

describe('comment-filter-query', () => {
    it('compiles exact-date compounds canonically', () => {
        const filters: Filter[] = [
            {
                id: '1',
                field: 'created_at',
                operator: 'is',
                values: ['2024-01-01']
            }
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe(
            'created_at:<=\'2024-01-01T23:59:59.999Z\'+created_at:>=\'2024-01-01T00:00:00.000Z\''
        );
    });

    it('compiles exact-date compounds in site timezones', () => {
        const filters: Filter[] = [
            {
                id: '1',
                field: 'created_at',
                operator: 'is',
                values: ['2024-02-01']
            }
        ];

        expect(compileCommentFilters(filters, 'Europe/Stockholm')).toBe(
            'created_at:<=\'2024-02-01T22:59:59.999Z\'+created_at:>=\'2024-01-31T23:00:00.000Z\''
        );
    });

    it('compiles reported filters', () => {
        const filters: Filter[] = [
            {id: '1', field: 'reported', operator: 'is', values: ['true']}
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe('count.reports:>0');
    });

    it('compiles the id quick filter canonically', () => {
        const filters: Filter[] = [
            {id: '1', field: 'id', operator: 'is', values: ['comment_123']}
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe('id:comment_123');
    });

    it('compiles the shipped mainline comment operator spellings', () => {
        const filters: Filter[] = [
            {id: '1', field: 'post', operator: 'is_not', values: ['post_123']},
            {id: '2', field: 'body', operator: 'not_contains', values: ['ghost']}
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe('html:-~\'ghost\'+post_id:-post_123');
    });

    it('sorts clauses canonically on serialize', () => {
        const filters: Filter[] = [
            {id: '2', field: 'status', operator: 'is', values: ['published']},
            {id: '1', field: 'reported', operator: 'is', values: ['false']}
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe('count.reports:0+status:published');
    });

    it('compiles canonical comment examples', () => {
        const filters: Filter[] = [
            {id: '1', field: 'reported', operator: 'is', values: ['false']},
            {id: '2', field: 'created_at', operator: 'is', values: ['2024-01-01']},
            {id: '3', field: 'status', operator: 'is', values: ['published']}
        ];

        expect(compileCommentFilters(filters, 'UTC')).toBe(
            'count.reports:0+created_at:<=\'2024-01-01T23:59:59.999Z\'+created_at:>=\'2024-01-01T00:00:00.000Z\'+status:published'
        );
    });
});
