import {describe, expect, expectTypeOf, it} from 'vitest';
import {createMemberPredicate, isMemberField, isMemberOperatorForField} from '@src/views/filters/member-fields';

describe('createMemberPredicate', () => {
    it('rejects operators that are not allowed for the field', () => {
        expect(isMemberOperatorForField('status', 'contains')).toBe(false);
        expect(isMemberOperatorForField('status', 'is')).toBe(true);
    });

    it('supports the label is_none_of operator', () => {
        const predicate = createMemberPredicate('label', 'is_none_of', ['vip', 'internal']);

        expect(predicate.field).toBe('label');
        expect(predicate.operator).toBe('is_none_of');
        expect(predicate.values).toEqual(['vip', 'internal']);
    });

    it('types multi-value and single-value fields differently', () => {
        const labelPredicate = createMemberPredicate('label', 'is_any_of', ['vip', 'internal']);
        const statusPredicate = createMemberPredicate('status', 'is', ['paid']);

        expectTypeOf(labelPredicate.values).toEqualTypeOf<[string, ...string[]]>();
        expectTypeOf(statusPredicate.values).toEqualTypeOf<[string]>();
    });

    it('rejects invalid field and operator combinations at runtime', () => {
        expect(() => createMemberPredicate('status', 'contains' as never, ['paid'])).toThrow('Invalid operator "contains" for member field "status"');
    });

    it('recognizes date fields and newsletter-specific fields', () => {
        expect(isMemberField('created_at')).toBe(true);
        expect(isMemberField('newsletters.weekly')).toBe(true);
        expect(isMemberOperatorForField('created_at', 'is-or-less')).toBe(true);
        expect(isMemberOperatorForField('newsletters.weekly', 'is')).toBe(true);
    });

    it('rejects empty predicate values', () => {
        expect(() => createMemberPredicate('label', 'is_none_of', [])).toThrow('Member predicate requires at least one value');
    });
});
