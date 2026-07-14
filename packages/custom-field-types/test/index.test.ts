import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {FIELD_TYPES, FIELD_TYPE_IDS} from '../src/index.ts';

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
});
