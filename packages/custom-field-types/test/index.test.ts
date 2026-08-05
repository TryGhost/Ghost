import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {FIELD_TYPES, FIELD_TYPE_IDS, MAX_LONG_TEXT_BYTES, subFieldsOf} from '../src/index.ts';

// This asserts only the catalog's *contract* — which field types exist, and which of
// them have parts. The behavioural outcomes (per-type value validation, the composite
// address round-tripping, sub-field 422s) are proven end-to-end through the members
// custom-fields HTTP API integration tests, which exercise this catalog together with
// the backend storage and the wire format.
describe('custom-field-types catalog', function () {
    it('offers the expected field types, and says which of them have parts', function () {
        // Whether a value has parts is the only structural fact the backend reads off a
        // type: it decides how many rows the value occupies and what they are keyed by.
        const parts = Object.fromEntries(FIELD_TYPE_IDS.map(id => [id, subFieldsOf(id)]));
        assert.deepEqual(parts, {
            short_text: null,
            long_text: null,
            address: ['line1', 'line2', 'city', 'state', 'postal_code', 'country']
        });
    });

    describe('text is trimmed, whatever type it belongs to', function () {
        // Trimming decides whether a value is stored at all: a value that trims to
        // nothing is a clear. Two text types disagreeing about that would mean the same
        // keystrokes emptying one field and filling another.
        it('trims every text type alike', function () {
            for (const type of ['short_text', 'long_text'] as const) {
                const padded = FIELD_TYPES[type].value.safeParse('  Ghosts  ');
                assert.equal(padded.success && padded.data, 'Ghosts', type);

                const blank = FIELD_TYPES[type].value.safeParse('   ');
                assert.equal(blank.success && blank.data, '', type);
            }
        });

        it('measures a bound against the value rather than its padding', function () {
            assert.equal(FIELD_TYPES.short_text.value.safeParse(`  ${'x'.repeat(255)}  `).success, true);
            assert.equal(FIELD_TYPES.short_text.value.safeParse('x'.repeat(256)).success, false);
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
    describe('an address must name at least one part', function () {
        const parse = (value: unknown) => FIELD_TYPES.address.value.safeParse(value).success;

        it('accepts a partial address', function () {
            // There is no postal code in Hong Kong and no city in an Irish
            // townland address; both would have failed the old required set.
            assert.equal(parse({line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', country: 'HK'}), true);
            assert.equal(parse({line1: 'Cloonlara', state: 'Co. Clare', country: 'IE'}), true);
        });

        it('rejects an address that names nothing', function () {
            assert.equal(parse({}), false);
            // A key present but explicitly undefined names nothing either: undefined is
            // how a value says it has no opinion about a part.
            assert.equal(parse({line1: undefined}), false);
            assert.equal(parse({line1: undefined, country: undefined}), false);
        });

        it('accepts an address that names parts as empty, which is how they are cleared', function () {
            assert.equal(parse({line1: '', city: ''}), true);
        });

        it('lets a sub-field whose rule is a format be emptied too', function () {
            // Empty is a statement about the write, not about the sub-field, so every
            // sub-field takes it alike. A bound admits the empty string on its own; a
            // pattern does not, which would leave a country the one part of an address
            // that could be set but never removed.
            assert.equal(parse({line1: '62 Ghost Lane', city: 'Dublin', country: ''}), true);
            assert.equal(parse({country: ''}), true);

            // Emptying it is still the only thing that gets in for free.
            assert.equal(parse({country: 'DEU'}), false);
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

        it('refuses a part it does not recognise, rather than dropping it', function () {
            // The parts of a type are declared in one place, so a name that is not one of
            // them is a mistake worth saying out loud. Dropping it silently would store a
            // value missing whatever the typo was meant to fill in.
            assert.equal(parse({line1: '62 Ghost Lane', citty: 'Dublin'}), false);
            assert.equal(parse({line1: '62 Ghost Lane', city: 'Dublin'}), true);
        });

        it('bounds each part by what that part is, not by the record holding it', function () {
            // A postal code is its own kind of thing rather than a short text that happens
            // to be in an address: no country writes one longer than this, and a street
            // address needs the room a postal code does not.
            assert.equal(parse({postal_code: 'x'.repeat(32)}), true);
            assert.equal(parse({postal_code: 'x'.repeat(33)}), false);
            assert.equal(parse({line1: 'x'.repeat(255)}), true);
            assert.equal(parse({line1: 'x'.repeat(256)}), false);
        });

        it('reads a part of nothing but whitespace as empty, so it clears', function () {
            // Trimming happens per part above, so whitespace has already become the empty
            // string by the time the rule runs — and empty is an instruction, not a value.
            const result = FIELD_TYPES.address.value.safeParse({line1: '   ', city: '\t'});
            assert.equal(result.success, true);
            assert.deepEqual(result.data, {line1: '', city: ''});
        });
    });
});
