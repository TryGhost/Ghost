import {
    canonicalizeClauses,
    escapeNqlString,
    getDayBoundsInUtc,
    normalizeMultiValue,
    normalizeOperator
} from './filter-normalization';
import {describe, expect, it} from 'vitest';

describe('filter-normalization', () => {
    it('escapes single quotes for NQL strings', () => {
        expect(escapeNqlString('can\'t stop')).toBe('\'can\\\'t stop\'');
    });

    it('canonicalizes clause order', () => {
        expect(canonicalizeClauses(['zeta:1', 'alpha:2', 'beta:3'])).toEqual([
            'alpha:2',
            'beta:3',
            'zeta:1'
        ]);
    });

    it('normalizes multivalue arrays into sorted strings', () => {
        expect(normalizeMultiValue(['vip', 'alpha', 3])).toEqual(['3', 'alpha', 'vip']);
    });

    it('normalizes operator aliases', () => {
        expect(normalizeOperator('is_not')).toBe('is-not');
        expect(normalizeOperator('not_contains')).toBe('does-not-contain');
        expect(normalizeOperator('is_none_of')).toBe('is-not-any');
        expect(normalizeOperator('contains')).toBe('contains');
    });

    it('builds UTC day bounds from a local date and timezone', () => {
        expect(getDayBoundsInUtc('2024-02-03', 'UTC')).toEqual({
            start: '2024-02-03T00:00:00.000Z',
            end: '2024-02-03T23:59:59.999Z'
        });
    });

    it('builds UTC day bounds for non-UTC timezones', () => {
        expect(getDayBoundsInUtc('2024-02-03', 'Europe/Stockholm')).toEqual({
            start: '2024-02-02T23:00:00.000Z',
            end: '2024-02-03T22:59:59.999Z'
        });
    });
});
