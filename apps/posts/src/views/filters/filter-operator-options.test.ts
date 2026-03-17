import {createOperatorOptions} from './filter-operator-options';
import {describe, expect, it} from 'vitest';

describe('createOperatorOptions', () => {
    it('formats operators with hyphen fallback labels', () => {
        expect(createOperatorOptions(['is', 'starts-with', 'is-not-any'])).toEqual([
            {value: 'is', label: 'is'},
            {value: 'starts-with', label: 'starts with'},
            {value: 'is-not-any', label: 'is not any'}
        ]);
    });

    it('formats operators with underscore fallback labels', () => {
        expect(createOperatorOptions(['is_not', 'not_contains'])).toEqual([
            {value: 'is_not', label: 'is not'},
            {value: 'not_contains', label: 'not contains'}
        ]);
    });

    it('allows field-local label overrides', () => {
        expect(createOperatorOptions(['is-not-any', 'does-not-contain', '1'], {
            labels: {
                'is-not-any': 'is none of',
                'does-not-contain': 'does not contain',
                1: 'More like this'
            }
        })).toEqual([
            {value: 'is-not-any', label: 'is none of'},
            {value: 'does-not-contain', label: 'does not contain'},
            {value: '1', label: 'More like this'}
        ]);
    });
});
