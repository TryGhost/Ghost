const assert = require('assert');
const extractApiKey = require('../index');

describe('Extract API Key', function () {
    it('returns nulls for a request without any key', function () {
        const {key, type} = extractApiKey({
            query: {
                filter: 'status:active'
            }
        });

        assert.equal(key, null);
        assert.equal(type, null);
    });

    it('Extracts Content API key from the request', function () {
        const {key, type} = extractApiKey({
            query: {
                key: '123thekey'
            }
        });

        assert.equal(key, '123thekey');
        assert.equal(type, 'content');
    });
});
