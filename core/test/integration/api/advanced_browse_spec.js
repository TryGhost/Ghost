var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),

// Stuff we are testing
    PostAPI = require('../../../server/api/v0.1/posts'),
    TagAPI = require('../../../server/api/v0.1/tags'),
    UserAPI = require('../../../server/api/v0.1/users');

describe('Advanced Browse', function () {
    // Initialise the DB just once, the tests are fetch-only
    before(testUtils.teardown);
    before(testUtils.setup('filter'));
    after(testUtils.teardown);

    should.exist(PostAPI);
    should.exist(TagAPI);
    should.exist(UserAPI);

    // @TODO: remove, but double check assertions
    describe('Old Use Cases', function () {
        describe('Empty results', function () {
            // @TODO: remove, but double check assertions
            it('Will return empty result if tag has no posts', function (done) {
                PostAPI.browse({filter: 'tag:no-posts', include: 'tag,author'}).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 4 matching items
                    result.posts.should.be.an.Array().with.lengthOf(0);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(0);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: new query does not have meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });
        });
    });

    describe('Bad behaviour', function () {
        it('Try to get draft posts (filter with or)', function (done) {
            // @TODO: put to routing test
            PostAPI.browse({filter: 'status:published,status:draft', limit: 'all'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                done();
            }).catch(done);
        });

        // @TODO: put to unit test, you can test the default filter & enforce filter functions
        it('Try to get draft posts (filter with in)', function (done) {
            PostAPI.browse({filter: 'status:[published,draft]', limit: 'all'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                done();
            }).catch(done);
        });
        // @TODO: put to unit test, you can test the default filter & enforce filter functions
        it('Try to get draft posts (filter with group)', function (done) {
            PostAPI.browse({filter: 'page:false,(status:draft)', limit: 'all'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                done();
            }).catch(done);
        });
        // @TODO: put to unit test, you can test the default filter & enforce filter functions
        it('Try to get draft posts (filter with group and in)', function (done) {
            PostAPI.browse({filter: 'page:false,(status:[draft,published])', limit: 'all'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                done();
            }).catch(done);
        });
    });
});
