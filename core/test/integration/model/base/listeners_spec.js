var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    testUtils = require('../../../utils'),
    Promise = require('bluebird'),
    moment = require('moment'),
    rewire = require('rewire'),
    _ = require('lodash'),
    config = require('../../../../server/config'),
    events = require(config.get('paths').corePath + '/server/events'),
    models = require(config.get('paths').corePath + '/server/models'),

    sandbox = sinon.sandbox.create();

describe('Models: listeners', function () {
    var eventsToRemember = {},
        now = moment(),
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
    beforeEach(testUtils.setup('owner', 'user-token:0'));

    beforeEach(function () {
        sandbox.stub(events, 'on', function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        rewire(config.get('paths').corePath + '/server/models/base/listeners');
    });

    afterEach(function (done) {
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
