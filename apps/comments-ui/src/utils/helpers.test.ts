import * as helpers from './helpers';
import moment, {DurationInputObject} from 'moment';
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

describe('formatRelativeTime', () => {
    let clock: sinon.SinonFakeTimers;

    afterEach(() => {
        clock?.restore();
    });

    const t = (key: string, vars?: Record<string, string | number>) => {
        if (vars) {
            return key.replace('{{amount}}', vars.amount.toString());
        }
        return key;
    };

    function testFormatRelativeTime(humanDiff: string, duration: DurationInputObject, expected: string, now?: Date) {
        it(`${humanDiff} = ${expected}`, function () {
            if (now) {
                clock = sinon.useFakeTimers(now);
            } else {
                clock = sinon.useFakeTimers(new Date('2024-02-15T15:00:00.000Z'));
            }
            const time = moment().subtract(duration);
            expect(helpers.formatRelativeTime(time.toISOString(), t)).toEqual(expected);
        });
    }

    it('handles invalid dates', function () {
        expect(helpers.formatRelativeTime('invalid', t)).toEqual('Just now');
    });

    const testCases: Array<[string, DurationInputObject, string, Date?]> = [
        ['3 seconds ago', {seconds: 3}, 'Just now'],
        ['30 seconds ago', {seconds: 30}, 'Just now'],
        ['59 seconds ago', {seconds: 59}, 'Just now'],
        ['60 seconds ago', {seconds: 60}, 'One min ago'],
        ['2 minutes ago', {minutes: 2}, '2 mins ago'],
        ['59 minutes ago', {minutes: 59}, '59 mins ago'],
        ['60 minutes ago', {minutes: 60}, 'One hour ago'],
        ['89 minutes ago', {minutes: 89}, 'One hour ago'], // rounds to nearest hour
        ['90 minutes ago', {minutes: 90}, '2 hrs ago'], // rounds to nearest hour
        ['3 hours ago', {hours: 3}, '3 hrs ago'],
        ['14 hours ago', {hours: 14}, '14 hrs ago'],
        ['1 day ago', {days: 1}, 'Yesterday'],
        ['yesterday < 1min ago', {seconds: 40}, 'Just now', new Date('2024-02-15T00:00:10.000Z')],
        ['yesterday < 1hr ago', {minutes: 40}, '40 mins ago', new Date('2024-02-15T00:00:10.000Z')],
        ['yesterday 1hr ago', {minutes: 60}, 'One hour ago', new Date('2024-02-15T00:00:10.000Z')],
        ['yesterday > 1hr < 2hrs ago', {minutes: 65}, 'One hour ago', new Date('2024-02-15T00:00:10.000Z')],
        ['yesterday > 2hrs ago', {hours: 2}, 'Yesterday', new Date('2024-02-15T00:00:10.000Z')],
        ['1 month ago', {months: 1}, '15 Jan'],
        ['1 year ago', {years: 1}, '15 Feb 2023']
    ];

    describe('in UTC', function () {
        testCases.forEach(([humanDiff, duration, expected, now]) => {
            testFormatRelativeTime(humanDiff, duration, expected, now);
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
