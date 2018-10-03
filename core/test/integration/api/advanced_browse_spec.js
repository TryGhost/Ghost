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

    describe('Advanced Use Cases', function () {
        describe('2. Posts - filter: "tag:photo,featured:true,image:-null", include: "tags"', function () {
            // @TODO: remove, but double check if any of the assertions should be added to a routing test
            it('Will fetch posts which have either a tag of `photo`, are marked `featured` or have an image.', function (done) {
                PostAPI.browse({
                    filter: 'tag:photo,featured:true,feature_image:-null',
                    include: 'tags'
                }).then(function (result) {
                    var ids;

                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(9);

                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[7].id,
                        testUtils.filterData.data.posts[6].id,
                        testUtils.filterData.data.posts[5].id,
                        testUtils.filterData.data.posts[4].id,
                        testUtils.filterData.data.posts[2].id,
                        testUtils.filterData.data.posts[1].id
                    ]);

                    _.each(result.posts, function (post) {
                        post.page.should.be.false();
                        post.status.should.eql('published');
                    });

                    // TODO: Should be in published order

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(9);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe.skip('3. Tags - filter="count.posts:>=1" order="count.posts DESC" limit="all"', function () {
            // @TODO add support for counts/aggregates in order & filter params
            // @TODO: assert the SQL in the model unit test?
            it('Will fetch all tags, ordered by post count, where the post count is at least 1.', function (done) {
                TagAPI.browse({
                    filter: 'count.posts:>=1',
                    order: 'count.posts DESC',
                    limit: 'all',
                    include: 'count.posts'
                }).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('tags');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 3 matching items
                    result.tags.should.be.an.Array().with.lengthOf(3);

                    // TODO: add the ordering
                    // TODO: manage the count

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    // TODO complete meta data assertions

                    done();
                }).catch(done);
            });
        });

        describe('4. Posts - filter="author:[leslie,pat]+(tag:hash-audio,image:-null)"', function () {
            // Note that `pat` doesn't exist (it's `pat-smith`)
            // @TODO: remove, but double check if a routing test uses include=author (deprecated test) and double check the assertions
            it('[DEPRECATED] will fetch posts by the author `leslie` or `pat` which are either have tag `hash-audio` or an image.', function (done) {
                PostAPI.browse({
                    filter: 'author:[leslie,pat]+(tag:hash-audio,feature_image:-null)',
                    include: 'author,tags'
                }).then(function (result) {
                    var ids, authors;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.posts.should.be.an.Array().with.lengthOf(6);

                    // Each post must either have the author 'leslie' or 'pat'
                    authors = _.map(result.posts, function (post) {
                        return post.author.slug;
                    });
                    authors.should.matchAny(/leslie|pat/);

                    // Each post must either be featured or have the tag 'hash-audio'
                    _.each(result.posts, function (post) {
                        var tags = _.map(post.tags, 'slug');
                        // This construct ensures we get an assertion or a failure
                        if (!_.isEmpty(post.feature_image)) {
                            post.feature_image.should.not.be.empty();
                        } else {
                            tags = _.map(post.tags, 'slug');
                            tags.should.containEql('hash-audio');
                        }
                    });

                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[7].id,
                        testUtils.filterData.data.posts[6].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(6);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });

            // @TODO: assert to SQL unit test? and remove. double check assertions
            it('will fetch posts by the authors `leslie` or `pat` which are either have tag `hash-audio` or an image.', function (done) {
                PostAPI.browse({
                    filter: 'authors:[leslie,pat]+(tag:hash-audio,feature_image:-null)',
                    include: 'authors,tags'
                }).then(function (result) {
                    var ids, authors;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.posts.should.be.an.Array().with.lengthOf(6);

                    // Each post must either have the author 'leslie' or 'pat'
                    authors = _.map(result.posts, function (post) {
                        return post.authors[0].slug;
                    });
                    authors.should.matchAny(/leslie|pat/);

                    // Each post must either be featured or have the tag 'hash-audio'
                    _.each(result.posts, function (post) {
                        var tags = _.map(post.tags, 'slug');
                        // This construct ensures we get an assertion or a failure
                        if (!_.isEmpty(post.feature_image)) {
                            post.feature_image.should.not.be.empty();
                        } else {
                            tags = _.map(post.tags, 'slug');
                            tags.should.containEql('hash-audio');
                        }
                    });

                    ids = _.map(result.posts, 'id');

                    // ordered by authors.id
                    ids.should.eql([
                        testUtils.filterData.data.posts[6].id,
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[7].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(6);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe.skip('5. Users - filter="posts.tags:photo" order="count.posts DESC" limit="3"', function () {
            // @TODO: add support for joining through posts and tags for users
            // @TODO: remove
            it('Will fetch the 3 most prolific users who write posts with the tag `photo` ordered by most posts.', function (done) {
                UserAPI.browse({
                    filter: 'posts.tags:special',
                    order: 'count.posts DESC',
                    limit: 3
                }).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('users');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.users.should.be.an.Array().with.lengthOf(2);

                    ids = _.map(result.users, 'id');

                    ids.should.eql([
                        testUtils.filterData.data.posts[0].id,
                        testUtils.filterData.data.posts[1].id
                    ]);

                    // TODO: add the order
                    // TODO: manage the count

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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
            // @TODO: assert the SQL
            it('Will fetch 5 posts after a given date.', function (done) {
                PostAPI.browse({
                    filter: 'published_at:>\'2015-07-20\'',
                    limit: 5,
                    include: 'tags'
                }).then(function (result) {
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // TODO: make dates work

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    // TODO complete meta data assertions

                    done();
                }).catch(done);
            });
        });

        describe('7. Users filter: "website:-null", order: "website"', function () {
            // @TODO: remove
            it('Will fetch users that have a website and order them by website', function (done) {
                UserAPI.browse({filter: 'website:-null', order: 'website ASC'}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('users');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 2 matching items
                    result.users.should.be.an.Array().with.lengthOf(2);

                    ids = _.map(result.users, 'id');

                    ids.should.eql([
                        testUtils.filterData.data.users[1].id,
                        testUtils.filterData.data.users[0].id
                    ]);

                    should.exist(result.users[0].website);
                    should.exist(result.users[1].website);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(2);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });

        describe('8. Tags filter: "image:-null+description:-null"', function () {
            // @TODO: remove
            it('Will fetch tags which have an image and a description', function (done) {
                TagAPI.browse({
                    filter: 'feature_image:-null+description:-null',
                    order: 'name ASC'
                }).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('tags');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 3 matching items
                    result.tags.should.be.an.Array().with.lengthOf(3);

                    ids = _.map(result.tags, 'id');
                    ids.should.containEql(testUtils.filterData.data.tags[3].id);
                    ids.should.containEql(testUtils.filterData.data.tags[2].id);
                    ids.should.containEql(testUtils.filterData.data.tags[1].id);

                    // @TODO standardise how alphabetical ordering is done across DBs (see #6104)
                    // ids.should.eql([4, 2, 3]);

                    should.exist(result.tags[0].feature_image);
                    should.exist(result.tags[1].feature_image);
                    should.exist(result.tags[2].feature_image);

                    should.exist(result.tags[0].description);
                    should.exist(result.tags[1].description);
                    should.exist(result.tags[2].description);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                    result.meta.pagination.page.should.eql(1);
                    result.meta.pagination.limit.should.eql(15);
                    result.meta.pagination.pages.should.eql(1);
                    result.meta.pagination.total.should.eql(3);
                    should.equal(result.meta.pagination.next, null);
                    should.equal(result.meta.pagination.prev, null);

                    done();
                }).catch(done);
            });
        });
    });

    describe('Primary Tags / Primary Authors', function () {
        // @TODO: assert SQL in unit test
        it('Will fetch posts which have a primary tag of photo', function (done) {
            PostAPI.browse({
                filter: 'primary_tag:photo',
                include: 'tags'
            }).then(function (result) {
                var ids;

                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
                result.posts.should.be.an.Array().with.lengthOf(4);

                ids = _.map(result.posts, 'id');
                ids.should.eql([
                    testUtils.filterData.data.posts[10].id,
                    testUtils.filterData.data.posts[8].id,
                    testUtils.filterData.data.posts[2].id,
                    testUtils.filterData.data.posts[1].id
                ]);

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(4);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: assert SQL in unit test
        it('Will fetch posts which have a primary author', function (done) {
            PostAPI.browse({
                filter: 'primary_author:leslie',
                include: 'authors'
            }).then(function (result) {
                var returnedIds, insertedIds, clonedInsertedPosts;

                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                // all posts
                testUtils.filterData.data.posts.length.should.eql(21);

                // 15 have the primary author leslie
                result.posts.should.be.an.Array().with.lengthOf(15);

                returnedIds = _.map(result.posts, 'id');

                insertedIds = _.filter(testUtils.filterData.data.posts, {status: 'published'});
                insertedIds = _.filter(insertedIds, {page: false});
                insertedIds = _.filter(insertedIds, {author_id: testUtils.filterData.data.users[0].id});

                insertedIds = _.map(insertedIds, 'id');
                insertedIds.length.should.eql(15);

                insertedIds.reverse();

                returnedIds.should.eql(insertedIds);

                _.each(result.posts, function (post) {
                    post.page.should.be.false();
                    post.status.should.eql('published');
                });

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(15);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: remove
        it('Will fetch empty list if no post has matching primary-tag', function (done) {
            PostAPI.browse({
                filter: 'primary_tag:no-posts',
                include: 'tags'
            }).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
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

                done();
            }).catch(done);
        });
        // @TODO: remove
        it('Will fetch empty list if primary_tag is internal', function (done) {
            PostAPI.browse({
                filter: 'primary_tag:no-posts',
                include: 'tags'
            }).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('posts');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
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

                done();
            }).catch(done);
        });
    });

    describe('Count capabilities', function () {
        // @TODO: put to routing tests, double check if it exists already, double check the assertions
        it('can fetch `count.posts` for tags (public data only)', function (done) {
            TagAPI.browse({include: 'count.posts'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('tags');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
                result.tags.should.be.an.Array().with.lengthOf(6);

                // Each tag should have the correct count
                _.find(result.tags, function (tag) {
                    return tag.name === 'Getting Started';
                }).count.posts.should.eql(4);

                _.find(result.tags, function (tag) {
                    return tag.name === 'photo';
                }).count.posts.should.eql(4);

                _.find(result.tags, function (tag) {
                    return tag.name === 'Video';
                }).count.posts.should.eql(5);

                _.find(result.tags, function (tag) {
                    return tag.name === '#Audio';
                }).count.posts.should.eql(6);

                _.find(result.tags, function (tag) {
                    return tag.name === 'No Posts';
                }).count.posts.should.eql(0);

                _.find(result.tags, function (tag) {
                    return tag.name === 'Special';
                }).count.posts.should.eql(3);

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(6);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: remove
        it('can fetch and order by `count.posts` for tags (public data only)', function (done) {
            TagAPI.browse({include: 'count.posts', order: 'count.posts DESC'}).then(function (result) {
                var ids;

                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('tags');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
                result.tags.should.be.an.Array().with.lengthOf(6);

                // Each tag should have the correct count
                _.find(result.tags, function (tag) {
                    return tag.name === 'Getting Started';
                }).count.posts.should.eql(4);

                _.find(result.tags, function (tag) {
                    return tag.name === 'photo';
                }).count.posts.should.eql(4);

                _.find(result.tags, function (tag) {
                    return tag.name === 'Video';
                }).count.posts.should.eql(5);

                _.find(result.tags, function (tag) {
                    return tag.name === '#Audio';
                }).count.posts.should.eql(6);

                _.find(result.tags, function (tag) {
                    return tag.name === 'No Posts';
                }).count.posts.should.eql(0);

                _.find(result.tags, function (tag) {
                    return tag.name === 'Special';
                }).count.posts.should.eql(3);

                ids = _.map(result.tags, 'id');
                ids.should.eql([
                    testUtils.filterData.data.tags[3].id,
                    testUtils.filterData.data.tags[2].id,
                    testUtils.filterData.data.tags[0].id,
                    testUtils.filterData.data.tags[1].id,
                    testUtils.filterData.data.tags[5].id,
                    testUtils.filterData.data.tags[4].id
                ]);

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(6);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: remove
        it.skip('can fetch `count.posts` for tags (all data)', function (done) {
            // This is tested elsewhere for now using user context
            // No way to override it for public requests
            done();
        });

        // @TODO: remove, but double check assertions
        it('can fetch `count.posts` for users (published only)', function (done) {
            UserAPI.browse({include: 'count.posts'}).then(function (result) {
                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('users');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
                result.users.should.be.an.Array().with.lengthOf(3);

                // Each user should have the correct count
                _.find(result.users, function (user) {
                    return user.slug === 'leslie';
                }).count.posts.should.eql(15);

                _.find(result.users, function (user) {
                    return user.slug === 'pat-smith';
                }).count.posts.should.eql(3);

                _.find(result.users, function (user) {
                    return user.slug === 'camhowe';
                }).count.posts.should.eql(0);

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(3);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: remove, but double check assertions
        it('can fetch and order by `count.posts` for users (published only)', function (done) {
            UserAPI.browse({include: 'count.posts', order: 'count.posts ASC'}).then(function (result) {
                var ids;

                // 1. Result should have the correct base structure
                should.exist(result);
                result.should.have.property('users');
                result.should.have.property('meta');

                // 2. The data part of the response should be correct
                // We should have 5 matching items
                result.users.should.be.an.Array().with.lengthOf(3);

                // Each user should have the correct count
                _.find(result.users, function (user) {
                    return user.slug === 'leslie';
                }).count.posts.should.eql(15);

                _.find(result.users, function (user) {
                    return user.slug === 'pat-smith';
                }).count.posts.should.eql(3);

                _.find(result.users, function (user) {
                    return user.slug === 'camhowe';
                }).count.posts.should.eql(0);

                ids = _.map(result.users, 'id');

                ids.should.eql([
                    testUtils.filterData.data.users[2].id,
                    testUtils.filterData.data.users[1].id,
                    testUtils.filterData.data.users[0].id
                ]);

                // 3. The meta object should contain the right details
                result.meta.should.have.property('pagination');
                result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
                result.meta.pagination.page.should.eql(1);
                result.meta.pagination.limit.should.eql(15);
                result.meta.pagination.pages.should.eql(1);
                result.meta.pagination.total.should.eql(3);
                should.equal(result.meta.pagination.next, null);
                should.equal(result.meta.pagination.prev, null);

                done();
            }).catch(done);
        });

        // @TODO: remove
        it.skip('can fetch `posts.all.count` for users (all posts)', function (done) {
            done();
        });
        // @TODO: remove
        it.skip('can fetch `tags.count` for posts', function (done) {
            done();
        });
    });

    // @TODO: remove, but double check assertions
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
                    result.posts.should.be.an.Array().with.lengthOf(4);

                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[2].id,
                        testUtils.filterData.data.posts[1].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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

            it('[DEPRECATED] Will fetch posts with a given author', function (done) {
                PostAPI.browse({
                    filter: 'author:leslie',
                    include: 'tag,author',
                    limit: 5,
                    page: 2
                }).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(5);

                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[12].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[9].id,
                        testUtils.filterData.data.posts[8].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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
            // @TODO: remove, but double check assertions
            it('Will fetch all posts regardless of featured status by default', function (done) {
                PostAPI.browse({}).then(function (result) {
                    var ids;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(15);

                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[19].id,
                        testUtils.filterData.data.posts[17].id,
                        testUtils.filterData.data.posts[16].id,
                        testUtils.filterData.data.posts[15].id,
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[12].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[9].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[7].id,
                        testUtils.filterData.data.posts[6].id,
                        testUtils.filterData.data.posts[5].id,
                        testUtils.filterData.data.posts[4].id,
                        testUtils.filterData.data.posts[3].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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

            // @TODO: remove, but double check assertions
            it('Will fetch only featured posts when requested', function (done) {
                PostAPI.browse({filter: 'featured:true'}).then(function (result) {
                    var ids, featured;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(3);

                    // All posts should be marked as featured 'true'
                    featured = _.map(result.posts, 'featured');
                    featured.should.matchEach(true);

                    // Match exact items
                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[7].id,
                        testUtils.filterData.data.posts[4].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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

            // @TODO: remove, but double check assertions
            it('Will fetch only non-featured posts when requested', function (done) {
                PostAPI.browse({filter: 'featured:false'}).then(function (result) {
                    var ids, featured;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(15);

                    // All posts should be marked as featured 'false'
                    featured = _.map(result.posts, 'featured');
                    featured.should.matchEach(false);

                    // Match exact items
                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[19].id,
                        testUtils.filterData.data.posts[17].id,
                        testUtils.filterData.data.posts[16].id,
                        testUtils.filterData.data.posts[15].id,
                        testUtils.filterData.data.posts[12].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[9].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[6].id,
                        testUtils.filterData.data.posts[5].id,
                        testUtils.filterData.data.posts[3].id,
                        testUtils.filterData.data.posts[2].id,
                        testUtils.filterData.data.posts[1].id,
                        testUtils.filterData.data.posts[0].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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
            // @TODO: remove, but double check assertions
            it('Will return only published posts by default', function (done) {
                PostAPI.browse({limit: 'all'}).then(function (result) {
                    var ids, page;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(18);

                    // All posts should be marked as page 'false'
                    page = _.map(result.posts, 'page');
                    page.should.matchEach(false);

                    // Match exact items
                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[19].id,
                        testUtils.filterData.data.posts[17].id,
                        testUtils.filterData.data.posts[16].id,
                        testUtils.filterData.data.posts[15].id,
                        testUtils.filterData.data.posts[13].id,
                        testUtils.filterData.data.posts[12].id,
                        testUtils.filterData.data.posts[11].id,
                        testUtils.filterData.data.posts[10].id,
                        testUtils.filterData.data.posts[9].id,
                        testUtils.filterData.data.posts[8].id,
                        testUtils.filterData.data.posts[7].id,
                        testUtils.filterData.data.posts[6].id,
                        testUtils.filterData.data.posts[5].id,
                        testUtils.filterData.data.posts[4].id,
                        testUtils.filterData.data.posts[3].id,
                        testUtils.filterData.data.posts[2].id,
                        testUtils.filterData.data.posts[1].id,
                        testUtils.filterData.data.posts[0].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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

            // @TODO: determine if this should be supported via filter, or whether it should only be available via a 'PageAPI'
            // @TODO: remove, but double check assertions
            it('Will return only pages when requested', function (done) {
                PostAPI.browse({filter: 'page:true'}).then(function (result) {
                    var ids, page;
                    // 1. Result should have the correct base structure
                    should.exist(result);
                    result.should.have.property('posts');
                    result.should.have.property('meta');

                    // 2. The data part of the response should be correct
                    // We should have 5 matching items
                    result.posts.should.be.an.Array().with.lengthOf(2);

                    // All posts should be marked as page 'true'
                    page = _.map(result.posts, 'page');
                    page.should.matchEach(true);

                    // Match exact items
                    ids = _.map(result.posts, 'id');
                    ids.should.eql([
                        testUtils.filterData.data.posts[20].id,
                        testUtils.filterData.data.posts[14].id
                    ]);

                    // 3. The meta object should contain the right details
                    result.meta.should.have.property('pagination');
                    result.meta.pagination.should.be.an.Object().with.properties(['page', 'limit', 'pages', 'total', 'next', 'prev']);
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

            // @TODO: remove
            it.skip('Will NOT return both posts and pages from post API', function (done) {
                done();
            });
        });

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
