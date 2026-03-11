import {describe, expect, it} from 'vitest';
import type {CommentPredicate} from '@src/views/filters/comment-fields';
import type {Filter} from '@tryghost/shade';
import {buildNqlFilter, coerceCommentFilters, filtersToSearchParams, searchParamsToFilters} from '@src/views/comments/hooks/use-filter-state';

describe('comments useFilterState URL helpers', () => {
    it('preserves duplicate field predicates through URL roundtrip', () => {
        const filters: CommentPredicate[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'status-2', field: 'status', operator: 'is', values: ['hidden']}
        ];

        const params = filtersToSearchParams(filters);
        const parsed = searchParamsToFilters(params);

        expect(params.get('filter')).toBe('status:hidden+status:published');
        expect([...params.keys()]).toEqual(['filter']);
        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['hidden']},
            {field: 'status', operator: 'is', values: ['published']}
        ]);
    });

    it('serializes comments NQL using canonical sorted order', () => {
        const filters: CommentPredicate[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'author-1', field: 'author', operator: 'is', values: ['member_1']}
        ];

        expect(buildNqlFilter(filters)).toBe('member_id:member_1+status:published');
    });

    it('roundtrips exact-date comment filters through ember-style NQL params', () => {
        const filters: CommentPredicate[] = [
            {id: 'created-at-1', field: 'created_at', operator: 'is', values: ['2024-01-01']}
        ];

        const params = filtersToSearchParams(filters);
        const parsed = searchParamsToFilters(params);

        expect(params.get('filter')).toBe('created_at:>=\'2024-01-01T00:00:00.000Z\'+created_at:<=\'2024-01-01T23:59:59.999Z\'');
        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'created_at', operator: 'is', values: ['2024-01-01']}
        ]);
    });

    it('ignores the removed React field-param filter format', () => {
        const params = new URLSearchParams({
            status: 'is:published',
            body: 'contains:hello'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed).toEqual([]);
    });

    it('coerces UI filters into valid comment predicates and drops invalid combinations', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'status-2', field: 'status', operator: 'contains', values: ['published']},
            {id: 'body-1', field: 'body', operator: 'contains', values: ['hello']}
        ];

        expect(coerceCommentFilters(filters)).toEqual([
            {id: 'status-1', field: 'status', operator: 'is', values: ['published']},
            {id: 'body-1', field: 'body', operator: 'contains', values: ['hello']}
        ]);
    });
});
