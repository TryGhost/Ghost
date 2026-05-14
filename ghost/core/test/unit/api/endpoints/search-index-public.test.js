const sinon = require('sinon');
const PostsService = require('../../../../core/server/services/posts/posts-service');
const models = require('../../../../core/server/models');

// Public-facing search index used by sodo-search and similar in-theme
// search experiences. Same lazyRouting URL-resolution constraint as the
// admin-side search-index: posts must be loaded with tags+authors so URL
// serialization can resolve tag- or author-filtered routes, otherwise
// every result links to /404/.

describe('search-index-public endpoint', function () {
    let browsePostsStub;
    let authorsFindPageStub;
    let tagsFindPageStub;
    let controller;

    beforeEach(function () {
        browsePostsStub = sinon.stub(PostsService.prototype, 'browsePosts').resolves({data: []});
        authorsFindPageStub = sinon.stub(models.Author, 'findPage').resolves({data: []});
        tagsFindPageStub = sinon.stub(models.Tag, 'findPage').resolves({data: []});

        delete require.cache[require.resolve('../../../../core/server/api/endpoints/search-index-public')];
        controller = require('../../../../core/server/api/endpoints/search-index-public');
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

    describe('fetchAuthors', function () {
        it('queries Author.findPage', async function () {
            await controller.fetchAuthors.query();
            sinon.assert.calledOnce(authorsFindPageStub);
        });
    });

    describe('fetchTags', function () {
        it('queries Tag.findPage', async function () {
            await controller.fetchTags.query();
            sinon.assert.calledOnce(tagsFindPageStub);
        });
    });
});
