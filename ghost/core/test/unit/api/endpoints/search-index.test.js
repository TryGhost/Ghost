const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const urlService = require('../../../../core/server/services/url');
const {PostsService} = require('../../../../core/server/services/posts/posts-service-instance');
const searchIndexController = require('../../../../core/server/api/endpoints/search-index');

describe('Search index controller', function () {
    let browsePostsStub;

    beforeEach(function () {
        // the controller constructs its own PostsService instance
        browsePostsStub = sinon.stub(PostsService.prototype, 'browsePosts').resolves({data: []});
        sinon.stub(models.Tag, 'findPage').resolves({data: []});
        sinon.stub(models.User, 'findPage').resolves({data: []});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('lazyRouting: forces the URL service required columns into the tags fetch', async function () {
        sinon.stub(urlService.facade, 'getRequiredFields').withArgs('tags').returns(['visibility', 'slug']);
        sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);

        await searchIndexController.fetchTags.query();

        const options = models.Tag.findPage.getCall(0).args[0];
        assert.deepEqual(options.columns, ['id', 'slug', 'name', 'url', 'visibility']);
    });

    it('lazyRouting: forces router-filter columns into the posts fetch', async function () {
        const getRequiredFields = sinon.stub(urlService.facade, 'getRequiredFields');
        getRequiredFields.withArgs('posts').returns(['status', 'type', 'slug', 'featured']);
        sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);

        await searchIndexController.fetchPosts.query();

        const options = browsePostsStub.getCall(0).args[0];
        assert.ok(options.columns.includes('featured'));
        assert.ok(options.columns.includes('type'));
    });

    it('lazyRouting: leaves columns untouched under the eager service', async function () {
        sinon.stub(urlService.facade, 'getRequiredFields').returns([]);
        sinon.stub(urlService.facade, 'getRequiredRelations').returns([]);

        await searchIndexController.fetchTags.query();

        const options = models.Tag.findPage.getCall(0).args[0];
        assert.deepEqual(options.columns, ['id', 'slug', 'name', 'url']);
    });
});
