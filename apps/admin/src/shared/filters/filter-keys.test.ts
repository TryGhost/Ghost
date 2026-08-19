import {describe, expect, it} from 'vitest';
import {keyBelow, keyIsUnder} from './filter-keys';

describe('filter keys are paths', () => {
    it('a longer step is not the step it starts with', () => {
        expect(keyIsUnder('newsletters.slugfoo', 'newsletters.slug')).toBe(false);
        expect(keyIsUnder('custom_fieldsfoo.value', 'custom_fields')).toBe(false);
    });

    it('a key is under itself, and under anything it hangs off', () => {
        expect(keyIsUnder('newsletters.slug', 'newsletters.slug')).toBe(true);
        expect(keyIsUnder('custom_fields.value.country', 'custom_fields')).toBe(true);
        expect(keyIsUnder('custom_fields.value.country', 'custom_fields.value')).toBe(true);
    });

    it('reads a namespace written with or without its dot the same way', () => {
        expect(keyIsUnder('custom_fields.key', 'custom_fields.')).toBe(true);
        expect(keyIsUnder('custom_fields.key', 'custom_fields')).toBe(true);
    });

    it('names what sits below', () => {
        expect(keyBelow('custom_fields.company', 'custom_fields.')).toBe('company');
        expect(keyBelow('custom_fields.value.country', 'custom_fields.value')).toBe('country');
        expect(keyBelow('newsletters.slug', 'newsletters.slug')).toBeNull();
        expect(keyBelow('newsletters.slugfoo', 'newsletters.slug')).toBeNull();
    });
});
