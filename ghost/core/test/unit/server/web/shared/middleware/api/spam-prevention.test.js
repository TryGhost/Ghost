const should = require('should');
const spamPrevention = require('../../../../../../../core/server/web/shared/middleware/api/spam-prevention');

describe('Spam Prevention', function () {
    it('exports a contentApiKey method', function () {
        should.equal(typeof spamPrevention.contentApiKey, 'function');
    });

    describe('contentApiKey method', function () {
        it('returns an instance of express-brute', function () {
            const ExpressBrute = require('express-brute');
            const result = spamPrevention.contentApiKey();

            should.equal(result instanceof ExpressBrute, true);
        });
    });
});
