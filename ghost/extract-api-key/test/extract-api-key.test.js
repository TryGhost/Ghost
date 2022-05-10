const assert = require('assert');
const extractApiKey = require('../index');

describe('Extract API Key', function () {
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
