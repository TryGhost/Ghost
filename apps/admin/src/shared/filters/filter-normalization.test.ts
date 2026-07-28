import nqlLang from '@tryghost/nql-lang';
import {describe, expect, it} from 'vitest';
import {escapeNqlString, formatDateInTimezone, getDayBoundsInUtc} from './filter-normalization';

describe('filter-normalization', () => {
    it('escapes single quotes for NQL strings', () => {
        expect(escapeNqlString('can\'t stop')).toBe('\'can\\\'t stop\'');
    });

    it('keeps backslashes literal for NQL strings', () => {
        // NQL only unescapes \' and \" - lone backslashes are literal
        // characters, so doubling them would query a different value
        expect(escapeNqlString('test\\\'value')).toBe(String.raw`'test\\'value'`);
    });

    // escaping has to round-trip any value exactly through the same parser the
    // admin uses to restore filters from the URL, without letting a crafted
    // value break out into additional filter conditions
    describe.each([
        ['simple'],
        ['can\'t stop'],
        ['trailing quote\''],
        ['trailing backslash \\'],
        ['backslash quote \\\''],
        [`x',foo:1`],
        [`x\\',foo:1`],
        ['\'\''],
        ['\\'],
        [`https://example.com/foo-bar-baz/'`]
    ])('round-trips %j through NQL', (value) => {
        it('without injection', () => {
            // an exact object match proves both that the value round-trips and
            // that no extra filter conditions were injected
            expect(nqlLang.parse(`name:${escapeNqlString(value)}`)).toEqual({name: value});
        });
    });

    it('computes UTC day bounds from a site timezone date', () => {
        expect(getDayBoundsInUtc('2024-02-01', 'America/New_York')).toEqual({
            start: '2024-02-01T05:00:00.000Z',
            end: '2024-02-02T04:59:59.999Z'
        });
    });

    it('computes shorter UTC day bounds across spring-forward DST transitions', () => {
        expect(getDayBoundsInUtc('2024-03-10', 'America/New_York')).toEqual({
            start: '2024-03-10T05:00:00.000Z',
            end: '2024-03-11T03:59:59.999Z'
        });
    });

    it('formats ISO instants in a site timezone', () => {
        expect(formatDateInTimezone('2024-02-01T22:59:59.999Z', 'Europe/Stockholm')).toBe('2024-02-01');
        expect(formatDateInTimezone('2024-02-01T23:00:00.000Z', 'Europe/Stockholm')).toBe('2024-02-02');
    });

    it('formats legacy UTC date-times in a site timezone', () => {
        expect(formatDateInTimezone('2022-02-01 23:59:59', 'Europe/Stockholm')).toBe('2022-02-02');
    });

    it('ignores invalid date values', () => {
        expect(formatDateInTimezone('not-a-date', 'UTC')).toBeNull();
    });
});
