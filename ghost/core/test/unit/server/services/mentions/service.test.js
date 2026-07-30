const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../core/server/services/url');
const outputSerializerUrlUtil = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const {getPostData, getPostUrl} = require('../../../../../core/server/services/mentions/service');

describe('Mentions service post url helpers', function () {
    afterEach(function () {
        sinon.restore();
    });

    function fakePost(relations = {}) {
        return {
            id: 'post-id',
            relations,
            load: sinon.stub().resolves(),
            toJSON: sinon.stub().returns({id: 'post-id', title: 'Post'})
        };
    }

    it('loads the URL service required relations before returning the post data', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);
        const post = fakePost();

        await getPostData(post);

        sinon.assert.calledOnceWithExactly(post.load, ['tags', 'authors']);
    });

    it('getPostUrl resolves a url from a plain resource', function () {
        const forPost = sinon.stub(outputSerializerUrlUtil, 'forPost').callsFake((id, attrs) => {
            attrs.url = `https://site.com/${attrs.slug}/`;
            return attrs;
        });

        const url = getPostUrl('post-id', {slug: 'gone', status: 'published', type: 'post'});

        assert.equal(url, 'https://site.com/gone/');
        assert.equal(forPost.getCall(0).args[0], 'post-id');
        assert.equal(forPost.getCall(0).args[1].status, 'published');
    });

    it('does not reload relations that are already loaded', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);
        const post = fakePost({tags: {}, authors: {}});

        await getPostData(post);

        sinon.assert.notCalled(post.load);
    });

    it('loads nothing under the eager service', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);
        const post = fakePost();

        await getPostData(post);

        sinon.assert.notCalled(post.load);
    });
});
