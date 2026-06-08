const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const internalKeys = require('../../../../core/server/services/internal-keys').default;

// Stuff we are testing
const content_api_key = require('../../../../core/frontend/helpers/content_api_key');

describe('{{content_api_key}} helper', function () {
    beforeEach(function () {
        internalKeys.clear();
        internalKeys.set('ghost-internal-frontend', Promise.resolve({id: 'k', secret: 'xyz'}));
    });

    afterEach(function () {
        internalKeys.clear();
    });

    it('returns the content API key', async function () {
        const result = await content_api_key();
        assertExists(result);
        assert.equal(String(result), 'xyz');
    });
});
