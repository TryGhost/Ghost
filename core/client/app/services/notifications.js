import Ember from 'ember';
import Notification from 'ghost/models/notification';

export default Ember.Service.extend({
    delayedNotifications: Ember.A(),
    content: Ember.A(),
    timeout: 3000,

    pushObject: function (object) {
        // object can be either a DS.Model or a plain JS object, so when working with
        // it, we need to handle both cases.

        // make sure notifications have all the necessary properties set.
        if (typeof object.toJSON === 'function') {
            // working with a DS.Model

            if (object.get('location') === '') {
                object.set('location', 'bottom');
            }
        } else {
            if (!object.location) {
                object.location = 'bottom';
            }
        }

        this._super(object);
    },

    handleNotification: function (message, delayed) {
        if (typeof message.toJSON === 'function') {
            // If this is a persistent message from the server, treat it as html safe
            if (message.get('status') === 'persistent') {
                message.set('message', message.get('message').htmlSafe());
            }

            if (!message.get('status')) {
                message.set('status', 'passive');
            }
        } else {
            if (!message.status) {
                message.status = 'passive';
            }
        }

        if (!delayed) {
            this.get('content').pushObject(message);
        } else {
            this.delayedNotifications.pushObject(message);
        }
    },

    showError: function (message, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        this.handleNotification({
            type: 'error',
            message: message
        }, options.delayed);
    },

    showErrors: function (errors, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        for (var i = 0; i < errors.length; i += 1) {
            this.showError(errors[i].message || errors[i], {doNotClosePassive: true});
        }
    },

    showAPIError: function (resp, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        options.defaultErrorText = options.defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
            this.showError(resp.jqXHR.responseJSON.error, options);
        } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
            this.showErrors(resp.jqXHR.responseJSON.errors, options);
        } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.message) {
            this.showError(resp.jqXHR.responseJSON.message, options);
        } else {
            this.showError(options.defaultErrorText, {doNotClosePassive: true});
        }
    },

    showInfo: function (message, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        this.handleNotification({
            type: 'info',
            message: message
        }, options.delayed);
    },

    showSuccess: function (message, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        this.handleNotification({
            type: 'success',
            message: message
        }, options.delayed);
    },

    showWarn: function (message, options) {
        options = options || {};

        if (!options.doNotClosePassive) {
            this.closePassive();
        }

        this.handleNotification({
            type: 'warn',
            message: message
        }, options.delayed);
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

        if (notification instanceof Notification) {
            notification.deleteRecord();
            notification.save().finally(function () {
                content.removeObject(notification);
            });
        } else {
            content.removeObject(notification);
        }
    },

    closePassive: function () {
        this.set('content', this.get('content').rejectBy('status', 'passive'));
    },

    closePersistent: function () {
        this.set('content', this.get('content').rejectBy('status', 'persistent'));
    },

    closeAll: function () {
        this.get('content').clear();
    }
});
