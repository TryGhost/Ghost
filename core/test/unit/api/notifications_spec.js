var rewire = require('rewire'),
    /*jshint unused:false*/
    should = require('should'),
    NotificationAPI = rewire('../../../server/api/notifications');

describe('UNIT: Notification API', function () {
    it('ensure non duplicates', function (done) {
        var options = {context: {internal: true}},
            notifications = [{
                type: 'info',
                message: 'Hello, this is dog'
            }],
            notificationStore = NotificationAPI.__get__('notificationsStore');

        NotificationAPI.add({notifications: notifications}, options)
            .then(function () {
                notificationStore.length.should.eql(1);
                return NotificationAPI.add({notifications: notifications}, options);
            })
            .then(function () {
                notificationStore.length.should.eql(1);

                notifications.push({
                    type: 'info',
                    message: 'Hello, this is cat'
                });

                return NotificationAPI.add({notifications: notifications}, options);
            })
            .then(function () {
                notificationStore.length.should.eql(2);
                done();
            })
            .catch(done);
    });
});
