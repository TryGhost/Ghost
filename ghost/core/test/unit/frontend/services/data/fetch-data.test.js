const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const should = require('should');
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

    it('should handle no options', function (done) {
        data.fetchData(null, null, locals).then(function (result) {
            assertExists(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            assert(!('data' in result));

            assert.equal(browsePostsStub.calledOnce, true);
            assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
            assert('include' in browsePostsStub.firstCall.args[0]);
            assert(!('filter' in browsePostsStub.firstCall.args[0]));

            done();
        }).catch(done);
    });

    it('should handle path options with page/limit', function (done) {
        data.fetchData({page: 2, limit: 10}, null, locals).then(function (result) {
            assertExists(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            assert(!('data' in result));

            assert.equal(result.posts.length, posts.length);

            assert.equal(browsePostsStub.calledOnce, true);
            assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
            assert('include' in browsePostsStub.firstCall.args[0]);
            assert.equal(browsePostsStub.firstCall.args[0].limit, 10);
            assert.equal(browsePostsStub.firstCall.args[0].page, 2);

            done();
        }).catch(done);
    });

    it('should handle multiple queries', function (done) {
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

        data.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            assertExists(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');

            assert.equal(result.posts.length, posts.length);
            assert.equal(result.data.featured.length, posts.length);

            assert.equal(browsePostsStub.calledTwice, true);
            assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
            assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
            assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
            done();
        }).catch(done);
    });

    it('should handle multiple queries with page param', function (done) {
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

        data.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            assertExists(result);

            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');

            assert.equal(result.posts.length, posts.length);
            assert.equal(result.data.featured.length, posts.length);

            assert.equal(browsePostsStub.calledTwice, true);
            assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
            assert.equal(browsePostsStub.firstCall.args[0].page, 2);
            assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
            assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
            done();
        }).catch(done);
    });

    it('should handle queries with slug replacements', function (done) {
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

        data.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            assertExists(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('tag');

            assert.equal(result.posts.length, posts.length);
            assert.equal(result.data.tag.length, tags.length);

            assert.equal(browsePostsStub.calledOnce, true);
            assert('include' in browsePostsStub.firstCall.args[0]);
            assert.equal(browsePostsStub.firstCall.args[0].filter, 'tags:testing');
            assert(!('slug' in browsePostsStub.firstCall.args[0]));
            assert.equal(readTagsStub.firstCall.args[0].slug, 'testing');
            done();
        }).catch(done);
    });
});
