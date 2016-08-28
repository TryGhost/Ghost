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
            id: 99
        };

        NotificationsAPI.add({notifications: [msg]}, testUtils.context.internal).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.id.should.be.a.Number();
            notification.id.should.not.equal(99);
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

    it('can destroy a custom notification and add its uuid to seenNotifications (owner)', function (done) {
        var customNotification = {
            type: 'info',
            location: 'top',
            custom: true,
            uuid: uuid.v4(),
            dismissible: true,
            message: 'Hello, this is dog number 4'
        };

        NotificationsAPI.add({notifications: [customNotification]}, testUtils.context.internal).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI.destroy(
            _.extend({}, testUtils.context.internal, {id: notification.id})
            ).then(function () {
                return SettingsAPI.read(_.extend({key: 'seenNotifications'}, testUtils.context.internal));
            }).then(function (response) {
                should.exist(response);
                response.settings[0].value.should.containEql(customNotification.uuid);

                done();
            }).catch(done);
        });
    });
});
