import {describe, expect, it} from 'vitest';
import {createMemberPredicate} from '@src/views/filters/member-fields';
import {parseMemberNqlFilterParam, serializeMemberPredicates} from '@src/views/filters/member-nql';

describe('serializeMemberPredicates', () => {
    it('serializes label is_none_of using ember-compatible negation', () => {
        const predicates = [
            createMemberPredicate('label', 'is_none_of', ['vip', 'internal'])
        ];

        expect(serializeMemberPredicates(predicates)).toBe('label:-[vip,internal]');
    });

    it('drops invalid member field and operator combinations before serializing', () => {
        const predicates = [
            {id: 'status-1', field: 'status', operator: 'contains', values: ['paid']},
            {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']}
        ];

        expect(serializeMemberPredicates(predicates as never)).toBe('email:~\'alex@example.com\'');
    });

    it('parses legacy ember member filter nql directly in the domain layer', () => {
        expect(parseMemberNqlFilterParam('status:-free')).toEqual([
            {id: 'status-legacy', field: 'status', operator: 'is-not', values: ['free']}
        ]);
    });
});
