import {describe, expect, it} from 'vitest';
import {upsertCommentFilters} from '@src/views/comments/hooks/use-filter-state';

describe('upsertCommentFilters', () => {
    it('applies multiple filter updates atomically', () => {
        const result = upsertCommentFilters([], [
            {field: 'created_at', value: '2026-05-05', operator: 'is'},
            {field: 'reported', value: 'true', operator: 'is'}
        ]);

        expect(result).toMatchObject([
            {field: 'created_at', operator: 'is', values: ['2026-05-05']},
            {field: 'reported', operator: 'is', values: ['true']}
        ]);
    });

    it('replaces existing filters for updated fields without dropping other fields', () => {
        const result = upsertCommentFilters([
            {id: 'post', field: 'post', operator: 'is', values: ['post-1']},
            {id: 'reported', field: 'reported', operator: 'is', values: ['false']}
        ], [
            {field: 'reported', value: 'true', operator: 'is'},
            {field: 'created_at', value: '2026-05-05', operator: 'is'}
        ]);

        expect(result).toMatchObject([
            {field: 'post', operator: 'is', values: ['post-1']},
            {field: 'reported', operator: 'is', values: ['true']},
            {field: 'created_at', operator: 'is', values: ['2026-05-05']}
        ]);
    });
});
