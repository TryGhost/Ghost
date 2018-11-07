const should = require('should'),
    sinon = require('sinon'),
    api = require('../../../../../server/api')['v0.1'],
    helpers = require('../../../../../server/services/routing/helpers'),
    testUtils = require('../../../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit - services/routing/helpers/fetch-data', function () {
    let posts, tags, locals;

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

        sandbox.stub(api.posts, 'browse')
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 2
                    }
                }
            });

        sandbox.stub(api.tags, 'read').resolves({tags: tags});

        locals = {apiVersion: 'v0.1'};
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should handle no options', function (done) {
        helpers.fetchData(null, null, locals).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.be.an.Object();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.not.have.property('filter');

            done();
        }).catch(done);
    });

    it('should handle path options with page/limit', function (done) {
        helpers.fetchData({page: 2, limit: 10}, null, locals).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            result.posts.length.should.eql(posts.length);

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.be.an.Object();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.have.property('limit', 10);
            api.posts.browse.firstCall.args[0].should.have.property('page', 2);

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

        helpers.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');
            result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
            result.data.featured.should.not.have.properties('data');

            result.posts.length.should.eql(posts.length);
            result.data.featured.posts.length.should.eql(posts.length);

            api.posts.browse.calledTwice.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include', 'author,authors,tags');

            api.posts.browse.secondCall.args[0].should.have.property('filter', 'featured:true');
            api.posts.browse.secondCall.args[0].should.have.property('limit', 3);
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

        helpers.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            should.exist(result);

            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');
            result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
            result.data.featured.should.not.have.properties('data');

            result.posts.length.should.eql(posts.length);
            result.data.featured.posts.length.should.eql(posts.length);

            api.posts.browse.calledTwice.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include', 'author,authors,tags');
            api.posts.browse.firstCall.args[0].should.have.property('page', 2);
            api.posts.browse.secondCall.args[0].should.have.property('filter', 'featured:true');
            api.posts.browse.secondCall.args[0].should.have.property('limit', 3);
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
                    alias: 'tags',
                    type: 'read',
                    resource: 'tags',
                    options: {slug: '%s'}
                }
            }
        };

        helpers.fetchData(pathOptions, routerOptions, locals).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('tag');

            result.posts.length.should.eql(posts.length);
            result.data.tag.length.should.eql(tags.length);

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.have.property('filter', 'tags:testing');
            api.posts.browse.firstCall.args[0].should.not.have.property('slug');
            api.tags.read.firstCall.args[0].should.have.property('slug', 'testing');
            done();
        }).catch(done);
    });
});
