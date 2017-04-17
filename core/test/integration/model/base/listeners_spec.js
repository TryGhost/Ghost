/*jshint unused:false*/
var should = require('should'),
    Promise = require('bluebird'),
    moment = require('moment'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    config = require('../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    events = require(config.paths.corePath + '/server/events'),
    errors = require(config.paths.corePath + '/server/errors'),
    models = require(config.paths.corePath + '/server/models'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    sandbox = sinon.sandbox.create();

describe('Models: listeners', function () {
    var eventsToRemember = {},
        now = moment(),
        listeners,
        scope = {
            posts: [],
            publishedAtFutureMoment1: moment().add(2, 'days').startOf('hour'),
            publishedAtFutureMoment3: moment().add(10, 'hours').startOf('hour'),
            // calculate the offset dynamically, because of DST
            timezoneOffset: moment.tz.zone('Europe/London').offset(now) - moment.tz.zone('America/Los_Angeles').offset(now),
            newTimezone: 'America/Los_Angeles',
            oldTimezone: 'Europe/London'
        };

    before(testUtils.teardown);
    beforeEach(testUtils.setup());

    beforeEach(function () {
        sandbox.stub(events, 'on', function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        listeners = rewire(config.paths.corePath + '/server/models/base/listeners');
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
                // will get rescheduled
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment1.toDate(),
                    status: 'scheduled',
                    title: '1',
                    slug: '1'
                }));

                // will get drafted
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: moment().add(2, 'hours').toDate(),
                    status: 'scheduled',
                    title: '2',
                    slug: '2'
                }));

                // will get rescheduled
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

            it('activeTimezone changes change', function (done) {
                var timeout;

                eventsToRemember['settings.activeTimezone.edited']({
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

            it('activeTimezone changes change: from a TZ to UTC', function (done) {
                var timeout;

                scope.timezoneOffset = -180;
                scope.oldTimezone = 'Asia/Baghdad';
                scope.newTimezone = 'Etc/UTC';

                eventsToRemember['settings.activeTimezone.edited']({
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

                sandbox.spy(errors, 'logError');
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

                scope.timezoneOffset = -180;
                scope.oldTimezone = 'Asia/Baghdad';
                scope.newTimezone = 'Etc/UTC';

                eventsToRemember['settings.activeTimezone.edited']({
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
                        .then(function (x) {
                            interval = setInterval(function () {
                                if (listenerHasFinished) {
                                    clearInterval(interval);
                                    errors.logError.called.should.eql(false);
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
                eventsToRemember['settings.activeTimezone.edited']({
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
});
