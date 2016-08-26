var testUtils   = require('../../utils'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    fs          = require('fs'),
    _           = require('lodash'),
    context     = testUtils.context,
    errors      = require('../../../server/errors'),
    serverUtils = require('../../../server/utils'),
    apiUtils    = require('../../../server/api/utils'),
    SubscribersAPI      = require('../../../server/api/subscribers');

describe('Subscribers API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:subscriber', 'perms:init', 'subscriber'));

    should.exist(SubscribersAPI);

    describe('Add', function () {
        var newSubscriber;

        beforeEach(function () {
            newSubscriber = _.clone(testUtils.DataGenerator.forKnex.createSubscriber(testUtils.DataGenerator.Content.subscribers[1]));
            Promise.resolve(newSubscriber);
        });

        it('can add a subscriber (admin)', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.admin)
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('can add a subscriber (editor)', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.editor)
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('can add a subscriber (author)', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.author)
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('can add a subscriber (external)', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.external)
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('duplicate subscriber', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.external)
            .then(function () {
                return SubscribersAPI.add({subscribers: [newSubscriber]}, testUtils.context.external);
            });
        });

        it('CANNOT add subscriber without context', function () {
            return SubscribersAPI.add({subscribers: [newSubscriber]})
            .then(function () {
                throw new Error('Add subscriber without context should have no access.');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
            });
        });
    });

    describe('Edit', function () {
        var newSubscriberEmail = 'subscriber@updated.com',
        firstSubscriber = 1;

        it('can edit a subscriber (admin)', function () {
            return SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.admin, {id: firstSubscriber}))
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('can edit subscriber (external)', function () {
            return SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.external, {id: firstSubscriber}))
            .then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);
            });
        });

        it('CANNOT edit a subscriber (editor)', function () {
            return SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.editor, {id: firstSubscriber}))
            .then(function () {
                throw new Error('Edit subscriber as author should have no access.');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
            });
        });

        it('CANNOT edit subscriber (author)', function () {
            return SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.author, {id: firstSubscriber}))
            .then(function () {
                throw new Error('Edit subscriber as author should have no access.');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
            });
        });

        it('CANNOT edit subscriber that doesn\'t exit', function () {
            return SubscribersAPI.edit({subscribers: [{email: newSubscriberEmail}]}, _.extend({}, context.internal, {id: 999}))
            .then(function () {
                throw new Error('Edit non-existent subscriber is possible.');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
            });
        });
    });

    describe('Destroy', function () {
        var firstSubscriber = 1;

        it('can destroy subscriber as admin', function () {
            return SubscribersAPI.destroy(_.extend({}, testUtils.context.admin, {id: firstSubscriber}))
            .then(function (results) {
                should.not.exist(results);
            });
        });

        it('CANNOT destroy subscriber', function () {
            return SubscribersAPI.destroy(_.extend({}, testUtils.context.editor, {id: firstSubscriber}))
            .then(function () {
                throw new Error('Destroy subscriber should not be possible as editor.');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.NoPermissionError).should.eql(true);
            });
        });
    });

    describe('Browse', function () {
        it('can browse (internal)', function () {
            return SubscribersAPI.browse(testUtils.context.internal).then(function (results) {
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
            });
        });

        it('CANNOT browse subscriber (external)', function () {
            return SubscribersAPI.browse(testUtils.context.external)
            .then(function () {
                throw new Error('Browse subscriber should be denied with external context.');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
            });
        });
    });

    describe('Read', function () {
        function extractFirstSubscriber(subscribers) {
            return _.filter(subscribers, {id: 1})[0];
        }

        it('with id', function () {
            return SubscribersAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.exist(results.subscribers);
                results.subscribers.length.should.be.above(0);

                var firstSubscriber = extractFirstSubscriber(results.subscribers);

                return SubscribersAPI.read({context: {user: 1}, id: firstSubscriber.id});
            }).then(function (found) {
                should.exist(found);
                testUtils.API.checkResponse(found.subscribers[0], 'subscriber');
            });
        });

        it('CANNOT fetch a subscriber which doesn\'t exist', function () {
            return SubscribersAPI.read({context: {user: 1}, id: 999}).then(function () {
                throw new Error('Should not return a result');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
            });
        });
    });

    describe('Read CSV', function () {
        var scope = {},
            stub;

        beforeEach(function () {
            sinon.stub(fs, 'unlink', function (path, cb) {
                cb();
            });
            sinon.stub(apiUtils, 'checkFileExists').returns(true);
            stub = sinon.stub(apiUtils, 'checkFileIsValid').returns(true);
            sinon.stub(serverUtils, 'readCSV', function () {
                if (scope.csvError) {
                    return Promise.reject(new Error('csv'));
                }

                return Promise.resolve(scope.values);
            });
        });

        afterEach(function () {
            fs.unlink.restore();
            apiUtils.checkFileExists.restore();
            apiUtils.checkFileIsValid.restore();
            serverUtils.readCSV.restore();
            scope.csvError = false;
        });

        it('check that fn works in general', function () {
            scope.values = [{email: 'lol@hallo.de'}, {email: 'test'}, {email:'lol@hallo.de'}];

            return SubscribersAPI.importCSV(_.merge(testUtils.context.internal, {path: '/somewhere'}))
            .then(function (result) {
                result.meta.stats.imported.should.eql(1);
                result.meta.stats.duplicates.should.eql(1);
                result.meta.stats.invalid.should.eql(1);
            });
        });

        it('check that fn works in general', function () {
            scope.values = [{email: 'lol@hallo.de'}, {email: '1@kate.de'}];

            return SubscribersAPI.importCSV(_.merge(testUtils.context.internal, {path: '/somewhere'}))
            .then(function (result) {
                result.meta.stats.imported.should.eql(2);
                result.meta.stats.duplicates.should.eql(0);
                result.meta.stats.invalid.should.eql(0);
            });
        });

        it('read csv throws a not found error', function () {
            scope.csvError = true;

            return SubscribersAPI.importCSV(_.merge(testUtils.context.internal, {path: '/somewhere'}))
            .then(function () {
                throw new Error('we expected an error here!');
            }).catch(function (err) {
                err.message.should.eql('csv');
            });
        });
    });
});
