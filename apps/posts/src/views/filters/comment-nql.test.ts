import {describe, expect, it} from 'vitest';
import {serializeCommentFilters} from '@src/views/filters/comment-nql';
import type {Filter} from '@tryghost/shade';

describe('serializeCommentFilters', () => {
    it('serializes comments filters with canonical sorted output', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'author-1', field: 'author', operator: 'is', values: ['member_1']}
        ];

        expect(serializeCommentFilters(filters)).toBe('member_id:member_1+status:published');
    });
});
