import {describe, expect, expectTypeOf, it} from 'vitest';
import {createCommentPredicate, isCommentField, isCommentOperatorForField, upsertCommentFieldPredicate} from '@src/views/filters/comment-fields';

describe('createCommentPredicate', () => {
    it('recognizes supported comment fields and operators', () => {
        expect(isCommentField('status')).toBe(true);
        expect(isCommentField('unknown')).toBe(false);
        expect(isCommentOperatorForField('status', 'is')).toBe(true);
        expect(isCommentOperatorForField('status', 'contains')).toBe(false);
    });

    it('uses a single-value shape for comment predicates', () => {
        const predicate = createCommentPredicate('status', 'is', ['published']);

        expect(predicate.values).toEqual(['published']);
        expectTypeOf(predicate.values).toEqualTypeOf<['published' | 'hidden']>();
    });

    it('rejects invalid field and operator combinations at runtime', () => {
        expect(() => createCommentPredicate('status', 'contains' as never, ['published'])).toThrow('Invalid operator "contains" for comment field "status"');
    });

    it('upserts a quick filter by field while preserving other predicates', () => {
        const predicates = [
            createCommentPredicate('author', 'is', ['member-1']),
            createCommentPredicate('status', 'is', ['published'])
        ];

        const nextPredicates = upsertCommentFieldPredicate(predicates, 'author', 'is', ['member-2']);

        expect(nextPredicates.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['published']},
            {field: 'author', operator: 'is', values: ['member-2']}
        ]);
    });
});
