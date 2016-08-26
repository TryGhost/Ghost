var testUtils        = require('../../utils'),
    should           = require('should'),
    _                = require('lodash'),
    uuid             = require('node-uuid'),

    // Stuff we are testing
    NotificationsAPI = require('../../../server/api/notifications'),
    SettingsAPI      = require('../../../server/api/settings');

describe('Notifications API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('settings', 'users:roles', 'perms:setting', 'perms:notification', 'perms:init'));

    should.exist(NotificationsAPI);

    it('can add, adds defaults (internal)', function () {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog'
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.dismissible.should.be.true();
            should.exist(notification.location);
            notification.location.should.equal('bottom');
        });
    });

    it('can add, adds defaults (owner)', function () {
        var msg = {
            type: 'info',
            message: 'Hello, this is another dog'
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.owner).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.dismissible.should.be.true();
            should.exist(notification.location);
            notification.location.should.equal('bottom');
        });
    });

    it('can add, adds id and status (internal)', function () {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog number 3',
            id: 99
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.id.should.be.a.Number();
            notification.id.should.not.equal(99);
            should.exist(notification.status);
            notification.status.should.equal('alert');
        });
    });

    it('can browse (internal)', function () {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error' // A string. Should fit in one line.
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function () {
            NotificationsAPI.browse(testUtils.context.internal).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                testUtils.API.checkResponse(results.notifications[0], 'notification');
            });
        });
    });

    it('can browse (owner)', function () {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error' // A string. Should fit in one line.
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.owner).then(function () {
            NotificationsAPI.browse(testUtils.context.owner).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                testUtils.API.checkResponse(results.notifications[0], 'notification');
            });
        });
    });

    it('can destroy (internal)', function () {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            return NotificationsAPI.destroy(
                _.extend({}, testUtils.context.internal, {id: notification.id})
            ).then(function (result) {
                should.not.exist(result);
            });
        });
    });

    it('can destroy (owner)', function () {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        return NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            return NotificationsAPI.destroy(
                _.extend({}, testUtils.context.owner, {id: notification.id})
            ).then(function (result) {
                should.not.exist(result);
            });
        });
    });

    it('can destroy a custom notification and add its uuid to seenNotifications (owner)', function () {
        var customNotification = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted',
            custom: true,
            uuid: uuid.v4(),
            dismissible: true,
            message: 'Hello, this is dog number 4'
        };

        return NotificationsAPI.add({notifications: [customNotification]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            return NotificationsAPI.destroy(
            _.extend({}, testUtils.context.internal, {id: notification.id})
            ).then(function () {
                return SettingsAPI.read(_.extend({key: 'seenNotifications'}, testUtils.context.internal));
            }).then(function (response) {
                should.exist(response);
                response.settings[0].value.should.containEql(customNotification.uuid);
            });
        });
    });
});
