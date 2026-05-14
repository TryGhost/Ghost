const sinon = require('sinon');
const PostsService = require('../../../../core/server/services/posts/posts-service');
const models = require('../../../../core/server/models');

// The search-index endpoints feed the editor's bookmark / internal-link
// pickers. Each query() returns thin columns (id, slug, title, status, url,
// …) because the editor only needs identity + a clickable URL. Under
// lazyRouting the URL is computed at serialization time from the resource's
// tags/authors — so without those relations loaded, every URL in the search
// result resolves to /404/ on a site with any tag- or author-filtered route.
// These tests pin the contract that the endpoint always loads the relations
// the URL serializer needs, regardless of the visible response shape.

describe('search-index endpoint', function () {
    let browsePostsStub;
    let tagsFindPageStub;
    let usersFindPageStub;
    let controller;

    beforeEach(function () {
        browsePostsStub = sinon.stub(PostsService.prototype, 'browsePosts').resolves({data: []});
        tagsFindPageStub = sinon.stub(models.Tag, 'findPage').resolves({data: []});
        usersFindPageStub = sinon.stub(models.User, 'findPage').resolves({data: []});

        // Force a fresh require so the module re-runs with our stubs in
        // place — the singleton postsService it constructs at top-of-file
        // will pick up the prototype stub via inheritance.
        delete require.cache[require.resolve('../../../../core/server/api/endpoints/search-index')];
        controller = require('../../../../core/server/api/endpoints/search-index');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('fetchPosts', function () {
        it('loads tags+authors so URL serialization can resolve tag-filtered routes', async function () {
            await controller.fetchPosts.query();
            sinon.assert.calledWith(browsePostsStub, sinon.match({
                withRelated: sinon.match.array.contains(['tags', 'authors'])
            }));
        });
    });

    describe('fetchPages', function () {
        it('loads tags+authors so URL serialization can resolve tag-filtered routes', async function () {
            await controller.fetchPages.query();
            sinon.assert.calledWith(browsePostsStub, sinon.match({
                withRelated: sinon.match.array.contains(['tags', 'authors'])
            }));
        });
    });

    // Tags and authors don't need relations to compute their own URLs, so
    // there's no equivalent assertion for fetchTags / fetchUsers. The smoke
    // tests below just confirm the endpoints still execute against the
    // model layer without surprising the wiring.
    describe('fetchTags', function () {
        it('queries Tag.findPage', async function () {
            await controller.fetchTags.query();
            sinon.assert.calledOnce(tagsFindPageStub);
        });
    });

    describe('fetchUsers', function () {
        it('queries User.findPage', async function () {
            await controller.fetchUsers.query();
            sinon.assert.calledOnce(usersFindPageStub);
        });
    });
});
