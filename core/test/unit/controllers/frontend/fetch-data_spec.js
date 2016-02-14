/*globals describe, beforeEach, afterEach, it*/
var should   = require('should'),
    sinon    = require('sinon'),
    Promise  = require('bluebird'),
    _        = require('lodash'),

    // Stuff we are testing
    api      = require('../../../../server/api'),
    fetchData = require('../../../../server/controllers/frontend/fetch-data'),

    config   = require('../../../../server/config'),
    origConfig = _.cloneDeep(config),

    sandbox = sinon.sandbox.create();

describe('fetchData', function () {
    var apiPostsStub,
        apiTagStub,
        apiUserStub;

    beforeEach(function () {
        apiPostsStub = sandbox.stub(api.posts, 'browse')
            .returns(new Promise.resolve({posts: [], meta: {pagination: {}}}));
        apiTagStub = sandbox.stub(api.tags, 'read').returns(new Promise.resolve({tags: []}));
        apiUserStub = sandbox.stub(api.users, 'read').returns(new Promise.resolve({users: []}));
    });

    afterEach(function () {
        config.set(origConfig);
        sandbox.restore();
    });

    describe('channel config', function () {
        beforeEach(function () {
            config.set({theme: {postsPerPage: 10}});
        });

        it('should handle no post options', function (done) {
            fetchData({}).then(function (result) {
                should.exist(result);
                result.should.be.an.Object().with.properties('posts', 'meta');
                result.should.not.have.property('data');

                apiPostsStub.calledOnce.should.be.true();
                apiPostsStub.firstCall.args[0].should.be.an.Object();
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);

                done();
            }).catch(done);
        });

        it('should handle post options with only page', function (done) {
            fetchData({postOptions: {page: 2}}).then(function (result) {
                should.exist(result);
                result.should.be.an.Object().with.properties('posts', 'meta');
                result.should.not.have.property('data');

                apiPostsStub.calledOnce.should.be.true();
                apiPostsStub.firstCall.args[0].should.be.an.Object();
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                apiPostsStub.firstCall.args[0].should.have.property('page', 2);

                done();
            }).catch(done);
        });

        it('should handle multiple queries', function (done) {
            var channelOpts = {
                data: {
                    featured: {
                        type: 'browse',
                        resource: 'posts',
                        options: {filter: 'featured:true', limit: 3}
                    }
                }
            };
            fetchData(channelOpts).then(function (result) {
                should.exist(result);
                result.should.be.an.Object().with.properties('posts', 'meta', 'data');
                result.data.should.be.an.Object().with.properties('featured');
                result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
                result.data.featured.should.not.have.properties('data');

                apiPostsStub.calledTwice.should.be.true();
                apiPostsStub.firstCall.args[0].should.have.property('include', 'author,tags');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                apiPostsStub.secondCall.args[0].should.have.property('filter', 'featured:true');
                apiPostsStub.secondCall.args[0].should.have.property('limit', 3);
                done();
            }).catch(done);
        });

        it('should handle multiple queries with page param', function (done) {
            var channelOpts = {
                postOptions: {page: 2},
                data: {
                    featured: {
                        type: 'browse',
                        resource: 'posts',
                        options: {filter: 'featured:true', limit: 3}
                    }
                }
            };
            fetchData(channelOpts).then(function (result) {
                should.exist(result);

                result.should.be.an.Object().with.properties('posts', 'meta', 'data');
                result.data.should.be.an.Object().with.properties('featured');
                result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
                result.data.featured.should.not.have.properties('data');

                apiPostsStub.calledTwice.should.be.true();
                apiPostsStub.firstCall.args[0].should.have.property('include', 'author,tags');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                apiPostsStub.firstCall.args[0].should.have.property('page', 2);
                apiPostsStub.secondCall.args[0].should.have.property('filter', 'featured:true');
                apiPostsStub.secondCall.args[0].should.have.property('limit', 3);
                done();
            }).catch(done);
        });

        it('should handle queries with slug replacements', function (done) {
            var channelOpts = {
                postOptions: {
                    filter: 'tags:%s'
                },
                slugParam: 'testing',
                data: {
                    tag: {
                        type: 'read',
                        resource: 'tags',
                        options: {slug: '%s'}
                    }
                }
            };

            fetchData(channelOpts).then(function (result) {
                should.exist(result);
                result.should.be.an.Object().with.properties('posts', 'meta', 'data');
                result.data.should.be.an.Object().with.properties('tag');

                apiPostsStub.calledOnce.should.be.true();
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                apiTagStub.firstCall.args[0].should.have.property('slug', 'testing');
                done();
            }).catch(done);
        });
    });

    describe('valid postsPerPage', function () {
        beforeEach(function () {
            config.set({theme: {postsPerPage: 10}});
        });

        it('Adds limit & includes to options by default', function (done) {
            fetchData({}).then(function () {
                apiPostsStub.calledOnce.should.be.true();
                apiPostsStub.firstCall.args[0].should.be.an.Object();
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                done();
            }).catch(done);
        });
    });

    describe('invalid postsPerPage', function () {
        beforeEach(function () {
            config.set({theme: {postsPerPage: '-1'}});
        });

        it('Will not add limit if postsPerPage is not valid', function (done) {
            fetchData({}).then(function () {
                apiPostsStub.calledOnce.should.be.true();
                apiPostsStub.firstCall.args[0].should.be.an.Object();
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.not.have.property('limit');

                done();
            }).catch(done);
        });
    });
});
