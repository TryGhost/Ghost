
/*jshint unused:false*/
var should = require('should'),
    Promise = require('bluebird'),
    moment = require('moment'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    _ = require('lodash'),
    config = require('../../../../server/config'),
    testUtils = require(config.get('paths').corePath + '/test/utils'),
    events = require(config.get('paths').corePath + '/server/events'),
    models = require(config.get('paths').corePath + '/server/models');

describe('Models: listeners', function () {
    var eventsToRemember = {},
        scope = {
            posts: [],
            publishedAtFutureMoment1: moment().add(2, 'days').startOf('hour'),
            publishedAtFutureMoment3: moment().add(10, 'hours').startOf('hour'),
            timezoneOffset: -480,
            newTimezone: 'America/Los_Angeles',
            oldTimezone: 'Europe/London'
        };

    before(testUtils.teardown);
    beforeEach(testUtils.setup());

    beforeEach(function () {
        sinon.stub(events, 'on', function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        rewire(config.get('paths').corePath + '/server/models/base/listeners');
    });

    afterEach(function () {
        events.on.restore();
        scope.posts = [];
        return testUtils.teardown();
    });

    describe('on timezone changed', function () {
        var posts;

        describe('db has scheduled posts', function () {
            beforeEach(function () {
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

                return Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, testUtils.context.owner);
                })).then(function (result) {
                    result.length.should.eql(3);
                    posts = result;
                });
            });

            it('activeTimezone changes change', function () {
                var timeout;

                eventsToRemember['settings.activeTimezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    return models.Post.findAll({context: {internal: true}})
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
                            }

                            clearTimeout(timeout);
                            timeout = setTimeout(retry, 500);
                        });
                })();
            });

            it('activeTimezone changes change: from a TZ to UTC', function () {
                var timeout;

                scope.timezoneOffset = -180;
                scope.oldTimezone = 'Asia/Baghdad';
                scope.newTimezone = 'Etc/UTC';

                eventsToRemember['settings.activeTimezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    return models.Post.findAll({context: {internal: true}})
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
                            }

                            clearTimeout(timeout);
                            timeout = setTimeout(retry, 500);
                        });
                })();
            });
        });

        describe('db has no scheduled posts', function () {
            it('no scheduled posts', function () {
                eventsToRemember['settings.activeTimezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _updatedAttributes: {value: scope.oldTimezone}
                });

                return models.Post.findAll({context: {internal: true}})
                    .then(function (results) {
                        results.length.should.eql(0);
                    });
            });
        });
    });
});
