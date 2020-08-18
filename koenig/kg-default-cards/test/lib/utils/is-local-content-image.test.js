// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../../utils');

const isLocalContentImage = require('../../../lib/utils/is-local-content-image');

describe('Utils: isLocalContentImage', function () {
    describe('relative url', function () {
        it('returns true for root content image path', function () {
            isLocalContentImage('/content/images/test.jpg').should.be.true;
        });

        it('returns true for subdir content image path', function () {
            isLocalContentImage('/subdir/content/images/test.jpg').should.be.true;
            isLocalContentImage('/subdir/nested/content/images/test.jpg').should.be.true;
        });

        it('returns false for non-matching content image path', function () {
            isLocalContentImage('/images/test.jpg').should.be.false;
        });
    });

    describe('absolute url', function () {
        it('returns true for local image if matching siteUrl is supplied', function () {
            isLocalContentImage('https://test.com/content/images/test.jpg', 'https://test.com').should.be.true;
        });

        it('returns true for local image if matching siteUrl is supplied with trailing slash', function () {
            isLocalContentImage('https://test.com/content/images/test.jpg', 'https://test.com/').should.be.true;
        });

        it('returns false for local image if non-matching siteUrl is supplied', function () {
            isLocalContentImage('https://test.com/content/images/test.jpg', 'https://example.com').should.be.false;
        });

        it('returns false for local image if siteUrl is not supplied', function () {
            isLocalContentImage('https://test.com/content/images/test.jpg').should.be.false;
        });
    });
});
