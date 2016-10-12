
var should = require('should'),
    moment = require('moment'),
    Promise = require('bluebird'),
    testUtils = require('../../utils'),
    config = require(__dirname + '/../../../server/config'),
    sequence = require(config.get('paths').corePath + '/server/utils/sequence'),
    errors = require(config.get('paths').corePath + '/server/errors'),
    api = require(config.get('paths').corePath + '/server/api'),
    models = require(config.get('paths').corePath + '/server/models');

describe('Schedules API', function () {
    var scope = {posts: []};

    after(function () {
        return testUtils.teardown();
    });

    describe('fn: getScheduledPosts', function () {
        before(function () {
            return sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'users:roles', 'perms:post', 'perms:init')
            ]);
        });

        describe('success', function () {
            before(function () {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.editor,
                    author_id: testUtils.users.ids.editor,
                    published_by: testUtils.users.ids.editor,
                    created_at: moment().add(2, 'days').set('hours', 8).toDate(),
                    published_at: moment().add(5, 'days').toDate(),
                    status: 'scheduled',
                    slug: '2'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(2, 'days').set('hours', 12).toDate(),
                    published_at: moment().add(5, 'days').toDate(),
                    status: 'scheduled',
                    page: 1,
                    slug: '5'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    created_at: moment().add(5, 'days').set('hours', 6).toDate(),
                    published_at: moment().add(10, 'days').toDate(),
                    status: 'scheduled',
                    slug: '1'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(6, 'days').set('hours', 10).set('minutes', 0).toDate(),
                    published_at: moment().add(7, 'days').toDate(),
                    status: 'scheduled',
                    slug: '3'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(6, 'days').set('hours', 11).toDate(),
                    published_at: moment().add(8, 'days').toDate(),
                    status: 'scheduled',
                    slug: '4'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    status: 'draft',
                    slug: '6'
                }));

                return Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}, importing: true});
                }));
            });

            after(function () {
                scope.posts = [];
            });

            it('all', function () {
                return api.schedules.getScheduledPosts().then(function (result) {
                    result.posts.length.should.eql(5);
                    Object.keys(result.posts[0].toJSON()).should.eql(['id', 'published_at', 'created_at', 'author', 'url']);
                });
            });

            it('for specific datetime', function () {
                return api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                });
            });

            it('for specific datetime', function () {
                return api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').set('hours', 8).toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                });
            });

            it('for specific date', function () {
                return api.schedules.getScheduledPosts({
                    from: moment().add(5, 'days').startOf('day').toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(3);
                });
            });

            it('for specific date', function () {
                return api.schedules.getScheduledPosts({
                    from: moment().add(6, 'days').set('hours', 10).set('minutes', 30).toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                });
            });

            it('for specific date', function () {
                return api.schedules.getScheduledPosts({
                    from: moment().add(1, 'days').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(5);
                });
            });
        });

        describe('error', function () {
            it('from is invalid', function () {
                return api.schedules.getScheduledPosts({
                    from: 'bee'
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                });
            });
        });
    });

    describe('fn: publishPost', function () {
        var originalCannotScheduleAPostBeforeInMinutes;

        beforeEach(function () {
            originalCannotScheduleAPostBeforeInMinutes = config.get('times').cannotScheduleAPostBeforeInMinutes;

            // we can insert published_at less then 5minutes
            config.set('times:cannotScheduleAPostBeforeInMinutes', -15);

            return sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'users:roles', 'perms:post', 'perms:init')
            ]);
        });

        after(function () {
            config.set('times:cannotScheduleAPostBeforeInMinutes', originalCannotScheduleAPostBeforeInMinutes);
        });

        describe('success', function () {
            beforeEach(function () {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'second'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().subtract(30, 'seconds').toDate(),
                    status: 'scheduled',
                    slug: 'third'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().subtract(10, 'minute').toDate(),
                    status: 'scheduled',
                    slug: 'fourth'
                }));

                return Promise.mapSeries(scope.posts, function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                }).then(function (result) {
                    result.length.should.eql(4);
                });
            });

            afterEach(function () {
                scope.posts = [];
            });

            it('client with specific perms has access to publish post', function () {
                return api.schedules.publishPost({id: 1, context: {client: 'ghost-scheduler'}})
                .then(function (result) {
                    result.posts[0].id.should.eql(1);
                    result.posts[0].status.should.eql('published');
                });
            });

            it('can publish with tolerance (30 seconds in the future)', function () {
                return api.schedules.publishPost({id: 2, context: {client: 'ghost-scheduler'}})
                .then(function (result) {
                    result.posts[0].id.should.eql(2);
                    result.posts[0].status.should.eql('published');
                });
            });

            it('can publish with tolerance (30seconds in the past)', function () {
                return api.schedules.publishPost({id: 3, context: {client: 'ghost-scheduler'}})
                .then(function (result) {
                    result.posts[0].id.should.eql(3);
                    result.posts[0].status.should.eql('published');
                });
            });

            it('can publish a post in the past with force flag', function () {
                return api.schedules.publishPost({force: true}, {id: 4, context: {client: 'ghost-scheduler'}})
                .then(function (result) {
                    result.posts[0].id.should.eql(4);
                    result.posts[0].status.should.eql('published');
                });
            });
        });

        describe('error', function () {
            beforeEach(function () {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(2, 'days').toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(2, 'days').toDate(),
                    status: 'draft',
                    slug: 'second'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(4, 'minutes').toDate(),
                    status: 'scheduled',
                    slug: 'third'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().subtract(4, 'minutes').toDate(),
                    status: 'scheduled',
                    slug: 'fourth'
                }));

                return Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                })).then(function (result) {
                    result.length.should.eql(4);
                });
            });

            afterEach(function () {
                scope.posts = [];
            });

            it('ghost admin has no access', function () {
                return api.schedules.publishPost({id: 1, context: {client: 'ghost-admin'}})
                .then(function () {
                    throw new Error('expected NoPermissionError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NoPermissionError).should.eql(true);
                });
            });

            it('owner has no access (this is how it is right now!)', function () {
                return api.schedules.publishPost({id: 2, context: {user: testUtils.users.ids.author}})
                .then(function () {
                    throw new Error('expected NoPermissionError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NoPermissionError).should.eql(true);
                });
            });

            it('other user has no access', function () {
                return testUtils.fixtures.insertOne('users', 'createUser', 4)
                .then(function (result) {
                    api.schedules.publishPost({id: 1, context: {user: result[0]}}).then(function () {
                        throw new Error('expected NoPermissionError');
                    }).catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });
            });

            it('invalid params', function () {
                return api.schedules.publishPost({id: 'bla', context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                });
            });

            it('post does not exist', function () {
                return api.schedules.publishPost({id: 10, context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });

            it('publish at a wrong time', function () {
                return api.schedules.publishPost({id: 1, context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });

            it('publish at a wrong time', function () {
                return api.schedules.publishPost({id: 3, context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });

            it('publish at a wrong time', function () {
                return api.schedules.publishPost({id: 4, context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });

            it('publish, but status is draft', function () {
                return api.schedules.publishPost({id: 2, context: {client: 'ghost-scheduler'}})
                .then(function () {
                    throw new Error('expected ValidationError');
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                });
            });
        });
    });
});
