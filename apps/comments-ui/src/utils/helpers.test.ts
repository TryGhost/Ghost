import * as helpers from './helpers';
import sinon from 'sinon';
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

describe('Date/Time Formatting', () => {
    let clock: sinon.SinonFakeTimers;
    const t = (key: string, vars?: Record<string, string | number>) => {
        if (vars) {
            return key.replace('{{amount}}', vars.amount.toString());
        }
        return key;
    };

    beforeEach(() => {
        // Set a fixed time: 2024-02-15 15:00:00
        clock = sinon.useFakeTimers(new Date('2024-02-15T15:00:00.000Z'));
    });

    afterEach(() => {
        clock.restore();
    });

    describe('formatRelativeTime', () => {
        it('handles just now', () => {
            expect(helpers.formatRelativeTime('2024-02-15T14:59:57.000Z', t)).toBe('Just now');
        });

        it('handles seconds ago', () => {
            expect(helpers.formatRelativeTime('2024-02-15T14:59:30.000Z', t)).toBe('30 seconds ago');
        });

        it('handles one minute ago', () => {
            expect(helpers.formatRelativeTime('2024-02-15T14:59:00.000Z', t)).toBe('One min ago');
        });

        it('handles multiple minutes ago', () => {
            expect(helpers.formatRelativeTime('2024-02-15T14:30:00.000Z', t)).toBe('30 mins ago');
        });

        it('handles one hour ago', () => {
            expect(helpers.formatRelativeTime('2024-02-15T14:00:00.000Z', t)).toBe('One hour ago');
        });

        it('handles multiple hours ago', () => {
            expect(helpers.formatRelativeTime('2024-02-15T12:00:00.000Z', t)).toBe('3 hrs ago');
        });

        it('handles yesterday', () => {
            expect(helpers.formatRelativeTime('2024-02-14T15:00:00.000Z', t)).toBe('Yesterday');
        });

        it('handles date in current year', () => {
            expect(helpers.formatRelativeTime('2024-01-15T15:00:00.000Z', t)).toBe('15 Jan');
        });

        it('handles date in different year', () => {
            expect(helpers.formatRelativeTime('2023-02-15T15:00:00.000Z', t)).toBe('15 Feb 2023');
        });
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

describe('getCommentInReplyToSnippet', function () {
    function testGetSnippet(comment: {html?: string}, expected: string) {
        const snippet = helpers.getCommentInReplyToSnippet(comment);
        expect(snippet).to.equal(expected);
    }

    it('handles comment with missing html', function () {
        testGetSnippet({}, '');
    });

    it('handles comment with blank html', function () {
        testGetSnippet({html: ''}, '');
    });

    it('converts html to text', function () {
        testGetSnippet({html: '<p>Test <strong>comment</strong></p>'}, 'Test comment');
    });

    it('converts to a single line', function () {
        testGetSnippet({html: '<p>Test</p>\n<p>comment</p>'}, 'Test comment');
    });

    it('trims whitespace', function () {
        testGetSnippet({html: '<p>  Test  <br />New line</p>\n<p>New paragraph</p>'}, 'Test New line New paragraph');
    });

    it('strips blockquotes', function () {
        testGetSnippet({html: '<blockquote>Previous comment</blockquote>\n<p>My reply to quote</p>'}, 'My reply to quote');
    });

    it('ignores scripts', function () {
        testGetSnippet({html: '<script>alert("XSS")</script>\n<p>Test comment</p>'}, 'Test comment');
    });

    it('ignores image alt text', function () {
        testGetSnippet({html: '<img alt="Image alt text" src="image.jpg" />\n<p>Test comment</p>'}, 'Test comment');
    });

    it('limits length to 100 characters', function () {
        const longText = 'a'.repeat(200);
        testGetSnippet({html: `<p>${longText}</p>`}, longText.substring(0, 100));
    });
});
