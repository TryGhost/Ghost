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
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can browse', function (done) {
        PostAPI.browse().then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'posts');
            should.exist(results.posts);
            results.posts.length.should.be.above(0);
            testUtils.API.checkResponse(results.posts[0], 'post');
            done();
        }).catch(done);
    });

    it('can read', function (done) {
        var firstPost;

        PostAPI.browse().then(function (results) {
            should.exist(results);
            should.exist(results.posts);
            results.posts.length.should.be.above(0);
            firstPost = results.posts[0];
            return PostAPI.read({slug: firstPost.slug, include: 'tags'});
        }).then(function (found) {
            var post;

            should.exist(found);
            testUtils.API.checkResponse(found.posts[0], 'post');

            post = found.posts[0];

            should.exist(post.tags);
            post.tags.length.should.be.above(0);
            testUtils.API.checkResponse(post.tags[0], 'tag');

            done();
        }).catch(done);
    });
});