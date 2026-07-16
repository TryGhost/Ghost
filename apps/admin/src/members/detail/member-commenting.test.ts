import {describe, expect, it} from 'vitest';
import {getMemberCommentingActionLabel, isMemberCommentingDisabled} from './member-commenting';
import type {Member} from '@tryghost/admin-x-framework/api/members';

// The action menu label toggles based on `member.can_comment`. Ember's
// `templates/member.hbs:77` uses `not-eq member.canComment false` — i.e. the
// UI shows "Disable commenting" for anything BUT explicit false (including
// undefined and legacy members without the property). Only when `can_comment`
// is explicitly `false` does the UI flip to "Enable commenting".
//
// Importantly this is NOT the same as `member.commenting.disabled` — that
// flag stays truthy after a *temporary* disable expires, whereas `can_comment`
// respects the expiry and flips back to `true` server-side. Reading the wrong
// property would leave the menu offering "Enable commenting" on a member who
// can already comment.

function makeMember(overrides: Partial<Member>): Member {
    return {
        id: 'm_1',
        name: 'X',
        email: 'x@x.co',
        ...overrides
    } as Member;
}

describe('isMemberCommentingDisabled', () => {
    it('returns false when can_comment is missing (legacy members)', () => {
        expect(isMemberCommentingDisabled(makeMember({}))).toBe(false);
    });

    it('returns false when can_comment is explicitly true', () => {
        expect(isMemberCommentingDisabled(makeMember({can_comment: true}))).toBe(false);
    });

    it('returns true only when can_comment is explicitly false', () => {
        expect(isMemberCommentingDisabled(makeMember({can_comment: false}))).toBe(true);
    });

    it('returns false when can_comment is true even if commenting.disabled is truthy (expired disable)', () => {
        // The `commenting` metadata sticks around after a temporary disable
        // expires; the server flips `can_comment` back to true. Ember-parity:
        // trust `can_comment` and offer the "Disable" action even though a
        // stale `commenting.disabled=true` remains on the object.
        const member = makeMember({can_comment: true, commenting: {disabled: true, disabled_until: '2000-01-01T00:00:00.000Z'}});
        expect(isMemberCommentingDisabled(member)).toBe(false);
    });
});

describe('getMemberCommentingActionLabel', () => {
    it('returns "Disable commenting" when commenting is currently allowed', () => {
        expect(getMemberCommentingActionLabel(makeMember({}))).toBe('Disable commenting');
        expect(getMemberCommentingActionLabel(makeMember({can_comment: true}))).toBe('Disable commenting');
    });

    it('returns "Enable commenting" when can_comment is explicitly false', () => {
        expect(getMemberCommentingActionLabel(makeMember({can_comment: false}))).toBe('Enable commenting');
    });
});
