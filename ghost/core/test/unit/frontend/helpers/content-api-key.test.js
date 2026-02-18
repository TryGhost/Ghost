const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const proxy = require('../../../../core/frontend/services/proxy');
const {getFrontendKey} = proxy;

// Stuff we are testing
const content_api_key = require('../../../../core/frontend/helpers/content_api_key');

describe('{{content_api_key}} helper', function () {
    describe('compare to settings', function () {
        it('returns the content API key', async function () {
            const result = await content_api_key();
            const expected = await getFrontendKey();
            assertExists(result);
            assert.equal(String(result), expected);
        });
    });
});

