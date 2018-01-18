var should = require('should'),
    _ = require('lodash'),
    uuid = require('uuid'),
    ObjectId = require('bson-objectid'),
    testUtils = require('../../utils'),
    NotificationsAPI = require('../../../server/api/notifications');

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
            notification.id.should.be.a.String();

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
            notification.id.should.be.a.String();
            should.exist(notification.status);
            notification.status.should.equal('alert');

            done();
        }).catch(done);
    });

    it('duplicates', function (done) {
        var customNotification1 = {
            status: 'alert',
            type: 'info',
            location: 'test.to-be-deleted1',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: 'Hello, this is dog number 1'
        };

        NotificationsAPI
            .add({notifications: [customNotification1]}, testUtils.context.internal)
            .then(function () {
                return NotificationsAPI.add({notifications: [customNotification1]}, testUtils.context.internal);
            })
            .then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            })
            .then(function (response) {
                response.notifications.length.should.eql(1);
                done();
            })
            .catch(done);
    });

    it('can browse (internal)', function (done) {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error', // A string. Should fit in one line.
            custom: true
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
            message: 'This is an error', // A string. Should fit in one line.
            custom: true
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

    it('receive correct order', function (done) {
        var customNotification1 = {
            status: 'alert',
            type: 'info',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: '1'
        }, customNotification2 = {
            status: 'alert',
            type: 'info',
            custom: true,
            id: uuid.v1(),
            dismissible: true,
            message: '2'
        };

        NotificationsAPI
            .add({notifications: [customNotification1]}, testUtils.context.internal)
            .then(function () {
                return NotificationsAPI.add({notifications: [customNotification2]}, testUtils.context.internal);
            })
            .then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            })
            .then(function (response) {
                response.notifications.length.should.eql(2);
                response.notifications[0].message.should.eql('2');
                response.notifications[1].message.should.eql('1');
                done();
            })
            .catch(done);
    });

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
