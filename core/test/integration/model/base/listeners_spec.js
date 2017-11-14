var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    Promise = require('bluebird'),
    moment = require('moment-timezone'),
    rewire = require('rewire'),
    _ = require('lodash'),
    config = require('../../../../server/config'),
    events = require(config.get('paths').corePath + '/server/events'),
    models = require(config.get('paths').corePath + '/server/models'),
    testUtils = require(config.get('paths').corePath + '/test/utils'),
    logging = require(config.get('paths').corePath + '/server/logging'),
    sequence = require(config.get('paths').corePath + '/server/utils/sequence'),
    sandbox = sinon.sandbox.create();

describe('Models: listeners', function () {
    var eventsToRemember = {},
        now = moment(),
        listeners,
        scope = {
            posts: [],
            publishedAtFutureMoment1: moment().add(2, 'days').startOf('hour'),
            publishedAtFutureMoment2: moment().add(2, 'hours').startOf('hour'),
            publishedAtFutureMoment3: moment().add(10, 'hours').startOf('hour')
        };

    before(testUtils.teardown);
    beforeEach(testUtils.setup('owner', 'user-token:0'));

    beforeEach(function () {
        sandbox.stub(events, 'on', function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        listeners = rewire(config.get('paths').corePath + '/server/models/base/listeners');
    });

    afterEach(function (done) {
        events.on.restore();
        sandbox.restore();
        scope.posts = [];
        testUtils.teardown(done);
    });

    describe('on timezone changed', function () {
        var posts;

        describe('db has scheduled posts', function () {
            beforeEach(function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment1.toDate(),
                    status: 'scheduled',
                    title: '1',
                    slug: '1'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment2.toDate(),
                    status: 'scheduled',
                    title: '2',
                    slug: '2'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment3.toDate(),
                    status: 'scheduled',
                    title: '3',
                    slug: '3'
                }));

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, testUtils.context.owner);
                })).then(function (result) {
                    result.length.should.eql(3);
                    posts = result;
                    done();
                }).catch(function (err) {
                    return done(err);
                });
            });

            it('active_timezone changes from London to Los Angeles', function (done) {
                var timeout;

                /**
                 * From London +1
                 * To Los Angeles -7
                 *
                 * We expect +420 minutes if DST. (otherwise +480)
                 *
                 * Image it's 11AM London time. 10AM UTC.
                 * Imagine the post is scheduled for 8PM London time.
                 * The database UTC string is e.g. 2017-04-18 19:00:00.
                 * You switch the timezone to Los Angeles.
                 * It's 3AM in the morning in Los Angeles.
                 * If we don't change the database UTC string, the post is scheduled at 11AM in the morning! (19-7)
                 * The post should be still scheduled for 8PM Los Angeles time.
                 * So the database UTC string must be 2017-04-19 03:00:00. (-7 hours === 8 o'clock in Los Angeles)
                 */

                // calculate the offset dynamically, because of DST
                scope.timezoneOffset = moment.tz.zone('America/Los_Angeles').utcOffset(now) - moment.tz.zone('Europe/London').utcOffset(now);
                scope.newTimezone = 'America/Los_Angeles';
                scope.oldTimezone = 'Europe/London';

                eventsToRemember['settings.active_timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            var post1 = _.find(results.models, function (post) {
                                    return post.get('title') === '1';
                                }),
                                post2 = _.find(results.models, function (post) {
                                    return post.get('title') === '2';
                                }),
                                post3 = _.find(results.models, function (post) {
                                    return post.get('title') === '3';
                                });

                            if (results.models.length === posts.length &&
                                post1.get('status') === 'scheduled' &&
                                post2.get('status') === 'scheduled' &&
                                post3.get('status') === 'scheduled' &&
                                moment(post1.get('published_at')).diff(scope.publishedAtFutureMoment1.clone().add(scope.timezoneOffset, 'minutes')) === 0 &&
                                moment(post2.get('published_at')).diff(scope.publishedAtFutureMoment2.clone().add(scope.timezoneOffset, 'minutes')) === 0 &&
                                moment(post3.get('published_at')).diff(scope.publishedAtFutureMoment3.clone().add(scope.timezoneOffset, 'minutes')) === 0) {
                                return done();
                            }

                            clearTimeout(timeout);
                            timeout = setTimeout(retry, 500);
                        })
                        .catch(done);
                })();
            });

            it('active_timezone changes from Baghdad to UTC', function (done) {
                var timeout;

                /**
                 * From Baghdad +3
                 * To UTC +/-0
                 *
                 * We expect +180 minutes.
                 *
                 * Image it's 11AM Baghdad time.
                 * Imagine the post is scheduled for 8PM Baghdad time.
                 * The database UTC string is e.g. 2017-04-18 17:00:00.
                 * You switch the timezone to UTC.
                 * It's 9AM in the morning in UTC.
                 * If we don't change the database UTC string, the post is scheduled at 5PM in the evening!
                 * The post should be still scheduled for 8PM UTC time.
                 * So the database UTC string must be 2017-04-19 20:00:00.
                 */
                scope.timezoneOffset = moment.tz.zone('Etc/UTC').utcOffset(now) - moment.tz.zone('Asia/Baghdad').utcOffset(now);
                scope.oldTimezone = 'Asia/Baghdad';
                scope.newTimezone = 'Etc/UTC';

                eventsToRemember['settings.active_timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            var post1 = _.find(results.models, function (post) {
                                    return post.get('title') === '1';
                                }),
                                post2 = _.find(results.models, function (post) {
                                    return post.get('title') === '2';
                                }),
                                post3 = _.find(results.models, function (post) {
                                    return post.get('title') === '3';
                                });

                            if (results.models.length === posts.length &&
                                post1.get('status') === 'scheduled' &&
                                post2.get('status') === 'scheduled' &&
                                post3.get('status') === 'scheduled' &&
                                moment(post1.get('published_at')).diff(scope.publishedAtFutureMoment1.clone().add(scope.timezoneOffset, 'minutes')) === 0 &&
                                moment(post2.get('published_at')).diff(scope.publishedAtFutureMoment2.clone().add(scope.timezoneOffset, 'minutes')) === 0 &&
                                moment(post3.get('published_at')).diff(scope.publishedAtFutureMoment3.clone().add(scope.timezoneOffset, 'minutes')) === 0) {
                                return done();
                            }

                            clearTimeout(timeout);
                            timeout = setTimeout(retry, 500);
                        })
                        .catch(done);
                })();
            });

            it('active_timezone changes from Amsterdam to Seoul', function (done) {
                var timeout;

                /**
                 * From Amsterdam +2
                 * To Seoul +9
                 *
                 * We expect -420 minutes.
                 *
                 * Image it's 11AM Amsterdam time. 9AM UTC.
                 * Imagine the post is scheduled for 8PM Amsterdam time.
                 * The database UTC string is e.g. 2017-04-18 18:00:00.
                 * You switch the timezone to Seoul timezone.
                 * It's 6PM in the evening in Seoul timezone.
                 * If we don't change the database UTC string, the post is scheduled at 3AM in the evening on the next day!
                 * The post should be still scheduled for 8PM UTC time.
                 * So the database UTC string must be 2017-04-18 11:00:00.
                 */
                scope.timezoneOffset = moment.tz.zone('Asia/Seoul').utcOffset(now) - moment.tz.zone('Europe/Amsterdam').utcOffset(now);
                scope.oldTimezone = 'Europe/Amsterdam';
                scope.newTimezone = 'Asia/Seoul';

                eventsToRemember['settings.active_timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            var post1 = _.find(results.models, function (post) {
                                    return post.get('title') === '1';
                                }),
                                post2 = _.find(results.models, function (post) {
                                    return post.get('title') === '2';
                                }),
                                post3 = _.find(results.models, function (post) {
                                    return post.get('title') === '3';
                                });

                            if (results.models.length === posts.length &&
                                post1.get('status') === 'scheduled' &&
                                post2.get('status') === 'draft' &&
                                post3.get('status') === 'scheduled' &&
                                moment(post1.get('published_at')).diff(scope.publishedAtFutureMoment1.clone().add(scope.timezoneOffset, 'minutes')) === 0 &&
                                moment(post3.get('published_at')).diff(scope.publishedAtFutureMoment3.clone().add(scope.timezoneOffset, 'minutes')) === 0) {
                                return done();
                            }

                            clearTimeout(timeout);
                            timeout = setTimeout(retry, 500);
                        })
                        .catch(done);
                })();
            });

            it('collision: ensure the listener always succeeds', function (done) {
                var timeout,
                    interval,
                    post1 = posts[0],
                    listenerHasFinished = false;

                sandbox.spy(logging, 'error');
                sandbox.spy(models.Post, 'findAll');

                // simulate a delay, so that the edit operation from the test here interrupts
                // the goal here is to force that the listener has old post data, updated_at is then too old
                // e.g. user edits while listener is active
                listeners.__set__('sequence', function overrideSequence() {
                    var self = this,
                        args = arguments;

                    return Promise.delay(3000)
                        .then(function () {
                            return sequence.apply(self, args)
                                .finally(function () {
                                    setTimeout(function () {
                                        listenerHasFinished = true;
                                    }, 500);
                                });
                        });
                });

                scope.timezoneOffset = moment.tz.zone('Asia/Baghdad').utcOffset(now) - moment.tz.zone('Etc/UTC').utcOffset(now);
                scope.oldTimezone = 'Asia/Baghdad';
                scope.newTimezone = 'Etc/UTC';

                eventsToRemember['settings.active_timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                models.Post.findAll.calledOnce.should.eql(false);

                // set a little timeout to ensure the listener fetched posts from the database and the updated_at difference
                // is big enough to simulate the collision scenario
                // if you remove the transaction from the listener, this test will fail and show a collision error
                timeout = setTimeout(function () {
                    clearTimeout(timeout);

                    // ensure findAll was called in the listener
                    // ensure findAll was called before user's edit operation
                    models.Post.findAll.calledOnce.should.eql(true);

                    // simulate a client updates the post during the listener activity
                    models.Post.edit({title: 'a new title, yes!'}, _.merge({id: post1.id}, testUtils.context.internal))
                        .then(function () {
                            interval = setInterval(function () {
                                if (listenerHasFinished) {
                                    clearInterval(interval);
                                    logging.error.called.should.eql(false);
                                    return done();
                                }
                            }, 1000);
                        })
                        .catch(done);
                }, 2000);
            });
        });

        describe('db has no scheduled posts', function () {
            it('no scheduled posts', function (done) {
                eventsToRemember['settings.active_timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                models.Post.findAll({context: {internal: true}})
                    .then(function (results) {
                        results.length.should.eql(0);
                        done();
                    })
                    .catch(done);
            });
        });
    });

    describe('on user is deactived', function () {
        it('ensure tokens get deleted', function (done) {
            var userId = testUtils.DataGenerator.Content.users[0].id,
                timeout,
                retries = 0;

            (function retry() {
                Promise.props({
                    accesstokens: models.Accesstoken.findAll({context: {internal: true}, id: userId}),
                    refreshtokens: models.Refreshtoken.findAll({context: {internal: true}, id: userId})
                }).then(function (result) {
                    if (retries === 0) {
                        // trigger event after first check how many tokens the user has
                        eventsToRemember['user.deactivated']({
                            id: userId
                        });

                        result.accesstokens.length.should.eql(1);
                        result.refreshtokens.length.should.eql(1);
                    }

                    if (!result.accesstokens.length && !result.refreshtokens.length) {
                        return done();
                    }

                    retries = retries + 1;
                    clearTimeout(timeout);
                    timeout = setTimeout(retry, 500);
                }).catch(done);
            })();
        });
    });
});
