const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../core/server/services/url');
const outputSerializerUrlUtil = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const {getPostUrl} = require('../../../../../core/server/services/mentions/service');

describe('Mentions service getPostUrl', function () {
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

    it('loads the URL service required relations before building the url', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);
        sinon.stub(outputSerializerUrlUtil, 'forPost').callsFake((id, attrs) => {
            attrs.url = 'https://site.com/post/';
            return attrs;
        });
        const post = fakePost();

        const url = await getPostUrl(post);

        sinon.assert.calledOnceWithExactly(post.load, ['tags', 'authors']);
        assert.equal(url, 'https://site.com/post/');
    });

    it('does not reload relations that are already loaded', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns(['tags', 'authors']);
        sinon.stub(outputSerializerUrlUtil, 'forPost').callsFake((id, attrs) => {
            attrs.url = 'https://site.com/post/';
            return attrs;
        });
        const post = fakePost({tags: {}, authors: {}});

        await getPostUrl(post);

        sinon.assert.notCalled(post.load);
    });

    it('loads nothing under the eager service', async function () {
        sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);
        sinon.stub(outputSerializerUrlUtil, 'forPost').callsFake((id, attrs) => {
            attrs.url = 'https://site.com/post/';
            return attrs;
        });
        const post = fakePost();

        await getPostUrl(post);

        sinon.assert.notCalled(post.load);
    });
});
