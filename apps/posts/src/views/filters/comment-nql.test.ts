import {describe, expect, it} from 'vitest';
import {serializeCommentFilters} from '@src/views/filters/filter-nql';
import type {Filter} from '@tryghost/shade';

describe('serializeCommentFilters', () => {
    it('serializes comments filters with canonical sorted output', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'author-1', field: 'author', operator: 'is', values: ['member_1']}
        ];

        expect(serializeCommentFilters(filters)).toBe('member_id:member_1+status:published');
    });

    it('drops invalid comment field and operator combinations before serializing', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'contains', values: ['published']},
            {id: 'author-1', field: 'author', operator: 'is', values: ['member_1']}
        ];

        expect(serializeCommentFilters(filters)).toBe('member_id:member_1');
    });

    it('serializes exact comment dates using explicit timezone boundaries instead of browser-local dates', () => {
        const filters: Filter[] = [
            {id: 'created-at-1', field: 'created_at', operator: 'is', values: ['2024-01-01']}
        ];

        expect(serializeCommentFilters(filters, {timezone: 'America/New_York'})).toBe(
            'created_at:>=\'2024-01-01T05:00:00.000Z\'+created_at:<=\'2024-01-02T04:59:59.999Z\''
        );
    });
});
