/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator    = require('../../utils/fixtures/data-generator'),
    NotificationsAPI = require('../../../server/api/notifications');

describe('Notifications API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can browse', function (done) {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error', // A string. Should fit in one line.
        };
        NotificationsAPI.add(msg).then(function (notification) {
            NotificationsAPI.browse().then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                testUtils.API.checkResponse(results.notifications[0], 'notification');
                done();
            });
        });
    });

    it('can add, adds defaults', function (done) {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog'
        };

        NotificationsAPI.add(msg).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.dismissable.should.be.true;
            should.exist(notification.location);
            notification.location.should.equal('bottom');

            done();
        });
    });

    it('can add, adds id and status', function (done) {
        var msg = {
            type: 'info',
            message: 'Hello, this is dog',
            id: 99
        };

        NotificationsAPI.add(msg).then(function (result) {
            var notification;

            should.exist(result);
            should.exist(result.notifications);

            notification = result.notifications[0];
            notification.id.should.be.a.Number;
            notification.id.should.not.equal(99);
            should.exist(notification.status);
            notification.status.should.equal('persistent')
            
            done();
        });
    });

    it('can destroy', function (done) {
        var msg = {
            type: 'error',
            message: 'Goodbye, cruel world!'
        };

        NotificationsAPI.add(msg).then(function (result) {
            var notification = result.notifications[0];

            NotificationsAPI.destroy({ id: notification.id }).then(function (result) {
                should.exist(result);
                should.exist(result.notifications);
                result.notifications[0].id.should.equal(notification.id);

                done();
            }).catch(done);
        });
    });
});