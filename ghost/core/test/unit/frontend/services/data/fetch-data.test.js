const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const _ = require('lodash');

const api = require('../../../../../core/frontend/services/proxy').api;
const data = require('../../../../../core/frontend/services/data');
const testUtils = require('../../../../utils');

describe('Unit - frontend/data/fetch-data', function () {
    let posts;
    let tags;
    let locals;
    let browsePostsStub;
    let readTagsStub;

    beforeEach(function () {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({url: '/a/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/b/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/c/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/d/'})
        ];

        tags = [
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag()
        ];

        browsePostsStub = sinon.stub().resolves({
            posts: posts,
            meta: {
                pagination: {
                    pages: 2
                }
            }
        });
        sinon.stub(api, 'postsPublic').get(() => {
            return {
                browse: browsePostsStub
            };
        });

        readTagsStub = sinon.stub().resolves({tags: tags});
        sinon.stub(api, 'tagsPublic').get(() => {
            return {
                read: readTagsStub
            };
        });

        locals = {};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should handle no options', async function () {
        const result = await data.fetchData(null, null, locals);
        assertExists(result);
        assert(result && typeof result === 'object');
        assert('posts' in result);
        assert('meta' in result);
        assert(!('data' in result));

        sinon.assert.calledOnce(browsePostsStub);
        assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
        assert('include' in browsePostsStub.firstCall.args[0]);
        assert(!('filter' in browsePostsStub.firstCall.args[0]));
    });

    it('should handle page and limit options', async function () {
        const result = await data.fetchData({page: 2, limit: 10}, null, locals);
        assertExists(result);
        assert(result && typeof result === 'object');
        assert('posts' in result);
        assert('meta' in result);
        assert(!('data' in result));

        assert.equal(result.posts.length, posts.length);

        sinon.assert.calledOnce(browsePostsStub);
        assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
        assert('include' in browsePostsStub.firstCall.args[0]);
        assert.equal(browsePostsStub.firstCall.args[0].limit, 10);
        assert.equal(browsePostsStub.firstCall.args[0].page, 2);
    });

    it('should handle multiple queries', async function () {
        const pathOptions = {};

        const routerOptions = {
            data: {
                featured: {
                    type: 'browse',
                    resource: 'posts',
                    options: {
                        filter: 'featured:true',
                        limit: 3
                    }
                }
            }
        };

        const result = await data.fetchData(pathOptions, routerOptions, locals);
        assertExists(result);
        assert(result && typeof result === 'object');
        assert('posts' in result);
        assert('meta' in result);
        assert('data' in result);
        assert(result.data && typeof result.data === 'object');
        assert('featured' in result.data);

        assert.equal(result.posts.length, posts.length);
        assert.equal(result.data.featured.length, posts.length);

        sinon.assert.calledTwice(browsePostsStub);
        assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
        assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
        assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
    });

    it('should handle multiple queries with page param', async function () {
        const pathOptions = {
            page: 2
        };

        const routerOptions = {
            data: {
                featured: {
                    type: 'browse',
                    resource: 'posts',
                    options: {filter: 'featured:true', limit: 3}
                }
            }
        };

        const result = await data.fetchData(pathOptions, routerOptions, locals);
        assertExists(result);

        assert(result && typeof result === 'object');
        assert('posts' in result);
        assert('meta' in result);
        assert('data' in result);
        assert(result.data && typeof result.data === 'object');
        assert('featured' in result.data);

        assert.equal(result.posts.length, posts.length);
        assert.equal(result.data.featured.length, posts.length);

        sinon.assert.calledTwice(browsePostsStub);
        assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
        assert.equal(browsePostsStub.firstCall.args[0].page, 2);
        assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
        assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
    });

    it('should handle queries with slug replacements', async function () {
        const pathOptions = {
            slug: 'testing'
        };

        const routerOptions = {
            filter: 'tags:%s',
            data: {
                tag: {
                    controller: 'tagsPublic',
                    type: 'read',
                    resource: 'tags',
                    options: {slug: '%s'}
                }
            }
        };

        const result = await data.fetchData(pathOptions, routerOptions, locals);
        assertExists(result);
        assert(result && typeof result === 'object');
        assert('posts' in result);
        assert('meta' in result);
        assert('data' in result);
        assert(result.data && typeof result.data === 'object');
        assert('tag' in result.data);

        assert.equal(result.posts.length, posts.length);
        assert.equal(result.data.tag.length, tags.length);

        sinon.assert.calledOnce(browsePostsStub);
        assert('include' in browsePostsStub.firstCall.args[0]);
        assert.equal(browsePostsStub.firstCall.args[0].filter, 'tags:testing');
        assert(!('slug' in browsePostsStub.firstCall.args[0]));
        assert.equal(readTagsStub.firstCall.args[0].slug, 'testing');
    });
});
