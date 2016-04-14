/*globals describe, it, after, before */

var should = require('should'),
    moment = require('moment'),
    testUtils = require('../../utils'),
    config = require(__dirname + '/../../../server/config'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    errors = require(config.paths.corePath + '/server/errors'),
    SchedulesAPI = require(config.paths.corePath + '/server/api/schedules');

describe('Schedules API', function () {
    var scope = {};

    scope.beforeDescribe = function (done) {
        scope.posts = [];

        sequence([
            testUtils.teardown,
            testUtils.setup('clients', 'users:roles', 'perms:init')
        ]).then(function () {
            done();
        }).catch(done);
    };

    scope.afterDescribe = function (done) {
        testUtils.teardown(done);
    };

    describe('fn: getScheduledPosts', function () {
        before(scope.beforeDescribe);
        after(scope.afterDescribe);

        describe('success', function () {
            it('insert x posts/pages', function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    created_at: moment('2016-01-01T06:00:00').toDate(),
                    published_at: moment('2016-05-01T06:00:00').toDate(),
                    status: 'scheduled',
                    slug: '1'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.editor,
                    author_id: testUtils.users.ids.editor,
                    published_by: testUtils.users.ids.editor,
                    created_at: moment('2016-01-02T06:00:00').toDate(),
                    published_at: moment('2016-01-02T08:00:00').toDate(),
                    status: 'scheduled',
                    slug: '2'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment('2016-01-06T06:00:00').toDate(),
                    published_at: moment('2016-01-06T10:00:00').toDate(),
                    status: 'scheduled',
                    slug: '3'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    published_at: moment('2016-01-06T11:00:00').toDate(),
                    created_at: moment('2016-01-06T09:00:00').toDate(),
                    status: 'scheduled',
                    slug: '4'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    published_at: moment('2016-02-01T12:00:00').toDate(),
                    created_at: moment('2016-02-01T11:00:00').toDate(),
                    status: 'scheduled',
                    page: 1,
                    slug: '5'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    status: 'draft',
                    slug: '6'
                }));

                testUtils.fixtures.insertPosts(scope.posts)
                    .then(function () {
                        return done();
                    })
                    .catch(done);
            });

            it('all', function (done) {
                SchedulesAPI.getScheduledPosts()
                    .then(function (result) {
                        result.posts.length.should.eql(5);
                        Object.keys(result.posts[0].toJSON()).should.eql(['id', 'published_at', 'created_at', 'author', 'url']);
                        done();
                    })
                    .catch(done);
            });

            it('for specific datetime', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: moment('2016-01-04T06:00:00').toDate(),
                    to: moment('2016-01-08T06:00:00').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                    done();
                }).catch(done);
            });

            it('for specific datetime', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: moment('2016-01-06T06:00:00').toDate(),
                    to: moment('2016-01-06T08:00:00').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: moment('2016-01-06').toDate(),
                    to: moment('2016-01-08').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: moment().set('year', 2016).set('month', 0).set('date', 6).startOf('day').toDate(),
                    to: moment().set('year', 2016).set('month', 0).set('date', 8).endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: moment('2016-01-01').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(5);
                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('from is invalid', function (done) {
                SchedulesAPI.getScheduledPosts({
                    from: 'bee'
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });
        });
    });

    describe('fn: publishPost', function () {
        before(scope.beforeDescribe);
        after(scope.afterDescribe);

        describe('success', function () {
            it('insert x posts', function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    id: 100,
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment('2016-01-01T06:00:00').toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    id: 101,
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment('2016-01-02T06:00:00').toDate(),
                    status: 'scheduled',
                    slug: 'second'
                }));

                testUtils.fixtures.insertPosts(scope.posts)
                    .then(function () {
                        return done();
                    })
                    .catch(done);
            });

            it('client with specific perms has access whee', function (done) {
                SchedulesAPI.publishPost({id: 100, context: {client: 'ghost-scheduler', external: true}})
                    .then(function (result) {
                        result.post.id.should.eql(100);
                        result.post.status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });
        });

        describe('error', function () {
            it('ghost admin has no access', function (done) {
                SchedulesAPI.publishPost({id: 100, context: {client: 'ghost-admin'}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('owner has no access (this is how it is right now!)', function (done) {
                SchedulesAPI.publishPost({id: 100, context: {user: testUtils.users.ids.author}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('other user has no access', function (done) {
                testUtils.fixtures.insertOne('users', 'createUser', 4)
                    .then(function (result) {
                        SchedulesAPI.publishPost({id: 100, context: {user: result[0]}})
                            .catch(function (err) {
                                should.exist(err);
                                (err instanceof errors.NoPermissionError).should.eql(true);
                                done();
                            });
                    });
            });

            it('invalid params', function (done) {
                SchedulesAPI.publishPost({id: 'bla', context: {client: 'ghost-scheduler'}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.ValidationError).should.eql(true);
                        done();
                    });
            });
        });
    });
});
