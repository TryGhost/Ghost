const should = require('should');
const sinon = require('sinon');
const moment = require('moment-timezone');
const rewire = require('rewire');
const _ = require('lodash');
const events = require('../../../../core/server/lib/common/events');
const models = require('../../../../core/server/models');
const testUtils = require('../../../utils');

describe('Models: listeners', function () {
    const eventsToRemember = {};
    const now = moment();

    const scope = {
        posts: [],
        publishedAtFutureMoment1: moment().add(2, 'days').startOf('hour'),
        publishedAtFutureMoment2: moment().add(2, 'hours').startOf('hour'),
        publishedAtFutureMoment3: moment().add(10, 'hours').startOf('hour')
    };

    before(testUtils.teardownDb);

    beforeEach(testUtils.setup('owner:pre', 'settings'));

    beforeEach(function () {
        sinon.stub(events, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        rewire('../../../../core/server/models/base/listeners');
    });

    afterEach(function () {
        events.on.restore();
        sinon.restore();
        scope.posts = [];
        return testUtils.teardownDb();
    });

    describe('on timezone changed', function () {
        let posts;

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

            it('timezone changes from London to Los Angeles', function (done) {
                let timeout;

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

                eventsToRemember['settings.timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _previousAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            const post1 = _.find(results.models, function (post) {
                                return post.get('title') === '1';
                            });

                            const post2 = _.find(results.models, function (post) {
                                return post.get('title') === '2';
                            });

                            const post3 = _.find(results.models, function (post) {
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

            it('timezone changes from Baghdad to UTC', function (done) {
                let timeout;

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

                eventsToRemember['settings.timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _previousAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            const post1 = _.find(results.models, function (post) {
                                return post.get('title') === '1';
                            });

                            const post2 = _.find(results.models, function (post) {
                                return post.get('title') === '2';
                            });

                            const post3 = _.find(results.models, function (post) {
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

            it('timezone changes from Amsterdam to Seoul', function (done) {
                let timeout;

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

                eventsToRemember['settings.timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _previousAttributes: {value: scope.oldTimezone}
                });

                (function retry() {
                    models.Post.findAll({context: {internal: true}})
                        .then(function (results) {
                            const post1 = _.find(results.models, function (post) {
                                return post.get('title') === '1';
                            });

                            const post2 = _.find(results.models, function (post) {
                                return post.get('title') === '2';
                            });

                            const post3 = _.find(results.models, function (post) {
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
                eventsToRemember['settings.timezone.edited']({
                    attributes: {value: scope.newTimezone},
                    _previousAttributes: {value: scope.oldTimezone}
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

    describe('on notifications changed', function () {
        it('nothing to delete', function (done) {
            const notifications = JSON.stringify([
                {
                    addedAt: moment().subtract(1, 'week').format(),
                    seen: true
                },
                {
                    addedAt: moment().subtract(2, 'month').format(),
                    seen: true
                },
                {
                    addedAt: moment().subtract(1, 'day').format(),
                    seen: false
                }
            ]);

            models.Settings.edit({key: 'notifications', value: notifications}, testUtils.context.internal)
                .then(function () {
                    eventsToRemember['settings.notifications.edited']({
                        attributes: {
                            value: notifications
                        }
                    });

                    return models.Settings.findOne({key: 'notifications'}, testUtils.context.internal);
                }).then(function (model) {
                    JSON.parse(model.get('value')).length.should.eql(3);
                    done();
                }).catch(done);
        });

        it('expect deletion', function (done) {
            const notifications = JSON.stringify([
                {
                    content: 'keep-1',
                    addedAt: moment().subtract(1, 'week').toDate(),
                    seen: true
                },
                {
                    content: 'delete-me',
                    addedAt: moment().subtract(3, 'month').toDate(),
                    seen: true
                },
                {
                    content: 'keep-2',
                    addedAt: moment().subtract(1, 'day').toDate(),
                    seen: false
                }
            ]);

            models.Settings.edit({key: 'notifications', value: notifications}, testUtils.context.internal)
                .then(function () {
                    setTimeout(function () {
                        return models.Settings.findOne({key: 'notifications'}, testUtils.context.internal)
                            .then(function (model) {
                                JSON.parse(model.get('value')).length.should.eql(2);
                                done();
                            })
                            .catch(done);
                    }, 100);
                })
                .catch(done);
        });
    });
});
