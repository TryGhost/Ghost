const should = require('should');
const sinon = require('sinon');
const brute = require('../../../../../../core/server/web/shared/middleware/brute');

describe('brute middleware', function () {
    after(function () {
        sinon.restore();
    });

    it('exports a contentApiKey method', function () {
        should.equal(typeof brute.contentApiKey, 'function');
    });

    describe('contentApiKey', function () {
        it('calls the contentApiKey method of spam prevention', function () {
            const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
            const contentApiKeyStub = sinon.stub(spamPrevention, 'contentApiKey');

            // CASE: we don't care about what params it takes
            // just whether it calls the spam prevention stuff
            try {
                brute.contentApiKey();
            } catch (err) {
                // I don't care
            } finally {
                should.equal(contentApiKeyStub.called, true);
            }
        });
    });
});
