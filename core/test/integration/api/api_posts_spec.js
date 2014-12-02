 /*globals describe, before, beforeEach, afterEach, it */
 /*jshint expr:true*/
var testUtils     = require('../../utils'),
    should        = require('should'),
    _             = require('lodash'),

    // Stuff we are testing
    PostAPI       = require('../../../server/api/posts');

describe('Post API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:post', 'posts', 'perms:init'));

    function extractFirstPost(posts) {
        return _.filter(posts, {id: 1})[0];
    }

    should.exist(PostAPI);

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
            firstPost = extractFirstPost(results.posts);
            return PostAPI.read({slug: firstPost.slug, include: 'tags'});
        }).then(function (found) {
            var post;

            should.exist(found);
            testUtils.API.checkResponse(found.posts[0], 'post', 'tags');

            post = found.posts[0];

            post.created_at.should.be.an.instanceof(Date);

            should.exist(post.tags);
            post.tags.length.should.be.above(0);
            testUtils.API.checkResponse(post.tags[0], 'tag');

            done();
        }).catch(done);
    });
});
