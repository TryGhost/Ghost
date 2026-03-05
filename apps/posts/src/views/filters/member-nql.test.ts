import {describe, expect, it} from 'vitest';
import {createMemberPredicate} from '@src/views/filters/member-fields';
import {serializeMemberPredicates} from '@src/views/filters/member-nql';

describe('serializeMemberPredicates', () => {
    it('serializes label is_none_of using ember-compatible negation', () => {
        const predicates = [
            createMemberPredicate('label', 'is_none_of', ['vip', 'internal'])
        ];

        expect(serializeMemberPredicates(predicates)).toBe('label:-[vip,internal]');
    });
});
