const assert = require('node:assert/strict');
const spamPrevention = require('../../../../../../../core/server/web/shared/middleware/api/spam-prevention');

describe('Spam Prevention', function () {
    it('exports a contentApiKey method', function () {
        assert.equal(typeof spamPrevention.contentApiKey, 'function');
    });

    describe('contentApiKey method', function () {
        it('returns an instance of express-brute', function () {
            const ExpressBrute = require('express-brute');
            const result = spamPrevention.contentApiKey();

            assert(result instanceof ExpressBrute);
        });
    });
});
