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
});
