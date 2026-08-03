import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {FIELD_TYPES, FIELD_TYPE_IDS, MAX_LONG_TEXT_BYTES} from '../src/index.ts';

// This asserts only the catalog's *contract* — which field types exist and which
// storage type each routes to. The behavioural outcomes (per-type value
// validation, the composite address round-tripping, sub-field 422s) are proven
// end-to-end through the members custom-fields HTTP API integration tests, which
// exercise this catalog together with the backend storage and the wire format.
describe('custom-field-types catalog', function () {
    it('offers the expected field types and their storage routing', function () {
        const routing = Object.fromEntries(FIELD_TYPE_IDS.map(id => [id, FIELD_TYPES[id].storageType]));
        assert.deepEqual(routing, {
            short_text: 'text',
            long_text: 'text',
            address: 'json'
        });
    });

    // The one piece of real logic in here, and the one an end-to-end test can't
    // pin precisely: the bound is counted in bytes, because the column it routes
    // to is sized in bytes. A character-based bound would accept a multibyte
    // value that the column can't hold.
    describe('long_text is bounded in bytes, not characters', function () {
        const parse = (value: string) => FIELD_TYPES.long_text.value.safeParse(value).success;

        it('accepts a value of exactly the limit', function () {
            assert.equal(parse('a'.repeat(MAX_LONG_TEXT_BYTES)), true);
        });

        it('rejects a value one byte over the limit', function () {
            assert.equal(parse('a'.repeat(MAX_LONG_TEXT_BYTES + 1)), false);
        });

        it('rejects a multibyte value that fits the limit only when counted as characters', function () {
            // 21,846 three-byte characters: far under the limit by character
            // count, three bytes over it by byte count.
            const value = '€'.repeat(21846);
            assert.equal(value.length < MAX_LONG_TEXT_BYTES, true);
            assert.equal(parse(value), false);
        });

        it('accepts a multibyte value that reaches the limit exactly', function () {
            assert.equal(parse('€'.repeat(21845)), true);
        });
    });

    // The rule that replaced per-sub-field requiredness. An end-to-end test can't
    // pin it: the CSV and admin paths both strip blank sub-fields before a value
    // reaches the catalog, so neither ever presents the empty case this rejects.
    describe('an address must have at least one sub-field filled in', function () {
        const parse = (value: unknown) => FIELD_TYPES.address.value.safeParse(value).success;

        it('accepts a partial address', function () {
            // There is no postal code in Hong Kong and no city in an Irish
            // townland address; both would have failed the old required set.
            assert.equal(parse({line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', country: 'HK'}), true);
            assert.equal(parse({line1: 'Cloonlara', state: 'Co. Clare', country: 'IE'}), true);
        });

        it('rejects an address with nothing in it', function () {
            assert.equal(parse({}), false);
            // A key present but explicitly undefined survives parsing, so it reaches the
            // rule as a value and has to be turned away as one.
            assert.equal(parse({line1: undefined}), false);
            assert.equal(parse({line1: undefined, country: undefined}), false);
        });

        it('rejects an address whose every sub-field is blank', function () {
            assert.equal(parse({line1: '', city: '', postal_code: ''}), false);
        });

        it('normalises the case of a country code, so one country is one value', function () {
            const parsed = FIELD_TYPES.address.value.safeParse({country: 'gb'});
            assert.equal(parsed.success && parsed.data.country, 'GB');

            // Whichever way it arrives, it is stored the same way, so a filter for one
            // form cannot miss members holding another.
            for (const written of ['GB', 'gb', 'Gb', ' gB ']) {
                const result = FIELD_TYPES.address.value.safeParse({country: written});
                assert.equal(result.success && result.data.country, 'GB', `expected ${JSON.stringify(written)} to normalise`);
            }
        });

        it('accepts any well-formed country code, without ruling on which countries exist', function () {
            // XK is not an ISO-assigned code, and it is what Kosovo is written as. Ghost
            // stores it rather than refusing a member's own country.
            for (const code of ['XK', 'TW', 'PS', 'EH']) {
                assert.equal(FIELD_TYPES.address.value.safeParse({country: code}).success, true, code);
            }
        });

        it('takes two ASCII letters as a country code and nothing else', function () {
            const parseCountry = (country: string) => FIELD_TYPES.address.value.safeParse({country});

            // Uppercasing is not length-preserving, so a rule counting the characters of
            // the result is wrong both ways: one character can become two, and two can
            // become three. Checking the shape of the input is what settles it.
            assert.equal(parseCountry('ß').success, false, 'ß uppercases to SS');
            assert.equal(parseCountry('aß').success, false, 'aß uppercases to ASS');
            assert.equal(parseCountry('ﬁ').success, false, 'the fi ligature uppercases to FI');

            // A bare length check let these through; a country code has letters in it.
            assert.equal(parseCountry('12').success, false);
            assert.equal(parseCountry('!!').success, false);
        });

        it('trims a sub-field, so its bound measures the value and not the padding', function () {
            const result = FIELD_TYPES.address.value.safeParse({line1: '  1 Main St  ', country: ' GB '});
            assert.equal(result.success, true);
            assert.deepEqual(result.data, {line1: '1 Main St', country: 'GB'});

            // A value that reaches the limit exactly still fits once its padding is gone.
            assert.equal(FIELD_TYPES.address.value.safeParse({line1: `  ${'x'.repeat(255)}  `}).success, true);
        });

        it('rejects an address whose every sub-field is only whitespace', function () {
            // Admin trims a sub-field away before rendering it, so an address of
            // spaces is one no screen could show, and none could clear either.
            assert.equal(parse({line1: '   ', city: '\t'}), false);
            // Two spaces satisfy country's own two-character rule, so only the
            // composite rule can reject this one.
            assert.equal(parse({country: '  '}), false);
        });
    });
});
