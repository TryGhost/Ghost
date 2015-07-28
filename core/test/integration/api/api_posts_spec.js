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

    describe('Browse', function () {
        it('can fetch featured posts', function (done) {
            PostAPI.browse({context: {user: 1}, featured: true}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].featured.should.eql(true);

                done();
            }).catch(done);
        });

        it('can exclude featured posts', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', featured: false}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].featured.should.eql(false);

                done();
            }).catch(done);
        });

        it('can limit the number of posts', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', limit: 3}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(3);
                results.meta.pagination.limit.should.eql(3);

                done();
            }).catch(done);
        });

        it('can fetch only static posts', function (done) {
            PostAPI.browse({context: {user: 1}, staticPages: true}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);

                done();
            }).catch(done);
        });

        it('can fetch only static posts with string \'true\'', function (done) {
            PostAPI.browse({context: {user: 1}, staticPages: 'true'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);

                done();
            }).catch(done);
        });

        it('can fetch only static posts with string \'1\'', function (done) {
            PostAPI.browse({context: {user: 1}, staticPages: '1'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);

                done();
            }).catch(done);
        });

        it('can exclude static posts', function (done) {
            PostAPI.browse({context: {user: 1}, staticPages: false}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].page.should.eql(false);

                done();
            }).catch(done);
        });

        it('can fetch static and normal posts', function (done) {
            PostAPI.browse({context: {user: 1}, staticPages: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(5);

                done();
            }).catch(done);
        });

        it('can fetch page 1', function (done) {
            PostAPI.browse({context: {user: 1}, page: 1, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('unfinished');
                results.meta.pagination.page.should.eql(1);
                results.meta.pagination.next.should.eql(2);

                done();
            }).catch(done);
        });

        it('can fetch page 2', function (done) {
            PostAPI.browse({context: {user: 1}, page: 2, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('short-and-sweet');
                results.meta.pagination.page.should.eql(2);
                results.meta.pagination.next.should.eql(3);
                results.meta.pagination.prev.should.eql(1);

                done();
            }).catch(done);
        });

        it('without context.user cannot fetch all posts', function (done) {
            PostAPI.browse({status: 'all'}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'posts');
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].status.should.eql('published');
                testUtils.API.checkResponse(results.posts[0], 'post');

                done();
            }).catch(done);
        });

        it('with context.user can fetch drafts', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'draft'}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'posts');
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].status.should.eql('draft');
                testUtils.API.checkResponse(results.posts[0], 'post');

                done();
            }).catch(done);
        });

        it('with context.user can fetch all posts', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all'}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'posts');
                should.exist(results.posts);
                results.posts.length.should.eql(5);
                results.posts[0].status.should.eql('draft');
                testUtils.API.checkResponse(results.posts[0], 'post');

                done();
            }).catch(done);
        });

        it('can include tags', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', include: 'tags'}).then(function (results) {
                should.exist(results.posts[0].tags[0].name);
                results.posts[0].tags[0].name.should.eql('pollo');
                done();
            }).catch(done);
        });

        it('can include author', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', include: 'author'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');

                done();
            }).catch(done);
        });

        it('can fetch all posts for a tag', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', tag: 'kitchen-sink'}).then(function (results) {
                results.posts.length.should.be.eql(2);
                results.meta.filters.tags[0].slug.should.eql('kitchen-sink');

                done();
            }).catch(done);
        });

        it('can fetch all posts for an author', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', author: 'joe-bloggs'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(5);
                results.meta.filters.author[0].slug.should.eql('joe-bloggs');

                done();
            }).catch(done);
        });
    });

    describe('Read', function () {
        it('can fetch a post', function (done) {
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

        it('without context.user cannot fetch draft', function (done) {
            PostAPI.read({slug: 'unfinished', status: 'draft'}).then(function (results) {
                should.not.exist(results.posts);
                done();
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');

                done();
            });
        });

        it('with context.user can fetch a draft', function (done) {
            PostAPI.read({context: {user: 1}, slug: 'unfinished', status: 'draft'}).then(function (results) {
                should.exist(results.posts);
                results.posts[0].status.should.eql('draft');

                done();
            }).catch(done);
        });

        it('without context.user can fetch a draft if uuid is provided', function (done) {
            PostAPI.read({uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c903', status: 'draft'}).then(function (results) {
                should.exist(results.posts);
                results.posts[0].slug.should.eql('unfinished');
                done();
            }).catch(done);
        });

        it('cannot fetch post with unknown id', function (done) {
            PostAPI.read({context: {user: 1}, slug: 'not-a-post'}).then(function () {
                done();
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');

                done();
            });
        });

        it('can fetch post with by id', function (done) {
            PostAPI.read({context: {user: 1}, id: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts[0].id.should.eql(2);
                results.posts[0].slug.should.eql('ghostly-kitchen-sink');
                done();
            }).catch(done);
        });

        it('can include tags', function (done) {
            PostAPI.read({context: {user: 1}, id: 3, include: 'tags'}).then(function (results) {
                should.exist(results.posts[0].tags);
                results.posts[0].tags[0].slug.should.eql('chorizo');
                done();
            }).catch(done);
        });

        it('can include author', function (done) {
            PostAPI.read({context: {user: 1}, id: 2, include: 'author'}).then(function (results) {
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');
                done();
            }).catch(done);
        });

        it('can include next post', function (done) {
            PostAPI.read({context: {user: 1}, id: 3, include: 'next'}).then(function (results) {
                should.exist(results.posts[0].next.slug);
                results.posts[0].next.slug.should.eql('not-so-short-bit-complex');
                done();
            }).catch(done);
        });

        it('can include previous post', function (done) {
            PostAPI.read({context: {user: 1}, id: 3, include: 'previous'}).then(function (results) {
                should.exist(results.posts[0].previous.slug);
                results.posts[0].previous.slug.should.eql('ghostly-kitchen-sink');
                done();
            }).catch(done);
        });
    });
});
