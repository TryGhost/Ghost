var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    moment = require('moment'),
    ObjectId = require('bson-objectid'),
    configUtils = require('../../utils/configUtils'),
    common = require('../../../server/lib/common'),
    PostAPI = require('../../../server/api/v0.1/posts'),
    urlService = require('../../../server/services/url'),
    settingsCache = require('../../../server/services/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('Post API', function () {
    var localSettingsCache = {};

    before(testUtils.teardown);
    after(testUtils.teardown);

    before(testUtils.setup('users:roles', 'perms:post', 'perms:init', 'posts'));

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    afterEach(function () {
        sandbox.restore();
        localSettingsCache = {};
    });

    should.exist(PostAPI);

    describe('Browse', function () {
        beforeEach(function () {
            localSettingsCache.permalinks = '/:slug/';
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('can fetch all posts with internal context in correct order', function () {
            return PostAPI.browse({context: {internal: true}}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(8);

                results.posts[0].status.should.eql('scheduled');

                results.posts[1].status.should.eql('draft');
                results.posts[2].status.should.eql('draft');

                results.posts[3].status.should.eql('published');
                results.posts[4].status.should.eql('published');
                results.posts[5].status.should.eql('published');
                results.posts[6].status.should.eql('published');
                results.posts[7].status.should.eql('published');
            });
        });

        it('can fetch featured posts for user 1', function () {
            return PostAPI.browse(_.merge({filter: 'featured:true'}, testUtils.context.owner)).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].featured.should.eql(true);
            });
        });

        it('can fetch featured posts for user 2', function () {
            return PostAPI.browse(_.merge({filter: 'featured:true'}, testUtils.context.admin)).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].featured.should.eql(true);
            });
        });

        it('can exclude featured posts for user 1', function () {
            return PostAPI.browse(_.merge({
                status: 'all',
                filter: 'featured:false'
            }, testUtils.context.owner)).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].featured.should.eql(false);
            });
        });

        it('can limit the number of posts', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', limit: 3}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(3);
                results.meta.pagination.limit.should.eql(3);
            });
        });

        it('can fetch only static posts', function () {
            return PostAPI.browse({context: {user: 1}, staticPages: true}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);
            });
        });

        it('can fetch only static posts with string \'true\'', function () {
            return PostAPI.browse({context: {user: 1}, staticPages: 'true'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);
            });
        });

        it('can fetch only static posts with string \'1\'', function () {
            return PostAPI.browse({context: {user: 1}, staticPages: '1'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].page.should.eql(true);
            });
        });

        it('can exclude static posts', function () {
            return PostAPI.browse({context: {user: 1}, staticPages: false}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].page.should.eql(false);
            });
        });

        it('can fetch static and normal posts', function () {
            return PostAPI.browse({context: {user: 1}, staticPages: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(5);
            });
        });

        it('can fetch static and normal posts (filter version)', function () {
            return PostAPI.browse({context: {user: 1}, filter: 'page:[false,true]'}).then(function (results) {
                // should be the same as the current staticPages: 'all'
                should.exist(results.posts);
                results.posts.length.should.eql(5);
            });
        });

        it('can fetch page 1', function () {
            return PostAPI.browse({context: {user: 1}, page: 1, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('scheduled-post');
                results.posts[1].slug.should.eql('unfinished');
                results.meta.pagination.page.should.eql(1);
                results.meta.pagination.next.should.eql(2);
            });
        });

        it('can fetch page 2', function () {
            return PostAPI.browse({context: {user: 1}, page: 2, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('not-so-short-bit-complex');
                results.posts[1].slug.should.eql('short-and-sweet');
                results.meta.pagination.page.should.eql(2);
                results.meta.pagination.next.should.eql(3);
                results.meta.pagination.prev.should.eql(1);
            });
        });

        it('without context.user cannot fetch all posts', function () {
            return PostAPI.browse({status: 'all'}).then(function (results) {
                should.not.exist(results);

                throw new Error('should not provide results if invalid status provided');
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
            });
        });

        it('without context.user cannot fetch draft posts', function () {
            return PostAPI.browse({status: 'draft'}).then(function (results) {
                should.not.exist(results);

                throw new Error('should not provide results if invalid status provided');
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
            });
        });

        it('without context.user cannot use uuid to fetch draft posts in browse', function () {
            return PostAPI.browse({status: 'draft', uuid: 'imastring'}).then(function (results) {
                should.not.exist(results);

                throw new Error('should not provide results if invalid status provided');
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
            });
        });

        it('with context.user can fetch drafts', function () {
            return PostAPI.browse({context: {user: 1}, status: 'draft'}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'posts');
                should.exist(results.posts);
                results.posts.length.should.eql(1);
                results.posts[0].status.should.eql('draft');
                testUtils.API.checkResponse(results.posts[0], 'post');
            });
        });

        it('with context.user can fetch all posts', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all'}).then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'posts');
                should.exist(results.posts);

                // DataGenerator creates 6 posts by default + 2 static pages
                results.posts.length.should.eql(6);
                testUtils.API.checkResponse(results.posts[0], 'post');
            });
        });

        it('can include tags', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', include: 'tags'}).then(function (results) {
                results.posts[0].tags.length.should.eql(0);
                results.posts[1].tags.length.should.eql(1);

                results.posts[1].tags[0].name.should.eql('pollo');
            });
        });

        it('[DEPRECATED] can include author (using status:all)', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', include: 'author'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');
            });
        });

        it('[DEPRECATED] can include author', function () {
            return PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[1].id,
                include: 'author'
            }).then(function (results) {
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');
            });
        });

        it('can include authors', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', include: 'authors'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].authors);
                should.exist(results.posts[0].authors[0]);
                results.posts[0].authors[0].name.should.eql('Joe Bloggs');
            });
        });

        it('can fetch all posts for a tag', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                filter: 'tags:kitchen-sink',
                include: 'tags'
            }).then(function (results) {
                results.posts.length.should.be.eql(2);

                _.each(results.posts, function (post) {
                    var slugs = _.map(post.tags, 'slug');
                    slugs.should.containEql('kitchen-sink');
                });
            });
        });

        it('can include authors and be case insensitive', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', include: 'Authors'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].authors);
                should.exist(results.posts[0].authors[0]);
                results.posts[0].authors[0].name.should.eql('Joe Bloggs');
            });
        });

        it('can include authors and ignore space in include', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', include: ' authors'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].authors);
                should.exist(results.posts[0].authors[0]);
                results.posts[0].authors[0].name.should.eql('Joe Bloggs');
            });
        });

        it('[DEPRECATED] can fetch all posts for an author', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                filter: 'author:joe-bloggs',
                include: 'author'
            }).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(6);

                _.each(results.posts, function (post) {
                    post.author.slug.should.eql('joe-bloggs');
                });
            });
        });

        it('can fetch all posts for an author', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                filter: 'authors:joe-bloggs',
                include: 'authors'
            }).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(6);

                _.each(results.posts, function (post) {
                    post.primary_author.slug.should.eql('joe-bloggs');
                });

                _.find(results.posts, {id: testUtils.DataGenerator.forKnex.posts[0].id}).authors.length.should.eql(1);
                _.find(results.posts, {id: testUtils.DataGenerator.forKnex.posts[3].id}).authors.length.should.eql(2);
            });
        });

        // @TODO: ensure filters are fully validated
        it.skip('cannot fetch all posts for a tag with invalid slug', function () {
            return PostAPI.browse({filter: 'tags:invalid!'}).then(function () {
                throw new Error('Should not return a result with invalid tag');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Validation (isSlug) failed for tag');
                err.statusCode.should.eql(422);
            });
        });

        it.skip('cannot fetch all posts for an author with invalid slug', function () {
            return PostAPI.browse({filter: 'authors:invalid!'}).then(function () {
                throw new Error('Should not return a result with invalid author');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Validation (isSlug) failed for author');
                err.statusCode.should.eql(422);
            });
        });

        it('with context.user can fetch a single field', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', limit: 5, fields: 'title'}).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].title);
                should.not.exist(results.posts[0].slug);
            });
        });

        it('with context.user can fetch multiple fields', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: 'slug,published_at'
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);
            });
        });

        it('with context.user can fetch url and author fields', function () {
            sandbox.stub(urlService, 'getUrlByResourceId').withArgs(testUtils.DataGenerator.Content.posts[7].id).returns('/html-ipsum/');

            return PostAPI.browse({context: {user: 1}, status: 'all', limit: 5}).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].url);
                should.notEqual(results.posts[0].url, 'undefined');
                should.exist(results.posts[0].author);
            });
        });

        it('with context.user can fetch multiple fields and be case insensitive', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: 'Slug,Published_At'
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);
            });
        });

        it('with context.user can fetch multiple fields ignoring spaces', function () {
            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: ' slug , published_at  '
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);
            });
        });

        it('with context.user can fetch a field and not return invalid field', function () {
            return PostAPI.browse({context: {user: 1}, status: 'all', limit: 5, fields: 'foo,title'})
                .then(function (results) {
                    var objectKeys;
                    should.exist(results.posts);

                    should.exist(results.posts[0].title);
                    should.not.exist(results.posts[0].foo);
                    objectKeys = _.keys(results.posts[0]);
                    objectKeys.length.should.eql(1);
                });
        });

        it('can order posts using asc', function () {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().value();

            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'title asc',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);
            });
        });

        it('can order posts using desc', function () {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().reverse().value();

            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'title DESC',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);
            });
        });

        it('can order posts and filter disallowed attributes', function () {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().value();

            return PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'bunny DESC, title ASC',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);
            });
        });

        it('can fetch all posts with correct order when unpublished draft is present', function () {
            return testUtils.fixtures.insertPosts([{
                id: ObjectId.generate(),
                title: 'Not published draft post',
                slug: 'not-published-draft-post',
                status: 'draft',
                updated_at: moment().add(3, 'minutes').toDate(),
                published_at: null
            },
            {
                id: ObjectId.generate(),
                title: 'Unpublished post',
                slug: 'unpublished-post',
                status: 'draft',
                updated_at: moment().add(2, 'minutes').toDate(),
                published_at: moment().add(1, 'minutes').toDate()
            }])
                .then(function () {
                    return PostAPI.browse({context: {internal: true}});
                })
                .then(function (results) {
                    should.exist(results.posts);
                    results.posts.length.should.eql(10);

                    results.posts[1].slug.should.eql('not-published-draft-post');
                    results.posts[2].slug.should.eql('unpublished-post');

                    results.posts[0].status.should.eql('scheduled');

                    results.posts[1].status.should.eql('draft');
                    results.posts[2].status.should.eql('draft');
                    results.posts[3].status.should.eql('draft');
                    results.posts[4].status.should.eql('draft');

                    results.posts[5].status.should.eql('published');
                    results.posts[6].status.should.eql('published');
                    results.posts[7].status.should.eql('published');
                    results.posts[8].status.should.eql('published');
                    results.posts[9].status.should.eql('published');
                });
        });
    });

    describe('Read', function () {
        it('can fetch a post', function () {
            var firstPost;

            return PostAPI.browse().then(function (results) {
                should.exist(results);
                should.exist(results.posts);
                results.posts.length.should.be.above(0);
                firstPost = _.find(results.posts, {title: testUtils.DataGenerator.Content.posts[0].title});
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
            });
        });

        it('without context.user cannot fetch draft', function () {
            return PostAPI.read({slug: 'unfinished', status: 'draft'}).then(function () {
                throw new Error('Should not return a result with no permission');
            }).catch(function (err) {
                should.exist(err);
                err.errorType.should.eql('NoPermissionError');
            });
        });

        it('with context.user can fetch a draft', function () {
            return PostAPI.read({context: {user: 1}, slug: 'unfinished', status: 'draft'}).then(function (results) {
                should.exist(results.posts);
                results.posts[0].status.should.eql('draft');
            });
        });

        it('without context.user can fetch a draft if uuid is provided', function () {
            return PostAPI.read({uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c903', status: 'draft'}).then(function (results) {
                should.exist(results.posts);
                results.posts[0].slug.should.eql('unfinished');
            });
        });

        it('cannot fetch post with unknown id', function () {
            return PostAPI.read({context: {user: 1}, slug: 'not-a-post'}).then(function () {
                throw new Error('Should not return a result with unknown id');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');
            });
        });

        it('can fetch post with by id', function () {
            return PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[1].id,
                status: 'all'
            }).then(function (results) {
                should.exist(results.posts);
                results.posts[0].id.should.eql(testUtils.DataGenerator.Content.posts[1].id);
                results.posts[0].slug.should.eql('ghostly-kitchen-sink');
            });
        });

        it('can fetch post returning a slug only permalink', function () {
            sandbox.stub(urlService, 'getUrlByResourceId').withArgs(testUtils.DataGenerator.Content.posts[0].id).returns('/html-ipsum/');

            return PostAPI.read({
                    id: testUtils.DataGenerator.Content.posts[0].id
                })
                .then(function (result) {
                    should.exist(result);

                    result.posts[0].url.should.equal('/html-ipsum/');
                });
        });

        it('can fetch post returning a dated permalink', function () {
            sandbox.stub(urlService, 'getUrlByResourceId').withArgs(testUtils.DataGenerator.Content.posts[0].id).returns('/2015/01/01/html-ipsum/');

            return PostAPI.read({
                    id: testUtils.DataGenerator.Content.posts[0].id
                })
                .then(function (result) {
                    should.exist(result);

                    // published_at of post 1 is 2015-01-01 00:00:00
                    // default blog TZ is UTC
                    result.posts[0].url.should.equal('/2015/01/01/html-ipsum/');
                });
        });

        it('can include tags', function () {
            return PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[2].id,
                include: 'tags'
            }).then(function (results) {
                should.exist(results.posts[0].tags);
                results.posts[0].tags[0].slug.should.eql('chorizo');
            });
        });

        // TODO: this should be a 422?
        it('cannot fetch a post with an invalid slug', function () {
            return PostAPI.read({slug: 'invalid!'}).then(function () {
                throw new Error('Should not return a result with invalid slug');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');
            });
        });
    });

    describe('Destroy', function () {
        beforeEach(testUtils.teardown);
        beforeEach(testUtils.setup('users:roles', 'perms:post', 'perms:init', 'posts'));
        after(testUtils.teardown);

        it('can delete a post', function () {
            var options = {
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[0].id
            };

            PostAPI.read(options).then(function (results) {
                should.exist(results.posts[0]);

                return PostAPI.destroy(options);
            }).then(function (results) {
                should.not.exist(results);

                return PostAPI.read(options);
            }).then(function () {
                throw new Error('Post still exists when it should have been deleted');
            }).catch(function (error) {
                error.errorType.should.eql('NotFoundError');
            });
        });

        it('returns an error when attempting to delete a non-existent post', function () {
            var options = {context: {user: testUtils.DataGenerator.Content.users[1].id}, id: ObjectId.generate()};

            return PostAPI.destroy(options).then(function () {
                throw new Error('No error was thrown');
            }).catch(function (error) {
                error.errorType.should.eql('NotFoundError');
            });
        });
    });

    describe('Edit', function () {
        beforeEach(testUtils.teardown);
        beforeEach(testUtils.setup('users:roles', 'perms:post', 'perms:init', 'posts'));
        after(testUtils.teardown);

        it('can edit own post', function () {
            return PostAPI.edit({posts: [{status: 'test'}]}, {
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[0].id
            }).then(function (results) {
                should.exist(results.posts);
            });
        });

        it('cannot edit others post', function () {
            return PostAPI.edit(
                {posts: [{status: 'test'}]},
                {
                    context: {user: testUtils.DataGenerator.Content.users[3].id},
                    id: testUtils.DataGenerator.Content.posts[0].id
                }
            ).then(function () {
                throw new Error('expected permission error');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof common.errors.NoPermissionError).should.eql(true);
            });
        });
    });
});
