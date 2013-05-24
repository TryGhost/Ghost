/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var should = require('should'),
        helpers = require('./helpers'),
        PostProvider = require('../../shared/models/dataProvider.bookshelf.posts');

    describe("dataProvider.bookshelf", function () {
        describe('PostsProvider', function () {

            var posts;

            beforeEach(function (done) {
                helpers.resetData().then(function () {
                    posts = new PostProvider();
                    done();
                });
            });

            it('can create', function (done) {
                var newPost = {
                    title: 'Test Title 1',
                    content: 'Test Content 1'
                };

                posts.add(newPost, function (err, createdPost) {
                    if (err) { throw err; }

                    should.exist(createdPost);

                    createdPost.attributes.title.should.equal(newPost.title, "title is correct");
                    createdPost.attributes.content.should.equal(newPost.content, "content is correct");
                    createdPost.attributes.slug.should.equal(newPost.title.toLowerCase().replace(/ /g, '-'), 'slug is correct');

                    done();
                });
            });
        });
    });
}());