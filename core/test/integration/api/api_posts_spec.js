var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    ObjectId = require('bson-objectid'),
    Promise = require('bluebird'),
    configUtils = require('../../utils/configUtils'),
    errors = require('../../../server/errors'),
    db = require('../../../server/data/db'),
    models = require('../../../server/models'),
    PostAPI = require('../../../server/api/posts'),
    settingsCache = require('../../../server/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('Post API', function () {
    var localSettingsCache = {};

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:post', 'perms:init'));

    // @TODO: remove when https://github.com/TryGhost/Ghost/issues/6930 is fixed
    // we insert the posts via the model layer, because right now the test utils insert dates wrong
    beforeEach(function (done) {
        Promise.mapSeries(testUtils.DataGenerator.forKnex.posts, function (post) {
            return models.Post.add(post, {context: {internal: true}});
        }).then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        Promise.mapSeries(testUtils.DataGenerator.forKnex.tags, function (tag) {
            return models.Tag.add(tag, {context: {internal: true}});
        }).then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        db.knex('posts_tags').insert(testUtils.DataGenerator.forKnex.posts_tags)
            .then(function () {
                done();
            })
            .catch(done);
    });

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get', function (key) {
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

        it('can fetch all posts with internal context in correct order', function (done) {
            PostAPI.browse({context: {internal: true}}).then(function (results) {
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

                done();
            }).catch(done);
        });

        it('can fetch featured posts for user 1', function (done) {
            PostAPI.browse(_.merge({filter: 'featured:true'}, testUtils.context.owner)).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].featured.should.eql(true);
                done();
            }).catch(done);
        });

        it('can fetch featured posts for user 2', function (done) {
            PostAPI.browse(_.merge({filter: 'featured:true'}, testUtils.context.admin)).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(4);
                results.posts[0].featured.should.eql(true);
                done();
            }).catch(done);
        });

        it('can exclude featured posts for user 1', function (done) {
            PostAPI.browse(_.merge({
                status: 'all',
                filter: 'featured:false'
            }, testUtils.context.owner)).then(function (results) {
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

        it('can fetch static and normal posts (filter version)', function (done) {
            PostAPI.browse({context: {user: 1}, filter: 'page:[false,true]'}).then(function (results) {
                // should be the same as the current staticPages: 'all'
                should.exist(results.posts);
                results.posts.length.should.eql(5);
                done();
            }).catch(done);
        });

        it('can fetch page 1', function (done) {
            PostAPI.browse({context: {user: 1}, page: 1, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('scheduled-post');
                results.posts[1].slug.should.eql('unfinished');
                results.meta.pagination.page.should.eql(1);
                results.meta.pagination.next.should.eql(2);

                done();
            }).catch(done);
        });

        it('can fetch page 2', function (done) {
            PostAPI.browse({context: {user: 1}, page: 2, limit: 2, status: 'all'}).then(function (results) {
                should.exist(results.posts);
                results.posts.length.should.eql(2);
                results.posts[0].slug.should.eql('not-so-short-bit-complex');
                results.posts[1].slug.should.eql('short-and-sweet');
                results.meta.pagination.page.should.eql(2);
                results.meta.pagination.next.should.eql(3);
                results.meta.pagination.prev.should.eql(1);

                done();
            }).catch(done);
        });

        it('without context.user cannot fetch all posts', function (done) {
            PostAPI.browse({status: 'all'}).then(function (results) {
                should.not.exist(results);

                done(new Error('should not provide results if invalid status provided'));
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('without context.user cannot fetch draft posts', function (done) {
            PostAPI.browse({status: 'draft'}).then(function (results) {
                should.not.exist(results);

                done(new Error('should not provide results if invalid status provided'));
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('without context.user cannot use uuid to fetch draft posts in browse', function (done) {
            PostAPI.browse({status: 'draft', uuid: 'imastring'}).then(function (results) {
                should.not.exist(results);

                done(new Error('should not provide results if invalid status provided'));
            }).catch(function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
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

                // DataGenerator creates 6 posts by default + 2 static pages
                results.posts.length.should.eql(6);
                testUtils.API.checkResponse(results.posts[0], 'post');
                done();
            }).catch(done);
        });

        it('can include tags', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', include: 'tags'}).then(function (results) {
                results.posts[0].tags.length.should.eql(0);
                results.posts[1].tags.length.should.eql(1);

                results.posts[1].tags[0].name.should.eql('pollo');
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
            PostAPI.browse({
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

                done();
            }).catch(done);
        });

        it('can include author and be case insensitive', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', include: 'Author'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');

                done();
            }).catch(done);
        });

        it('can include author and ignore space in include', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', include: ' author'}).then(function (results) {
                should.exist(results.posts);
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');

                done();
            }).catch(done);
        });

        it('can fetch all posts for an author', function (done) {
            PostAPI.browse({
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

                done();
            }).catch(done);
        });

        // @TODO: ensure filters are fully validated
        it.skip('cannot fetch all posts for a tag with invalid slug', function (done) {
            PostAPI.browse({filter: 'tags:invalid!'}).then(function () {
                done(new Error('Should not return a result with invalid tag'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Validation (isSlug) failed for tag');
                err.statusCode.should.eql(422);
                done();
            });
        });

        it.skip('cannot fetch all posts for an author with invalid slug', function (done) {
            PostAPI.browse({filter: 'author:invalid!'}).then(function () {
                done(new Error('Should not return a result with invalid author'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Validation (isSlug) failed for author');
                err.statusCode.should.eql(422);
                done();
            });
        });

        it('with context.user can fetch a single field', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', limit: 5, fields: 'title'}).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].title);
                should.not.exist(results.posts[0].slug);

                done();
            }).catch(done);
        });

        it('with context.user can fetch multiple fields', function (done) {
            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: 'slug,published_at'
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);

                done();
            }).catch(done);
        });

        it('with context.user can fetch url and author fields', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', limit: 5}).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].url);
                should.notEqual(results.posts[0].url, 'undefined');
                should.exist(results.posts[0].author);

                done();
            }).catch(done);
        });

        it('with context.user can fetch multiple fields and be case insensitive', function (done) {
            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: 'Slug,Published_At'
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);

                done();
            }).catch(done);
        });

        it('with context.user can fetch multiple fields ignoring spaces', function (done) {
            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                limit: 5,
                fields: ' slug , published_at  '
            }).then(function (results) {
                should.exist(results.posts);

                should.exist(results.posts[0].published_at);
                should.exist(results.posts[0].slug);
                should.not.exist(results.posts[0].title);

                done();
            }).catch(done);
        });

        it('with context.user can fetch a field and not return invalid field', function (done) {
            PostAPI.browse({context: {user: 1}, status: 'all', limit: 5, fields: 'foo,title'}).then(function (results) {
                var objectKeys;
                should.exist(results.posts);

                should.exist(results.posts[0].title);
                should.not.exist(results.posts[0].foo);
                objectKeys = _.keys(results.posts[0]);
                objectKeys.length.should.eql(1);

                done();
            }).catch(done);
        });

        it('can order posts using asc', function (done) {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().value();

            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'title asc',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);

                done();
            }).catch(done);
        });

        it('can order posts using desc', function (done) {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().reverse().value();

            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'title DESC',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);

                done();
            }).catch(done);
        });

        it('can order posts and filter disallowed attributes', function (done) {
            var posts, expectedTitles;

            posts = _(testUtils.DataGenerator.Content.posts).reject('page').value();
            expectedTitles = _(posts).map('title').sortBy().value();

            PostAPI.browse({
                context: {user: 1},
                status: 'all',
                order: 'bunny DESC, title ASC',
                fields: 'title'
            }).then(function (results) {
                should.exist(results.posts);

                var titles = _.map(results.posts, 'title');
                titles.should.eql(expectedTitles);

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

                done();
            }).catch(done);
        });

        it('without context.user cannot fetch draft', function (done) {
            PostAPI.read({slug: 'unfinished', status: 'draft'}).then(function () {
                done(new Error('Should not return a result with no permission'));
            }).catch(function (err) {
                should.exist(err);
                err.errorType.should.eql('NoPermissionError');
                done();
            }).catch(done);
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
                done(new Error('Should not return a result with unknown id'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');

                done();
            }).catch(done);
        });

        it('can fetch post with by id', function (done) {
            PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[1].id,
                status: 'all'
            }).then(function (results) {
                should.exist(results.posts);
                results.posts[0].id.should.eql(testUtils.DataGenerator.Content.posts[1].id);
                results.posts[0].slug.should.eql('ghostly-kitchen-sink');
                done();
            }).catch(done);
        });

        it('can include tags', function (done) {
            PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[2].id,
                include: 'tags'
            }).then(function (results) {
                should.exist(results.posts[0].tags);
                results.posts[0].tags[0].slug.should.eql('chorizo');
                done();
            }).catch(done);
        });

        it('can include author', function (done) {
            PostAPI.read({
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[1].id,
                include: 'author'
            }).then(function (results) {
                should.exist(results.posts[0].author.name);
                results.posts[0].author.name.should.eql('Joe Bloggs');
                done();
            }).catch(done);
        });

        // TODO: this should be a 422?
        it('cannot fetch a post with an invalid slug', function (done) {
            PostAPI.read({slug: 'invalid!'}).then(function () {
                done(new Error('Should not return a result with invalid slug'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Post not found.');

                done();
            });
        });
    });

    describe('Destroy', function () {
        it('can delete a post', function (done) {
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
                done(new Error('Post still exists when it should have been deleted'));
            }).catch(function () {
                done();
            });
        });

        it('returns an error when attempting to delete a non-existent post', function (done) {
            var options = {context: {user: testUtils.DataGenerator.Content.users[1].id}, id: ObjectId.generate()};

            PostAPI.destroy(options).then(function () {
                done(new Error('No error was thrown'));
            }).catch(function (error) {
                error.errorType.should.eql('NotFoundError');

                done();
            });
        });
    });

    describe('Edit', function () {
        it('can edit own post', function (done) {
            PostAPI.edit({posts: [{status: 'test'}]}, {
                context: {user: testUtils.DataGenerator.Content.users[1].id},
                id: testUtils.DataGenerator.Content.posts[0].id
            }).then(function (results) {
                should.exist(results.posts);
                done();
            }).catch(done);
        });

        it('cannot edit others post', function (done) {
            PostAPI.edit(
                {posts: [{status: 'test'}]},
                {
                    context: {user: testUtils.DataGenerator.Content.users[3].id},
                    id: testUtils.DataGenerator.Content.posts[0].id
                }
            ).then(function () {
                done(new Error('expected permission error'));
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.NoPermissionError).should.eql(true);
                done();
            });
        });
    });
});
