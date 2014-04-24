/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator = require('../../utils/fixtures/data-generator'),
    PostAPI       = require('../../../server/api/posts');

describe('Post API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('browse', function (done) {
        PostAPI.browse().then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'posts');            
            should.exist(results.posts);
            results.posts.length.should.be.above(0);
            testUtils.API.checkResponse(results.posts[0], 'post');
            done();
        }).then(null, done);
    });

    it('read', function (done) {
        var firstPost;

        PostAPI.browse().then(function (results) {
            should.exist(results);
            should.exist(results.posts);
            results.posts.length.should.be.above(0);
            firstPost = results.posts[0];
            return PostAPI.read({slug: firstPost.slug});
        }).then(function (found) {
            should.exist(found);
            testUtils.API.checkResponse(found.posts[0], 'post');
            done();
        }).then(null, done);
    });
});