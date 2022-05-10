const assert = require('assert');
const extractApiKey = require('../index');

describe('Extract API Key', function () {
    it('Returns nulls for a request without any key', function () {
        const key = extractApiKey({
            query: {
                filter: 'status:active'
            }
        });

        assert.equal(key, null);
    });

    it('Extracts Content API key from the request', function () {
        const key = extractApiKey({
            query: {
                key: '123thekey'
            }
        });

        assert.equal(key, '123thekey');
    });
});
