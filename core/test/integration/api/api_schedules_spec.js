var should = require('should'),
    sinon = require('sinon'),
    moment = require('moment'),
    Promise = require('bluebird'),
    ObjectId = require('bson-objectid'),
    testUtils = require('../../utils'),
    config = require('../../../server/config'),
    sequence = require(config.get('paths').corePath + '/server/utils/sequence'),
    errors = require(config.get('paths').corePath + '/server/errors'),
    api = require(config.get('paths').corePath + '/server/api'),
    models = require(config.get('paths').corePath + '/server/models'),
    sandbox = sinon.sandbox.create();

describe('Schedules API', function () {
    var scope = {posts: []};

    after(function (done) {
        testUtils.teardown(done);
    });

    describe('fn: getScheduledPosts', function () {
        before(function (done) {
            sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'users:roles', 'perms:post', 'perms:init')
            ]).then(function () {
                done();
            }).catch(done);
        });

        describe('success', function () {
            before(function (done) {
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

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}, importing: true});
                })).then(function () {
                    return done();
                }).catch(done);
            });

            after(function () {
                scope.posts = [];
            });

            it('all', function (done) {
                api.schedules.getScheduledPosts()
                    .then(function (result) {
                        result.posts.length.should.eql(5);
                        Object.keys(result.posts[0].toJSON()).should.eql(
                            // @TODO: the computed properties shouldn't be appearing here! Needs a fix
                            ['id', 'published_at', 'created_at', 'author', 'primary_tag', 'url', 'comment_id']
                        );
                        done();
                    })
                    .catch(done);
            });

            it('for specific datetime', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                    done();
                }).catch(done);
            });

            it('for specific datetime', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').set('hours', 8).toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(5, 'days').startOf('day').toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(3);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(6, 'days').set('hours', 10).set('minutes', 30).toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(1, 'days').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(5);
                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('from is invalid', function (done) {
                api.schedules.getScheduledPosts({
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
        var originalCannotScheduleAPostBeforeInMinutes;

        beforeEach(function (done) {
            originalCannotScheduleAPostBeforeInMinutes = config.get('times').cannotScheduleAPostBeforeInMinutes;

            // we can insert published_at less then 5minutes
            config.set('times:cannotScheduleAPostBeforeInMinutes', -15);

            sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'users:roles', 'perms:post', 'perms:init')
            ]).then(function () {
                done();
            }).catch(done);
        });

        after(function () {
            config.set('times:cannotScheduleAPostBeforeInMinutes', originalCannotScheduleAPostBeforeInMinutes);
        });

        afterEach(function () {
            sandbox.restore();
        });

        describe('success', function () {
            beforeEach(function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().toDate(),
                    status: 'scheduled',
                    title: 'title',
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

                Promise.mapSeries(scope.posts, function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                }).then(function (result) {
                    result.length.should.eql(4);
                    return done();
                }).catch(done);
            });

            afterEach(function () {
                scope.posts = [];
            });

            it('client with specific perms has access to publish post', function (done) {
                api.schedules.publishPost({id: scope.posts[0].id, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(scope.posts[0].id);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish with tolerance (30 seconds in the future)', function (done) {
                api.schedules.publishPost({id: scope.posts[1].id, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(scope.posts[1].id);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish with tolerance (30seconds in the past)', function (done) {
                api.schedules.publishPost({id: scope.posts[2].id, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(scope.posts[2].id);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish a post in the past with force flag', function (done) {
                api.schedules.publishPost({force: true}, {id: scope.posts[3].id, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(scope.posts[3].id);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('collision protection', function (done) {
                var originalPostApi = api.posts.edit,
                    postId = scope.posts[0].id, // first post is status=scheduled!
                    requestCanComeIn = false,
                    interval;

                // this request get's blocked
                interval = setInterval(function () {
                    if (requestCanComeIn) {
                        clearInterval(interval);

                        // happens in a transaction, request has to wait until the scheduler api finished
                        return models.Post.edit({title: 'Berlin'}, {id: postId, context: {internal: true}})
                            .then(function (post) {
                                post.id.should.eql(postId);
                                post.get('status').should.eql('published');
                                post.get('title').should.eql('Berlin');
                                done();
                            })
                            .catch(done);
                    }
                }, 500);

                // target post to publish was read already, simulate a client request
                sandbox.stub(api.posts, 'edit', function () {
                    var self = this,
                        args = arguments;

                    requestCanComeIn = true;
                    return Promise.delay(2000)
                        .then(function () {
                            return originalPostApi.apply(self, args);
                        });
                });

                api.schedules.publishPost({id: postId, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(postId);
                        result.posts[0].status.should.eql('published');
                        result.posts[0].title.should.eql('title');
                    })
                    .catch(done);
            });
        });

        describe('error', function () {
            beforeEach(function (done) {
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

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                })).then(function (result) {
                    result.length.should.eql(4);
                    return done();
                }).catch(done);
            });

            afterEach(function () {
                scope.posts = [];
            });

            it('ghost admin has no access', function (done) {
                api.schedules.publishPost({id: scope.posts[0].id, context: {client: 'ghost-admin'}})
                    .then(function () {
                        done(new Error('expected NoPermissionError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('owner has no access (this is how it is right now!)', function (done) {
                api.schedules.publishPost({id: scope.posts[1].id, context: {user: testUtils.users.ids.author}})
                    .then(function () {
                        done(new Error('expected NoPermissionError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('other user has no access', function (done) {
                testUtils.fixtures.insertOne('users', 'createUser', 4)
                    .then(function (result) {
                        api.schedules.publishPost({id: scope.posts[0].id, context: {user: result[0]}})
                            .then(function () {
                                done(new Error('expected NoPermissionError'));
                            })
                            .catch(function (err) {
                                should.exist(err);
                                (err instanceof errors.NoPermissionError).should.eql(true);
                                done();
                            });
                    })
                    .catch(done);
            });

            it('invalid params: id is integer', function (done) {
                api.schedules.publishPost({id: 100, context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.ValidationError).should.eql(true);
                        done();
                    });
            });

            it('post does not exist', function (done) {
                api.schedules.publishPost({id: ObjectId.generate(), context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NotFoundError).should.eql(true);
                        done();
                    });
            });

            it('publish at a wrong time', function (done) {
                api.schedules.publishPost({id: scope.posts[0].id, context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NotFoundError).should.eql(true);
                        done();
                    });
            });

            it('publish at a wrong time', function (done) {
                api.schedules.publishPost({id: scope.posts[2].id, context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NotFoundError).should.eql(true);
                        done();
                    });
            });

            it('publish at a wrong time', function (done) {
                api.schedules.publishPost({id: scope.posts[3].id, context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NotFoundError).should.eql(true);
                        done();
                    });
            });

            it('publish, but status is draft', function (done) {
                api.schedules.publishPost({id: scope.posts[1].id, context: {client: 'ghost-scheduler'}})
                    .then(function () {
                        done(new Error('expected ValidationError'));
                    })
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NotFoundError).should.eql(true);
                        done();
                    });
            });
        });
    });
});
