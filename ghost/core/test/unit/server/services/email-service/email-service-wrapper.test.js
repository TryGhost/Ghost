const assert = require('node:assert/strict');
const sinon = require('sinon');
const url = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const EmailServiceWrapper = require('../../../../../core/server/services/email-service/email-service-wrapper');

describe('EmailServiceWrapper getPostUrl', function () {
    afterEach(function () {
        sinon.restore();
    });

    function fakePost(type) {
        return {
            id: 'resource-id',
            toJSON: () => ({id: 'resource-id', slug: 'a-slug', status: 'published', type})
        };
    }

    it('routes a page as a page, not a post', function () {
        // The URL service routes by resource type; a page mis-typed as a post
        // matches no post collection and 404s.
        const forPost = sinon.stub(url, 'forPost');

        new EmailServiceWrapper().getPostUrl(fakePost('page'));

        assert.equal(forPost.getCall(0).args[3], 'pages');
    });

    it('routes a post as a post', function () {
        const forPost = sinon.stub(url, 'forPost');

        new EmailServiceWrapper().getPostUrl(fakePost('post'));

        assert.equal(forPost.getCall(0).args[3], 'posts');
    });
});
