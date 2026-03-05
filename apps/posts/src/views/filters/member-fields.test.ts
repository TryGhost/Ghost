import {describe, expect, it} from 'vitest';
import {createMemberPredicate} from '@src/views/filters/member-fields';

describe('createMemberPredicate', () => {
    it('supports the label is_none_of operator', () => {
        const predicate = createMemberPredicate('label', 'is_none_of', ['vip', 'internal']);

        expect(predicate.field).toBe('label');
        expect(predicate.operator).toBe('is_none_of');
        expect(predicate.values).toEqual(['vip', 'internal']);
    });

    it('rejects empty predicate values', () => {
        expect(() => createMemberPredicate('label', 'is_none_of', [])).toThrow('Member predicate requires at least one value');
    });
});
