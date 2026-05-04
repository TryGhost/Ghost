import {describe, expect, it} from 'vitest';
import {escapeNqlString, formatDateInTimezone, getDayBoundsInUtc} from '@src/views/filters/filter-normalization';

describe('filter-normalization', () => {
    it('escapes single quotes for NQL strings', () => {
        expect(escapeNqlString('can\'t stop')).toBe('\'can\\\'t stop\'');
    });

    it('escapes backslashes before single quotes for NQL strings', () => {
        expect(escapeNqlString('test\\\'value')).toBe('\'test\\\\\\\'value\'');
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
