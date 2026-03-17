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

    it('escapes backslashes before single quotes for NQL strings', () => {
        expect(escapeNqlString('test\\\'value')).toBe('\'test\\\\\\\'value\'');
    });

    it('sorts clauses deterministically', () => {
        expect(canonicalizeClauses(['b:2', 'a:1'])).toEqual(['a:1', 'b:2']);
    });

    it('normalizes multi-value filters into sorted strings', () => {
        expect(normalizeMultiValue(['beta', 2, 'alpha'])).toEqual(['2', 'alpha', 'beta']);
    });

    it('maps mainline operator aliases to canonical names', () => {
        expect(normalizeOperator('is_not')).toBe('is-not');
        expect(normalizeOperator('not_contains')).toBe('does-not-contain');
        expect(normalizeOperator('is_none_of')).toBe('is-not-any');
    });

    it('expands a local date into UTC day bounds', () => {
        expect(getDayBoundsInUtc('2024-01-15', 'Europe/Stockholm')).toEqual({
            start: '2024-01-14T23:00:00.000Z',
            end: '2024-01-15T22:59:59.999Z'
        });
    });
});
