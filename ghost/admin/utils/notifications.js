import Notification from 'ghost/models/notification';

var Notifications = Ember.ArrayProxy.extend({
    delayedNotifications: [],
    content: Ember.A(),
    timeout: 3000,

    pushObject: function (object) {
        object.typeClass = 'notification-' + object.type;
        // This should be somewhere else.
        if (object.type === 'success') {
            object.typeClass = object.typeClass + ' notification-passive';
        }
        this._super(object);
    },
    handleNotification: function (message, delayed) {
        if (!message.status) {
            message.status = 'passive';
        }

        if (!delayed) {
            this.pushObject(message);
        } else {
            this.delayedNotifications.push(message);
        }
    },
    showError: function (message, delayed) {
        this.handleNotification({
            type: 'error',
            message: message
        }, delayed);
    },
    showErrors: function (errors) {
        for (var i = 0; i < errors.length; i += 1) {
            this.showError(errors[i].message || errors[i]);
        }
    },
    showAPIError: function (resp, defaultErrorText, delayed) {
        defaultErrorText = defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
            this.showError(resp.jqXHR.responseJSON.error, delayed);
        } else {
            this.showError(defaultErrorText, delayed);
        }
    },
    showInfo: function (message, delayed) {
        this.handleNotification({
            type: 'info',
            message: message
        }, delayed);
    },
    showSuccess: function (message, delayed) {
        this.handleNotification({
            type: 'success',
            message: message
        }, delayed);
    },
    showWarn: function (message, delayed) {
        this.handleNotification({
            type: 'warn',
            message: message
        }, delayed);
    },
    displayDelayed: function () {
        var self = this;

        self.delayedNotifications.forEach(function (message) {
            self.pushObject(message);
        });
        self.delayedNotifications = [];
    },
    closeNotification: function (notification) {
        var self = this;

        if (notification instanceof Notification) {
            notification.deleteRecord();
            notification.save().then(function () {
                self.removeObject(notification);
            });
        } else {
            this.removeObject(notification);
        }
    },
    closePassive: function () {
        this.set('content', this.rejectBy('status', 'passive'));
    },
    closePersistent: function () {
        this.set('content', this.rejectBy('status', 'persistent'));
    },
    closeAll: function () {
        this.clear();
    }
});

export default Notifications;
