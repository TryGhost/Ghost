/*globals describe, before, after, it */
/*jshint expr:true*/
var testUtils = require('../../utils'),
    should    = require('should'),
    _         = require('lodash'),

// Stuff we are testing
    PostAPI          = require('../../../server/api/posts'),
    TagAPI          = require('../../../server/api/tags'),
    UserAPI          = require('../../../server/api/users');

describe('Filter Param Spec', function () {
    // Initialise the DB just once, the tests are fetch-only
    before(testUtils.teardown);
    before(testUtils.setup('filter'));
    after(testUtils.teardown);

    should.exist(PostAPI);

    describe('Advanced Use Cases', function () {
        describe('1. Posts - filter: "tags: [photo, video] + id: -4", limit: "3", include: "tags"', function () {
            it('Will fetch 3 posts with tags which match `photo` or `video` and are not the post with id 4.', function (done) {
                PostAPI.browse({filter: 'tags: [photo, video] + id: -4', limit: 3, include: 'tags'}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 3 items according to the limit property
                    result.posts.should.be.an.Array.with.lengthOf(3);

                    // None of the items returned should be the post with id 4, as that was excluded
                    ids = _.pluck(result.posts, 'id');
                    ids.should.not.containEql(4);

                    // Should not contain draft
                    ids.should.not.containEql(19);

                    // The ordering specifies that any post which matches both tags should be first
                    // Post 2 is the first in the list to have both tags
                    ids[0].should.eql(2);

                    // Each post should have a tag which matches either 'photo' or 'video'
                    _.each(result.posts, function (post) {
                        var slugs = _.pluck(post.tags, 'slug');
                        slugs.should.matchAny(/photo|video/);
                    });

                    // TODO: match order, followed by publish date
                    // This isn't finished yet, as the 'special rule' ordering for matching 'in' requests hasn't been
                    // implemented properly.

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(3);
                    result.meta.pagination.pages.should.eql(3);
                    result.meta.pagination.total.should.eql(7);
                    result.meta.pagination.next.should.eql(2);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe('2. Posts - filter: "tag:photo,featured:true,image:-null", include: "tags"', function () {
            it('Will fetch posts which have either a tag of `photo`, are marked `featured` or have an image.', function (done) {
                PostAPI.browse({filter: 'tag:photo,featured:true,image:-null', include: 'tags'}).then(function (result) {
                    var ids;

                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(10);

                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([15, 14, 11, 9, 8, 7, 6, 5, 3, 2]);

                    // TODO: Should be in published order

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(10);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe.skip('3. Tags - filter="post.count:>=1" order="posts.count DESC" limit="all"', function () {
            it('Will fetch all tags, ordered by post count, where the post count is at least 1.', function (done) {
                TagAPI.browse({filter: 'post.count:>=1', order: 'posts.count DESC', limit: 'all', include: 'posts.count'}).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('tags');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 3 matching items
                    result.tags.should.be.an.Array.with.lengthOf(3);

                    // TODO: add the ordering
                    // TODO: manage the count

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    // TODO complete meta data assertions

                    done();
                }).catch(done);
            });
        });

        describe('4. Posts - filter="author:[leslie,pat]+(featured:true,tag:audio)"', function () {
            // Note that `pat` doesn't exist (it's `pat-smith`)
            it('Will fetch posts by the author `leslie` or `pat` which are either featured or have tag `audio`.', function (done) {
                PostAPI.browse({filter: 'author:[leslie,pat]+(featured:true,tag:audio)', include: 'author,tags'}).then(function (result) {
                    var ids, authors;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.posts.should.be.an.Array.with.lengthOf(4);

                    // Each post must either have the author 'leslie' or 'pat'
                    authors = _.map(result.posts, function (post) {
                        return post.author.slug;
                    });
                    authors.should.matchAny(/leslie|pat/);

                    // Each post must either be featured or have the tag 'audio'
                    _.each(result.posts, function (post) {
                        var tags;
                        // This construct ensures we get an assertion or a failure
                        if (post.featured === 'true') {
                            post.featured.should.be.true;
                        } else {
                            tags = _.pluck(post.tags, 'slug');
                            tags.should.containEql('audio');
                        }
                    });

                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([14, 12, 9, 8]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(4);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe('5. Users - filter="posts.tags:photo" order="posts.count DESC" limit="3"', function () {
            it('Will fetch the 3 most prolific users who write posts with the tag `photo` ordered by most posts.', function (done) {
                UserAPI.browse({filter: 'posts.tags:photo', order: 'posts.count DESC', limit: 3}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('users');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.users.should.be.an.Array.with.lengthOf(2);

                    ids = _.pluck(result.users, 'id');
                    ids.should.eql([1, 2]);

                    // TODO: add the order
                    // TODO: manage the count

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(3);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(2);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe.skip('6. Posts filter="published_at:>\'2015-07-20\'" limit="5"}}', function () {
            it('Will fetch 5 posts after a given date.', function (done) {
                PostAPI.browse({filter: 'published_at:>\'2015-07-20\'', limit: 5, include: 'tags'}).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // TODO: make dates work

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    // TODO complete meta data assertions

                    done();
                }).catch(done);
            });
        });
    });

    describe.skip('Count capabilities', function () {
        it('can fetch `posts.count` for tags (published only)', function (done) {
            // This could be posts.count & posts.all.count?
            done();
        });

        it('can fetch `posts.all.count` for tags (all posts)', function (done) {
            done();
        });

        it('can fetch `posts.count` for users (published only)', function (done) {
            // This could be posts.count & posts.all.count?
            done();
        });

        it('can fetch `posts.all.count` for users (all posts)', function (done) {
            done();
        });

        it('can fetch `tags.count` for posts', function (done) {
            done();
        });
    });

    describe('Old Use Cases', function () {
        // Please note: these tests are mostly here to help prove certain things whilst building out new behaviour
        describe('Old post "filters"', function () {
            it('Will fetch posts with a given tag', function (done) {
                PostAPI.browse({filter: 'tag:photo', include: 'tag,author'}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 4 matching items
                    result.posts.should.be.an.Array.with.lengthOf(4);

                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([11, 9, 3, 2]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(4);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: new query does not have meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });

            it('Will fetch posts with a given author', function (done) {
                PostAPI.browse({filter: 'author:leslie', include: 'tag,author', limit: 5, page: 2}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(5);

                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([13, 12, 11, 10, 9]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(2);
                    result.meta.pagination.limit.should.eql(5);
                    result.meta.pagination.pages.should.eql(3);
                    result.meta.pagination.total.should.eql(15);
                    result.meta.pagination.next.should.eql(3);
                    result.meta.pagination.prev.should.eql(1);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });
        });

        describe('Handling "featured"', function () {
            it('Will fetch all posts regardless of featured status by default', function (done) {
                PostAPI.browse({}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(15);

                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([20, 18, 17, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(2);
                    result.meta.pagination.total.should.eql(18);
                    result.meta.pagination.next.should.eql(2);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });

            it('Will fetch only featured posts when requested', function (done) {
                PostAPI.browse({filter: 'featured:true'}).then(function (result) {
                    var ids, featured;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(3);

                    // All posts should be marked as featured 'true'
                    featured = _.pluck(result.posts, 'featured');
                    featured.should.matchEach(true);

                    // Match exact items
                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([14, 8, 5]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(3);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });

            it('Will fetch only non-featured posts when requested', function (done) {
                PostAPI.browse({filter: 'featured:false'}).then(function (result) {
                    var ids, featured;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(15);

                    // All posts should be marked as featured 'false'
                    featured = _.pluck(result.posts, 'featured');
                    featured.should.matchEach(false);

                    // Match exact items
                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([20, 18, 17, 16, 13, 12, 11, 10, 9, 7, 6, 4, 3, 2, 1]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(15);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });
        });

        describe('Handling "page" (staticPages)', function () {
            it('Will return only posts by default', function (done) {
                PostAPI.browse({limit: 'all'}).then(function (result) {
                    var ids, page;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(18);

                    // All posts should be marked as page 'false'
                    page = _.pluck(result.posts, 'page');
                    page.should.matchEach(false);

                    // Match exact items
                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([20, 18, 17, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql('all');
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(18);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });

            // TODO: determine if this should be supported via filter, or whether it should only be available via a 'PageAPI'
            it.skip('Will return only pages when requested', function (done) {
                PostAPI.browse({filter: 'page:true'}).then(function (result) {
                    var ids, page;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array.with.lengthOf(2);

                    // All posts should be marked as page 'true'
                    page = _.pluck(result.posts, 'page');
                    page.should.matchEach(true);

                    // Match exact items
                    ids = _.pluck(result.posts, 'id');
                    ids.should.eql([21, 15]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(2);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    // NOTE: old query has meta filter
                    result.meta.should.not.have.property('filters');

                    done();
                }).catch(done);
            });

            it.skip('Will NOT return both posts and pages from post API', function (done) {
                done();
            });
        });

        describe('Empty results', function () {
            it('Will return empty result if tag has no posts', function (done) {
                PostAPI.browse({filter: 'tag:no-posts', include: 'tag,author'}).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 4 matching items
                    result.posts.should.be.an.Array.with.lengthOf(0);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object.with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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
});
