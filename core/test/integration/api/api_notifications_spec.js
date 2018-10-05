var should = require('should'),
    _ = require('lodash'),
    uuid = require('uuid'),
    ObjectId = require('bson-objectid'),
    testUtils = require('../../utils'),
    models = require('../../../server/models'),
    NotificationsAPI = require('../../../server/api/v0.1/notifications');

describe('Notifications API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    after(testUtils.teardown);
    before(testUtils.setup('settings', 'users:roles', 'perms:setting', 'perms:notification', 'perms:init'));

    beforeEach(function () {
        return models.Settings.edit({key: 'notifications', value: '[]'}, testUtils.context.internal);
    });

    should.exist(NotificationsAPI);

    it('can destroy (internal)', function (done) {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI
                .destroy(_.extend({}, testUtils.context.internal, {id: notification.id}))
                .then(function (result) {
                    should.not.exist(result);
                    done();
                })
                .catch(done);
        });
    });

    it('can destroy (owner)', function (done) {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI
                .destroy(_.extend({}, testUtils.context.owner, {id: notification.id}))
                .then(function (result) {
                    should.not.exist(result);
                    done();
                })
                .catch(done);
        });
    });

    it('ensure notification get\'s removed', function (done) {
        var customNotification = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: 'Hello, this is dog number 4'
        };

        NotificationsAPI.add({notifications: [customNotification]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            return NotificationsAPI.browse(testUtils.context.internal)
                .then(function (response) {
                    response.notifications.length.should.eql(1);
                    return NotificationsAPI.destroy(_.extend({}, testUtils.context.internal, {id: notification.id}));
                })
                .then(function () {
                    return NotificationsAPI.browse(testUtils.context.internal);
                })
                .then(function (response) {
                    response.notifications.length.should.eql(0);
                    done();
                })
                .catch(done);
        });
    });

    it('destroy unknown id', function (done) {
        NotificationsAPI
            .destroy(_.extend({}, testUtils.context.internal, {id: 1}))
            .then(function () {
                done(new Error('Expected notification error.'));
            })
            .catch(function (err) {
                err.statusCode.should.eql(404);
                done();
            });
    });

    it('destroy all', function (done) {
        var customNotification1 = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted1',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: 'Hello, this is dog number 1'
        }, customNotification2 = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted2',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: 'Hello, this is dog number 2'
        };

        NotificationsAPI
            .add({notifications: [customNotification1]}, testUtils.context.internal)
            .then(function () {
                return NotificationsAPI.add({notifications: [customNotification2]}, testUtils.context.internal);
            })
            .then(function () {
                return NotificationsAPI.destroyAll(testUtils.context.internal);
            })
            .then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            })
            .then(function (response) {
                response.notifications.length.should.eql(0);
                done();
            })
            .catch(done);
    });
});
