import {describe, expect, expectTypeOf, it} from 'vitest';
import {createCommentPredicate, isCommentField, isCommentOperatorForField} from '@src/views/filters/comment-fields';

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
        expectTypeOf(predicate.values).toEqualTypeOf<[string]>();
    });

    it('rejects invalid field and operator combinations at runtime', () => {
        expect(() => createCommentPredicate('status', 'contains' as never, ['published'])).toThrow('Invalid operator "contains" for comment field "status"');
    });
});
