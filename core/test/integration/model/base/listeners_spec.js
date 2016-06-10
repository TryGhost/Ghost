/*globals describe, before, beforeEach, afterEach, it*/

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
    models = require(config.paths.corePath + '/server/models');

describe('Models: listeners', function () {
    var eventsToRemember = {},
        scope = {
            posts: [],
            publishedAtFutureMoment: moment().add(2, 'days').startOf('hour'),
            timezoneOffset: 420,
            newTimezone: 'America/Los_Angeles',
            oldTimezone: 'Europe/London'
        };

    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup());

    beforeEach(function () {
        sinon.stub(events, 'on', function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        rewire(config.paths.corePath + '/server/models/base/listeners');
    });

    afterEach(function (done) {
        events.on.restore();
        testUtils.teardown(done);
    });

    describe('on timezone changed', function () {
        var posts;

        describe('db has scheduled posts', function () {
            beforeEach(function (done) {
                // will get rescheduled
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment.toDate(),
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

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, testUtils.context.owner);
                })).then(function (result) {
                    result.length.should.eql(2);
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
                                });

                            if (results.models.length === posts.length &&
                                post2.get('status') === 'draft' &&
                                moment(post1.get('published_at')).diff(scope.publishedAtFutureMoment.clone().subtract(scope.timezoneOffset, 'minutes')) === 0) {
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
});
