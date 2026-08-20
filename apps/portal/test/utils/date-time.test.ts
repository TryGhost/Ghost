import {getSiteDateString} from '../../src/utils/date-time';

describe('getSiteDateString', () => {
    const isoDate = '2030-01-01T01:00:00.000Z';

    test('returns an empty string without a date', () => {
        expect(getSiteDateString(null)).toBe('');
        expect(getSiteDateString(undefined)).toBe('');
    });

    test('returns an empty string for an invalid date', () => {
        expect(getSiteDateString('not-a-date')).toBe('');
    });

    test('formats in the publication locale and timezone', () => {
        expect(getSiteDateString(isoDate, {locale: 'en-GB', timezone: 'America/Los_Angeles'})).toBe('31 Dec 2029');
    });

    test('defaults to en-GB and UTC', () => {
        expect(getSiteDateString(isoDate)).toBe('1 Jan 2030');
    });

    test('keeps the publication timezone when its locale is not a valid tag', () => {
        expect(getSiteDateString(isoDate, {locale: 'en_US', timezone: 'America/Los_Angeles'})).toBe('31 Dec 2029');
    });

    test('falls back to UTC when the publication timezone is not a valid zone', () => {
        expect(getSiteDateString(isoDate, {locale: 'en-GB', timezone: 'Not/AZone'})).toBe('1 Jan 2030');
    });
});
