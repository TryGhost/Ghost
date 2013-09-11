/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./testUtils'),
    should = require('should'),
    _ = require("underscore"),
    when = require('when'),
    sequence = require('when/sequence'),

    // Stuff we are testing
    Models = require('../../server/models');

describe('Post Model', function () {

    var PostModel = Models.Post,
        UserModel = Models.User,
        userData = {
            password: 'testpass1',
            email: "test@test1.com",
            name: "Mr Biscuits"
        };

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        testUtils.initData()
            .then(function () {
                return UserModel.add(userData);
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

    it('can browse', function (done) {
        PostModel.browse().then(function (results) {
            should.exist(results);
            results.length.should.equal(1);

            // should be in published_at, DESC order
            // model and API differ here - need to fix
            //results.models[0].attributes.published_at.should.be.above(results.models[1].attributes.published_at);

            done();
        }).then(null, done);
    });

    it('can read', function (done) {
        var firstPost;

        PostModel.browse().then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            firstPost = results.models[0];

            return PostModel.read({slug: firstPost.attributes.slug});
        }).then(function (found) {
            should.exist(found);
            found.attributes.title.should.equal(firstPost.attributes.title);

            done();
        }).then(null, done);
    });

    it('can findAll, returning author and user data', function (done) {
        var firstPost;

        PostModel.findAll({}).then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            firstPost = results.models[0].toJSON();

            firstPost.author.should.be.a("object");
            firstPost.user.should.be.a("object");
            firstPost.author.name.should.equal("Mr Biscuits");
            firstPost.user.name.should.equal("Mr Biscuits");

            done();
        }, done);
    });

    it('can findOne, returning author and user data', function (done) {
        var firstPost;

        PostModel.findOne({}).then(function (result) {
            should.exist(result);
            firstPost = result.toJSON();

            firstPost.author.should.be.a("object");
            firstPost.user.should.be.a("object");
            firstPost.author.name.should.equal("Mr Biscuits");
            firstPost.user.name.should.equal("Mr Biscuits");

            done();
        }, done);
    });

    it('can edit', function (done) {
        var firstPost;

        PostModel.browse().then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            firstPost = results.models[0];

            return PostModel.edit({id: firstPost.id, title: "new title"});
        }).then(function (edited) {
            should.exist(edited);
            edited.attributes.title.should.equal('new title');

            done();
        }).then(null, done);
    });

    it('can add, defaulting as a draft', function (done) {
        var createdPostUpdatedDate,
            newPost = {
                title: 'Test Title 1',
                markdown: 'Test Content 1'
            };

        PostModel.add(newPost).then(function (createdPost) {
            return new PostModel({id: createdPost.id}).fetch();
        }).then(function (createdPost) {
            should.exist(createdPost);
            createdPost.has('uuid').should.equal(true);
            createdPost.get('status').should.equal('draft');
            createdPost.get('title').should.equal(newPost.title, "title is correct");
            createdPost.get('markdown').should.equal(newPost.markdown, "markdown is correct");
            createdPost.has('html').should.equal(true);
            createdPost.get('html').should.equal('<p>' + newPost.markdown + '</p>');
            createdPost.get('slug').should.equal('test-title-1');
            createdPost.get('created_at').should.be.below(new Date().getTime()).and.be.above(new Date(0).getTime());
            createdPost.get('created_by').should.equal(1);
            createdPost.get('author_id').should.equal(1);
            createdPost.get('created_by').should.equal(createdPost.get('author_id'));
            createdPost.get('updated_at').should.be.below(new Date().getTime()).and.be.above(new Date(0).getTime());
            createdPost.get('updated_by').should.equal(1);
            should.equal(createdPost.get('published_at'), null);
            should.equal(createdPost.get('published_by'), null);

            createdPostUpdatedDate = createdPost.get('updated_at');

            // Set the status to published to check that `published_at` is set.
            return createdPost.save({status: 'published'});
        }).then(function (publishedPost) {
            publishedPost.get('published_at').should.be.instanceOf(Date);
            publishedPost.get('published_by').should.equal(1);
            publishedPost.get('updated_at').should.be.instanceOf(Date);
            publishedPost.get('updated_by').should.equal(1);
            publishedPost.get('updated_at').should.not.equal(createdPostUpdatedDate);

            done();
        }).then(null, done);

    });

    it('can trim title', function (done) {
        var untrimmedCreateTitle = '  test trimmed create title  ',
            untrimmedUpdateTitle = '  test trimmed update title  ',
            newPost = {
                title: untrimmedCreateTitle,
                markdown: 'Test Content'
            };

        PostModel.add(newPost).then(function (createdPost) {
            return new PostModel({ id: createdPost.id }).fetch();
        }).then(function (createdPost) {
            should.exist(createdPost);
            createdPost.get('title').should.equal(untrimmedCreateTitle.trim());

            return createdPost.save({ title: untrimmedUpdateTitle });
        }).then(function (updatedPost) {
            updatedPost.get('title').should.equal(untrimmedUpdateTitle.trim());

            done();
        }).otherwise(done);
    });

    it('can generate a non conflicting slug', function (done) {
        var newPost = {
                title: 'Test Title',
                markdown: 'Test Content 1'
            };

        this.timeout(5000); // this is a patch to ensure it doesn't timeout.

        // Create 12 posts with the same title
        sequence(_.times(12, function (i) {
            return function () {
                return PostModel.add({
                    title: "Test Title",
                    markdown: "Test Content " + (i+1)
                });
            };
        })).then(function (createdPosts) {
            // Should have created 12 posts
            createdPosts.length.should.equal(12);

            // Should have unique slugs and contents
            _(createdPosts).each(function (post, i) {
                var num = i + 1;

                // First one has normal title
                if (num === 1) {
                    post.get('slug').should.equal('test-title');
                    return;
                }

                post.get('slug').should.equal('test-title-' + num);
                post.get('markdown').should.equal('Test Content ' + num);
            });

            done();
        }).otherwise(done);
    });


    it('can generate slugs without duplicate hyphens', function (done) {
        var newPost = {
            title: 'apprehensive  titles  have  too  many  spaces  ',
            markdown: 'Test Content 1'
        };

        PostModel.add(newPost).then(function (createdPost) {

            createdPost.get('slug').should.equal('apprehensive-titles-have-too-many-spaces');

            done();
        }).then(null, done);
    });

    it('can delete', function (done) {
        var firstPostId;
        PostModel.browse().then(function (results) {
            should.exist(results);
            results.length.should.be.above(0);
            firstPostId = results.models[0].id;

            return PostModel.destroy(firstPostId);
        }).then(function () {
            return PostModel.browse();
        }).then(function (newResults) {
            var ids, hasDeletedId;

            ids = _.pluck(newResults.models, "id");
            hasDeletedId = _.any(ids, function (id) {
                return id === firstPostId;
            });
            hasDeletedId.should.equal(false);

            done();
        }).then(null, done);
    });

    it('can fetch a paginated set, with various options', function (done) {
        this.timeout(10000); // this is a patch to ensure it doesn't timeout.

        testUtils.insertMorePosts().then(function () {

            return PostModel.findPage({page: 2});
        }).then(function (paginationResult) {
            paginationResult.page.should.equal(2);
            paginationResult.limit.should.equal(15);
            paginationResult.posts.length.should.equal(15);
            paginationResult.pages.should.equal(4);

            return PostModel.findPage({page: 5});
        }).then(function (paginationResult) {
            paginationResult.page.should.equal(5);
            paginationResult.limit.should.equal(15);
            paginationResult.posts.length.should.equal(0);
            paginationResult.pages.should.equal(4);

            return PostModel.findPage({limit: 30});
        }).then(function (paginationResult) {
            paginationResult.page.should.equal(1);
            paginationResult.limit.should.equal(30);
            paginationResult.posts.length.should.equal(30);
            paginationResult.pages.should.equal(2);

            return PostModel.findPage({limit: 10, page: 2, where: {language: 'fr'}});
        }).then(function (paginationResult) {
            paginationResult.page.should.equal(2);
            paginationResult.limit.should.equal(10);
            paginationResult.posts.length.should.equal(10);
            paginationResult.pages.should.equal(3);

            return PostModel.findPage({limit: 10, page: 2, status: 'all'});
        }).then(function (paginationResult) {
            paginationResult.pages.should.equal(11);

            done();
        }).then(null, done);
    });
});
