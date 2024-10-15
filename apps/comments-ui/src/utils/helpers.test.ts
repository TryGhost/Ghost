import * as helpers from './helpers';
import {buildAnonymousMember, buildComment, buildDeletedMember} from '../../test/utils/fixtures';

describe('formatNumber', function () {
    it('adds commas to large numbers', function () {
        expect(helpers.formatNumber(1234567)).toEqual('1,234,567');
    });

    it('handles 0', function () {
        expect(helpers.formatNumber(0)).toEqual('0');
    });

    it('handles undefined', function () {
        expect((helpers.formatNumber as any)()).toEqual('');
    });

    it('handles null', function () {
        expect((helpers.formatNumber as any)(null)).toEqual('');
    });
});

describe('getMemberNameFromComment', function () {
    function testName(member: any | null, expected: string) {
        const t = (str: string) => str;
        const comment = buildComment();
        comment.member = member;
        const name = helpers.getMemberNameFromComment(comment, t);
        expect(name).to.equal(expected);
    }

    it('handles deleted member', function () {
        testName(buildDeletedMember(), 'Deleted member');
    });

    it('handles anonymous comment', function () {
        testName(buildAnonymousMember(), 'Anonymous');
    });

    it('handles a member with a name', function () {
        testName({name: 'Test member'}, 'Test member');
    });
});

describe('getMemberInitialsFromComment', function () {
    function testInitials(member: any | null, expected: string) {
        const t = (str: string) => str;
        const comment = buildComment();
        comment.member = member;
        const initials = helpers.getMemberInitialsFromComment(comment, t);
        expect(initials).to.equal(expected);
    }

    it('handles deleted member', function () {
        testInitials(buildDeletedMember(), 'DM');
    });

    it('handles anonymous comment', function () {
        testInitials(buildAnonymousMember(), 'A');
    });

    it('handles a member with a name', function () {
        testInitials({name: 'Test member'}, 'TM');
    });
});
