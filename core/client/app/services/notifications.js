import Ember from 'ember';

export default Ember.Service.extend({
    delayedNotifications: Ember.A(),
    content: Ember.A(),

    alerts: Ember.computed.filter('content', function (notification) {
        var status = Ember.get(notification, 'status');
        return status === 'alert';
    }),

    notifications: Ember.computed.filter('content', function (notification) {
        var status = Ember.get(notification, 'status');
        return status === 'notification';
    }),

    handleNotification: function (message, delayed) {
        // If this is an alert message from the server, treat it as html safe
        if (typeof message.toJSON === 'function' && message.get('status') === 'alert') {
            message.set('message', message.get('message').htmlSafe());
        }

        if (!Ember.get(message, 'status')) {
            Ember.set(message, 'status', 'notification');
        }

        if (!delayed) {
            this.get('content').pushObject(message);
        } else {
            this.get('delayedNotifications').pushObject(message);
        }
    },

    showAlert: function (message, options) {
        options = options || {};

        this.handleNotification({
            message: message,
            status: 'alert',
            type: options.type
        }, options.delayed);
    },

    showNotification: function (message, options) {
        options = options || {};

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        this.handleNotification({
            message: message,
            status: 'notification',
            type: options.type
        }, options.delayed);
    },

    // TODO: review whether this can be removed once no longer used by validations
    showErrors: function (errors, options) {
        options = options || {};

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        for (var i = 0; i < errors.length; i += 1) {
            this.showNotification(errors[i].message || errors[i], {type: 'error', doNotCloseNotifications: true});
        }
    },

    showAPIError: function (resp, options) {
        options = options || {};
        options.type = options.type || 'error';

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        options.defaultErrorText = options.defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
            this.showAlert(resp.jqXHR.responseJSON.error, options);
        } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
            this.showErrors(resp.jqXHR.responseJSON.errors, options);
        } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.message) {
            this.showAlert(resp.jqXHR.responseJSON.message, options);
        } else {
            this.showAlert(options.defaultErrorText, {type: options.type, doNotCloseNotifications: true});
        }
    },

    displayDelayed: function () {
        var self = this;

        self.delayedNotifications.forEach(function (message) {
            self.get('content').pushObject(message);
        });
        self.delayedNotifications = [];
    },

    closeNotification: function (notification) {
        var content = this.get('content');

        if (typeof notification.toJSON === 'function') {
            notification.deleteRecord();
            notification.save().finally(function () {
                content.removeObject(notification);
            });
        } else {
            content.removeObject(notification);
        }
    },

    closeNotifications: function () {
        this.set('content', this.get('content').rejectBy('status', 'notification'));
    },

    closeAll: function () {
        this.get('content').clear();
    }
});
