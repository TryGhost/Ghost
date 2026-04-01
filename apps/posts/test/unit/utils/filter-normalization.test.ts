import {describe, expect, it} from 'vitest';
import {escapeNqlString, getDayBoundsInUtc} from '@views/filters/filter-normalization';

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
});
