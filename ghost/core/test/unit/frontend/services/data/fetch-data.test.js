const should = require('should');
const sinon = require('sinon');

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
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            browsePostsStub.calledOnce.should.be.true();
            browsePostsStub.firstCall.args[0].should.be.an.Object();
            browsePostsStub.firstCall.args[0].should.have.property('include');
            browsePostsStub.firstCall.args[0].should.not.have.property('filter');

            done();
        }).catch(done);
    });

    it('should handle path options with page/limit', function (done) {
        data.fetchData({page: 2, limit: 10}, null, locals).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            result.posts.length.should.eql(posts.length);

            browsePostsStub.calledOnce.should.be.true();
            browsePostsStub.firstCall.args[0].should.be.an.Object();
            browsePostsStub.firstCall.args[0].should.have.property('include');
            browsePostsStub.firstCall.args[0].should.have.property('limit', 10);
            browsePostsStub.firstCall.args[0].should.have.property('page', 2);

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
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');

            result.posts.length.should.eql(posts.length);
            result.data.featured.length.should.eql(posts.length);

            browsePostsStub.calledTwice.should.be.true();
            browsePostsStub.firstCall.args[0].should.have.property('include', 'authors,tags,tiers');
            browsePostsStub.secondCall.args[0].should.have.property('filter', 'featured:true');
            browsePostsStub.secondCall.args[0].should.have.property('limit', 3);
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
            should.exist(result);

            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');

            result.posts.length.should.eql(posts.length);
            result.data.featured.length.should.eql(posts.length);

            browsePostsStub.calledTwice.should.be.true();
            browsePostsStub.firstCall.args[0].should.have.property('include', 'authors,tags,tiers');
            browsePostsStub.firstCall.args[0].should.have.property('page', 2);
            browsePostsStub.secondCall.args[0].should.have.property('filter', 'featured:true');
            browsePostsStub.secondCall.args[0].should.have.property('limit', 3);
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
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('tag');

            result.posts.length.should.eql(posts.length);
            result.data.tag.length.should.eql(tags.length);

            browsePostsStub.calledOnce.should.be.true();
            browsePostsStub.firstCall.args[0].should.have.property('include');
            browsePostsStub.firstCall.args[0].should.have.property('filter', 'tags:testing');
            browsePostsStub.firstCall.args[0].should.not.have.property('slug');
            readTagsStub.firstCall.args[0].should.have.property('slug', 'testing');
            done();
        }).catch(done);
    });
});
