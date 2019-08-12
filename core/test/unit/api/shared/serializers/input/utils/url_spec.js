const should = require('should');
const sinon = require('sinon');
const urlUtils = require('../../../../../../../server/lib/url-utils');
const url = require('../../../../../../../server/api/v2/utils/serializers/input/utils/url');

describe('Unit: v2/utils/serializers/input/utils/url', function () {
    describe('forPost', function () {
        beforeEach(function () {
            sinon.stub(urlUtils, 'getSiteUrl')
                .returns('https://blogurl.com');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should transform canonical_url when protocol and domain match', function () {
            const attrs = {
                canonical_url: 'https://blogurl.com/hello-world'
            };

            url.forPost(attrs, {});

            should.equal(attrs.canonical_url, '/hello-world');
        });

        it('should transform canonical_url when protocol and domain match with backslash in the end', function () {
            const attrs = {
                canonical_url: 'https://blogurl.com/hello-world/'
            };

            url.forPost(attrs, {});

            should.equal(attrs.canonical_url, '/hello-world/');
        });

        it('should not transform canonical_url when different domains', function () {
            const attrs = {
                canonical_url: 'http://ghost.org/no-transform'
            };

            url.forPost(attrs, {});

            should.equal(attrs.canonical_url, 'http://ghost.org/no-transform');
        });

        it('should not transform canonical_url when different protocols', function () {
            const attrs = {
                canonical_url: 'http://blogurl.com/no-transform'
            };

            url.forPost(attrs, {});

            should.equal(attrs.canonical_url, 'http://blogurl.com/no-transform');
        });
    });
});
