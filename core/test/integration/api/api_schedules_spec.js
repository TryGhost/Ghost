var should = require('should'),
    moment = require('moment'),
    _ = require('lodash'),
    sinon = require('sinon'),
    Mailgun = require('mailgun-js'),
    Promise = require('bluebird'),
    testUtils = require('../../utils'),
    config = require(__dirname + '/../../../server/config'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    errors = require(config.paths.corePath + '/server/errors'),
    serverUtils = require(config.paths.corePath + '/server/utils'),
    api = require(config.paths.corePath + '/server/api'),
    mail = require(config.paths.corePath + '/server/mail'),
    models = require(config.paths.corePath + '/server/models'),
    sandbox = sinon.sandbox.create();

describe('Schedules API', function () {
    var scope = {posts: [], subscribers: []};

    scope.addDummies = function (options) {
        var numberOfPosts = options.numberOfPosts,
            numberOfSubscribers = options.numberOfSubscribers;

        _.each(_.range(numberOfPosts), function (i) {
            scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                created_by: testUtils.users.ids.editor,
                author_id: testUtils.users.ids.editor,
                published_by: testUtils.users.ids.editor,
                created_at: moment().subtract(2, 'days').toDate(),
                status: 'published',
                slug: i.toString()
            }));
        });

        _.each(_.range(numberOfSubscribers), function (i) {
            scope.subscribers.push(testUtils.DataGenerator.forKnex.createSubscriber({email: 'kati{i}@omati.de'.replace('{i}', i)}));
        });

        if (!scope.subscribers.length) {
            return Promise.all(scope.posts.map(function (post) {
                return models.Post.add(post, {context: {internal: true}, importing: true});
            }));
        }

        return Promise.all(scope.subscribers.map(function (subscriber) {
            return models.Subscriber.add(subscriber, {context: {internal: true}, importing: true});
        })).then(function () {
            return Promise.all(scope.posts.map(function (post) {
                return models.Post.add(post, {context: {internal: true}, importing: true});
            }));
        });
    };

    after(function (done) {
        testUtils.teardown(done);
    });

    describe('fn: sendNewsletter', function () {
        beforeEach(function (done) {
            sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'settings')
            ]).then(function () {
                sandbox.spy(mail.GhostMailgun.prototype, 'send');
                sandbox.spy(mail.utils, 'generateContent');
                sandbox.spy(models.Subscriber, 'findAll');
                sandbox.spy(models.Settings, 'edit');

                // mailgun exports is a bit ugly designed
                var mailgun = Mailgun({});
                sandbox.stub(mailgun.Mailgun.prototype, 'request', function (method, resource, data, stubDone) {
                    stubDone(null, {});
                });

                config.newsletter.rrule = serverUtils.rrule.createRRULEString({
                    freq: 'MONTHLY',
                    monthday: '30'
                });

                sandbox.stub(serverUtils.rrule, 'getNextDate', function () {
                    return moment().toDate();
                });

                done();
            }).catch(done);
        });

        afterEach(function () {
            sandbox.restore();
            scope.posts = [];
            scope.subscribers = [];
        });

        describe('success cases', function () {
            it('posts found, subscribers found (lastExecutedAt is null)', function (done) {
                config.newsletter.status = 'enabled';
                config.newsletter.status.should.eql('enabled');
                config.newsletterFromAddress = 'kate@ghost.org';
                should.not.exist(config.newsletter.lastExecutedAt);

                scope.addDummies({numberOfPosts: 2, numberOfSubscribers: 2})
                    .then(function () {
                        api.schedules.sendNewsletter({
                            context: {client: 'ghost-scheduler'}
                        }).then(function () {
                            models.Subscriber.findAll.called.should.eql(true);
                            mail.GhostMailgun.prototype.send.called.should.eql(true);
                            mail.utils.generateContent.called.should.eql(true);
                            models.Settings.edit.calledOnce.should.eql(true);

                            config.newsletter.status.should.eql('enabled');
                            should.exist(config.newsletter.lastExecutedAt);

                            done();
                        }).catch(done);
                    })
                    .catch(done);
            });
        });

        describe('error cases', function () {
            it('newsletter is disabled', function (done) {
                config.newsletter.status.should.eql('disabled');

                api.schedules.sendNewsletter({
                    context: {client: 'ghost-scheduler'}
                }).then(function () {
                    done(new Error('expected permission error'));
                }).catch(function (err) {
                    (err instanceof errors.NoPermissionError).should.eql(true);
                    done();
                });
            });

            it('wrong client', function (done) {
                config.newsletter.status = 'enabled';
                config.newsletter.status.should.eql('enabled');

                api.schedules.sendNewsletter({
                    context: {client: 'not-the-correct-client'}
                }).then(function () {
                    done(new Error('expected permission error'));
                }).catch(function (err) {
                    (err instanceof errors.NoPermissionError).should.eql(true);
                    done();
                });
            });

            it('no posts found', function (done) {
                config.newsletter.status = 'enabled';
                config.newsletter.status.should.eql('enabled');
                should.not.exist(config.newsletter.lastExecutedAt);

                api.schedules.sendNewsletter({
                    context: {client: 'ghost-scheduler'}
                }).then(function () {
                    models.Subscriber.findAll.called.should.eql(false);
                    mail.GhostMailgun.prototype.send.called.should.eql(false);
                    mail.utils.generateContent.called.should.eql(false);
                    models.Settings.edit.calledOnce.should.eql(true);

                    config.newsletter.status.should.eql('enabled');
                    should.exist(config.newsletter.lastExecutedAt);

                    done();
                }).catch(done);
            });

            it('posts found, but no subscribers (lastExecutedAt is null)', function (done) {
                should.not.exist(config.newsletter.lastExecutedAt);
                config.newsletter.status = 'enabled';
                config.newsletter.status.should.eql('enabled');

                scope.addDummies({numberOfPosts: 2})
                    .then(function () {
                        api.schedules.sendNewsletter({
                            context: {client: 'ghost-scheduler'}
                        }).then(function () {
                            models.Subscriber.findAll.called.should.eql(true);
                            mail.GhostMailgun.prototype.send.called.should.eql(false);
                            mail.utils.generateContent.called.should.eql(false);
                            models.Settings.edit.calledOnce.should.eql(true);

                            config.newsletter.status.should.eql('enabled');
                            should.exist(config.newsletter.lastExecutedAt);

                            done();
                        }).catch(done);
                    });
            });
        });
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
                        Object.keys(result.posts[0].toJSON()).should.eql(['id', 'published_at', 'created_at', 'author', 'url']);
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
            originalCannotScheduleAPostBeforeInMinutes = config.times.cannotScheduleAPostBeforeInMinutes;

            // we can insert published_at less then 5minutes
            config.times.cannotScheduleAPostBeforeInMinutes = -15;

            sequence([
                testUtils.teardown,
                testUtils.setup('clients', 'users:roles', 'perms:post', 'perms:init')
            ]).then(function () {
                done();
            }).catch(done);
        });

        after(function () {
            config.times.cannotScheduleAPostBeforeInMinutes = originalCannotScheduleAPostBeforeInMinutes;
        });

        describe('success', function () {
            beforeEach(function (done) {
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
                api.schedules.publishPost({id: 1, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(1);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish with tolerance (30 seconds in the future)', function (done) {
                api.schedules.publishPost({id: 2, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(2);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish with tolerance (30seconds in the past)', function (done) {
                api.schedules.publishPost({id: 3, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(3);
                        result.posts[0].status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });

            it('can publish a post in the past with force flag', function (done) {
                api.schedules.publishPost({force: true}, {id: 4, context: {client: 'ghost-scheduler'}})
                    .then(function (result) {
                        result.posts[0].id.should.eql(4);
                        result.posts[0].status.should.eql('published');
                        done();
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
                api.schedules.publishPost({id: 1, context: {client: 'ghost-admin'}})
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
                api.schedules.publishPost({id: 2, context: {user: testUtils.users.ids.author}})
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
                        api.schedules.publishPost({id: 1, context: {user: result[0]}})
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

            it('invalid params', function (done) {
                api.schedules.publishPost({id: 'bla', context: {client: 'ghost-scheduler'}})
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
                api.schedules.publishPost({id: 10, context: {client: 'ghost-scheduler'}})
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
                api.schedules.publishPost({id: 1, context: {client: 'ghost-scheduler'}})
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
                api.schedules.publishPost({id: 3, context: {client: 'ghost-scheduler'}})
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
                api.schedules.publishPost({id: 4, context: {client: 'ghost-scheduler'}})
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
                api.schedules.publishPost({id: 2, context: {client: 'ghost-scheduler'}})
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
