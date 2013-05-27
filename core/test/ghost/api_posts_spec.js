/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var _ = require("underscore"),
        should = require('should'),
        helpers = require('./helpers'),
        PostProvider = require('../../shared/models/dataProvider.bookshelf.posts');

    describe('Bookshelf PostsProvider', function () {

        var posts;

        beforeEach(function (done) {
            helpers.resetData().then(function () {
                posts = new PostProvider();
                done();
            });
        });

        it('can browse', function (done) {
            posts.browse().then(function (results) {
                should.exist(results);

                results.length.should.equal(2);

                done();
            }, done);
        });

        it('can read', function (done) {
            var firstPost;

            posts.browse().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];

                return posts.read({slug: firstPost.attributes.slug});
            }).then(function (found) {
                should.exist(found);

                found.attributes.title.should.equal(firstPost.attributes.title);

                done();
            }, done);
        });

        it('can edit', function (done) {
            var firstPost;

            posts.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];

                return posts.edit({id: firstPost.id, title: "new title"});

            }).then(function (edited) {

                should.exist(edited);

                edited.attributes.title.should.equal('new title');

                done();

            }, done);
        });

        it('can add', function (done) {
            var newPost = {
                title: 'Test Title 1',
                content: 'Test Content 1'
            };

            posts.add(newPost).then(function (createdPost) {
                should.exist(createdPost);

                createdPost.attributes.title.should.equal(newPost.title, "title is correct");
                createdPost.attributes.content.should.equal(newPost.content, "content is correct");
                createdPost.attributes.slug.should.equal(newPost.title.toLowerCase().replace(/ /g, '-'), 'slug is correct');

                done();
            }, done);
        });

        it('can delete', function (done) {
            var firstPostId;
            posts.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstPostId = results.models[0].id;

                return posts.destroy(firstPostId);

            }).then(function () {

                return posts.browse();

            }).then(function (newResults) {
                var ids, hasDeletedId;

                ids = _.pluck(newResults.models, "id");

                hasDeletedId = _.any(ids, function (id) {
                    return id === firstPostId;
                });

                hasDeletedId.should.equal(false);

                done();

            }, done);
        });
    });
}());