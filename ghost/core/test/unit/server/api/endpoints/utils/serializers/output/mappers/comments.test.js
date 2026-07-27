const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../../../../../core/server/services/url');
const commentMapper = require('../../../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers/comments');

describe('Unit: endpoints/utils/serializers/output/mappers/comments', function () {
    let getUrlForResourceStub;

    beforeEach(function () {
        getUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource').returns('https://example.com/resolved/');
    });

    afterEach(function () {
        sinon.restore();
    });

    function makeFrame() {
        return {
            apiType: 'members',
            options: {},
            original: {}
        };
    }

    function makeComment(post) {
        return {
            id: 'comment-id',
            html: '<p>comment</p>',
            status: 'published',
            post
        };
    }

    it('resolves a comment on a post with the posts router type', function () {
        commentMapper(makeComment({
            id: 'post-id',
            uuid: 'post-uuid',
            title: 'A post',
            slug: 'a-post',
            type: 'post',
            status: 'published'
        }), makeFrame());

        sinon.assert.calledOnce(getUrlForResourceStub);
        const [resource] = getUrlForResourceStub.firstCall.args;
        assert.equal(resource.type, 'posts');
    });

    it('resolves a comment on a page with the pages router type', function () {
        // Comments are enabled on pages too. The lazy URL service routes by
        // the passed type: a page typed 'posts' is matched against the post
        // collections' filters, matches none, and resolves to /404/.
        commentMapper(makeComment({
            id: 'page-id',
            uuid: 'page-uuid',
            title: 'A page',
            slug: 'a-page',
            type: 'page',
            status: 'published'
        }), makeFrame());

        sinon.assert.calledOnce(getUrlForResourceStub);
        const [resource] = getUrlForResourceStub.firstCall.args;
        assert.equal(resource.type, 'pages');
    });

    it('defaults to the posts router type when the post relation carries no type', function () {
        commentMapper(makeComment({
            id: 'post-id',
            uuid: 'post-uuid',
            title: 'A post',
            slug: 'a-post',
            status: 'published'
        }), makeFrame());

        sinon.assert.calledOnce(getUrlForResourceStub);
        const [resource] = getUrlForResourceStub.firstCall.args;
        assert.equal(resource.type, 'posts');
    });
});
