var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    ObjectId = require('bson-objectid'),
    NotificationsAPI = require('../../../server/api/notifications'),
    SettingsAPI = require('../../../server/api/settings');

describe('Notifications API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('settings', 'users:roles', 'perms:setting', 'perms:notification', 'perms:init'));

    should.exist(NotificationsAPI);

    after(function () {
        return NotificationsAPI.destroyAll(testUtils.context.internal);
    });

    it('can add, adds defaults (internal)', function (done) {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.dismissible.should.be.true();
            should.exist(notification.location);
            notification.location.should.equal('bottom');

            done();
        }).catch(done);
    });

    it('can add, adds defaults (owner)', function (done) {
        var msg = {
            type: 'info',
            message: 'Hello, this is another dog'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.owner).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.dismissible.should.be.true();
            should.exist(notification.location);
            notification.location.should.equal('bottom');

            done();
        }).catch(done);
    });

    it('can add, adds id and status (internal)', function (done) {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog number 3',
            // id can't be passed from outside
            id: ObjectId.generate()
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.id.should.not.equal(msg.id);
            should.exist(notification.status);
            notification.status.should.equal('alert');

            done();
        }).catch(done);
    });

    it('can browse (internal)', function (done) {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error' // A string. Should fit in one line.
        };
        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function () {
            NotificationsAPI.browse(testUtils.context.internal).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                testUtils.API.checkResponse(results.notifications[0], 'notification');
                done();
            }).catch(done);
        });
    });

    it('can browse (owner)', function (done) {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error' // A string. Should fit in one line.
        };
        NotificationsAPI.add({notifications: [msg]}, testUtils.context.owner).then(function () {
            NotificationsAPI.browse(testUtils.context.owner).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                testUtils.API.checkResponse(results.notifications[0], 'notification');
                done();
            }).catch(done);
        });
    });

    it('can destroy (internal)', function (done) {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI.destroy(
                _.extend({}, testUtils.context.internal, {id: notification.id})
            ).then(function (result) {
                should.not.exist(result);

                done();
            }).catch(done);
        });
    });

    it('can destroy (owner)', function (done) {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI.destroy(
                _.extend({}, testUtils.context.owner, {id: notification.id})
            ).then(function (result) {
                should.not.exist(result);

                done();
            }).catch(done);
        });
    });

    it('can destroy a custom notification and add its uuid to seen_notifications (owner)', function (done) {
        var customNotification = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted',
            custom: true,
            dismissible: true,
            message: 'Hello, this is dog number 4'
        };

        NotificationsAPI.add({notifications: [customNotification]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI.destroy(
                _.extend({}, testUtils.context.internal, {id: notification.id})
            ).then(function () {
                return SettingsAPI.read(_.extend({key: 'seen_notifications'}, testUtils.context.internal));
            }).then(function (response) {
                should.exist(response);
                response.settings[0].value.should.containEql(notification.id);

                done();
            }).catch(done);
        });
    });
});
