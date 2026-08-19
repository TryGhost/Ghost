import {describe, expect, it} from 'vitest';
import {filterNamesKey} from './filter-query-core';

describe('filterNamesKey', () => {
    it('finds a key wherever a clause sits', () => {
        for (const filter of [
            'newsletters.slug:weekly',
            '(status:paid+newsletters.slug:weekly)',
            'status:paid,newsletters.slug:weekly',
            'newsletters.slug:-weekly'
        ]) {
            expect(filterNamesKey(filter, 'newsletters.slug')).toBe(true);
        }
    });

    it('ignores anything inside a quoted value', () => {
        // Someone searching their members for this text is not filtering on a newsletter, and
        // a joiner inside their search term is their data rather than our structure.
        for (const filter of [
            "email:~'newsletters.slug'",
            "email:~'+newsletters.slug'",
            "email:~'(newsletters.slug'",
            'email:~"+newsletters.slug"',
            "name:'it\\'s +newsletters.slug'"
        ]) {
            expect(filterNamesKey(filter, 'newsletters.slug')).toBe(false);
        }
    });

    it('still finds a real clause alongside a quoted decoy', () => {
        expect(filterNamesKey("(email:~'+newsletters.slug'+newsletters.slug:weekly)", 'newsletters.slug')).toBe(true);
    });

    it('does not mistake a key that merely ends with the text', () => {
        expect(filterNamesKey('other_newsletters.slug:weekly', 'newsletters.slug')).toBe(false);
    });

    it('finds a key alongside a value carrying an escaped control character', () => {
        // `a\"b` is one value with a quote in it, not the start of a quoted section — which a
        // reader looking at the text rather than parsing it gets wrong.
        expect(filterNamesKey('name:a\\"b+newsletters.slug:weekly', 'newsletters.slug')).toBe(true);
    });

    it('matches any key beneath a namespace', () => {
        expect(filterNamesKey("custom_fields.key:'company'", 'custom_fields.')).toBe(true);
        expect(filterNamesKey("name:~'custom_fields.'", 'custom_fields.')).toBe(false);
    });

    it('names nothing when the filter cannot be parsed', () => {
        expect(filterNamesKey('this is not a filter((', 'newsletters.slug')).toBe(false);
    });
});
