/*globals describe, before, beforeEach, afterEach, it */
var testUtils   = require('../../utils'),
    should      = require('should'),
    Promise     = require('bluebird'),
    _           = require('lodash'),
    // Stuff we are testing
    context     = testUtils.context,

    SubscribersAPI      = require('../../../server/api/subscribers');

describe('Subscribers API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'permission', 'perms:init', 'subscriber'));

    should.exist(SubscribersAPI);

    describe('Add', function () {
        var newSubscriber;

        beforeEach(function () {
            newSubscriber = _.clone(testUtils.DataGenerator.forKnex.createSubscriber(testUtils.DataGenerator.Content.subscribers[1]));
            Promise.resolve(newSubscriber);
        });

        it('can add a subscriber (admin)', function (done) {
            SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.admin)
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.subscribers);
                    results.subscribers.length.should.be.above(0);
                    done();
                }).catch(done);
        });

        it('can add a subscriber (external)', function (done) {
            SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.external)
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.subscribers);
                    results.subscribers.length.should.be.above(0);
                    done();
                }).catch(done);
        });

        it('CANNOT add subscriber without context', function (done) {
            SubscribersAPI.add({subscribers: [newSubscriber]}).then(function () {
                done(new Error('Add subscriber is not denied without authentication.'));
            }, function () {
                done();
            }).catch(done);
        });
    });

    describe('Edit', function () {
        var newSubscriberEmail = 'subscriber@updated.com',
        firstSubscriber = 1;

        it('can edit a subscriber (admin)', function (done) {
            SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.admin, {id: firstSubscriber}))
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.subscribers);
                    results.subscribers.length.should.be.above(0);
                    done();
                }).catch(done);
        });

        it('can edit a subscriber (editor)', function (done) {
            SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.editor, {id: firstSubscriber}))
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.subscribers);
                    results.subscribers.length.should.be.above(0);
                    done();
                }).catch(done);
        });

        // needs permissions to work properly
        it.skip('CANNOT edit subscriber (external)', function (done) {
            SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.external, {id: firstSubscriber}))
            .then(function () {
                done(new Error('Edit subscriber is not denied with external context.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('CANNOT edit subscriber that doesn\'t exit', function (done) {
            SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.internal, {id: 999}))
            .then(function () {
                done(new Error('Edit non-existent subscriber is possible.'));
            }, function (err) {
                should.exist(err);
                err.message.should.eql('Subscriber not found.');
                done();
            }).catch(done);
        });
    });

    describe('Destroy', function () {
        var firstSubscriber = 1;
        it('can destroy subscriber', function (done) {
            SubscribersAPI.destroy(_.extend({}, testUtils.context.admin, {id: firstSubscriber}))
                .then(function (results) {
                    should.not.exist(results);

                    done();
                }).catch(done);
        });
    });

    describe('Browse', function () {
        it('can browse (internal)', function (done) {
            SubscribersAPI.browse(testUtils.context.internal).then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.should.have.lengthOf(1);
                testUtils.API.checkResponse(results.subscribers[0], 'subscriber');
                results.subscribers[0].created_at.should.be.an.instanceof(Date);

                results.meta.pagination.should.have.property('page', 1);
                results.meta.pagination.should.have.property('limit', 15);
                results.meta.pagination.should.have.property('pages', 1);
                results.meta.pagination.should.have.property('total', 1);
                results.meta.pagination.should.have.property('next', null);
                results.meta.pagination.should.have.property('prev', null);

                done();
            }).catch(done);
        });

        // needs permissions to work properly
        it.skip('CANNOT browse subscriber (external)', function (done) {
            SubscribersAPI.browse(testUtils.context.external).then(function () {
                done(new Error('Browse subscriber is not denied with external context.'));
            }, function () {
                done();
            }).catch(done);
        });
    });

    describe('Read', function () {
        function extractFirstSubscriber(subscribers) {
            return _.filter(subscribers, {id: 1})[0];
        }

        it('with id', function (done) {
            SubscribersAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);

                var firstSubscriber = extractFirstSubscriber(results.subscribers);

                return SubscribersAPI.read({context: {user: 1}, id: firstSubscriber.id});
            }).then(function (found) {
                should.exist(found);
                testUtils.API.checkResponse(found.subscribers[0], 'subscriber');

                done();
            }).catch(done);
        });

        it('cannot fetch a subscriber which doesn\'t exist', function (done) {
            SubscribersAPI.read({context: {user: 1}, id: 999}).then(function () {
                done(new Error('Should not return a result'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Subscriber not found.');
                done();
            });
        });
    });
});
