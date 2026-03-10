import {describe, expect, it} from 'vitest';
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
