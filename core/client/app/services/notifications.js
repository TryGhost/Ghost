import Ember from 'ember';

// Notification keys take the form of "noun.verb.message", eg:
//
// "invite.resend.api-error"
// "user.invite.already-invited"
//
// The "noun.verb" part will be used as the "key base" in duplicate checks
// to avoid stacking of multiple error messages whilst leaving enough
// specificity to re-use keys for i18n lookups

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

        // close existing duplicate alerts/notifications to avoid stacking
        if (Ember.get(message, 'key')) {
            this._removeItems(Ember.get(message, 'status'), Ember.get(message, 'key'));
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
            type: options.type,
            key: options.key
        }, options.delayed);
    },

    showNotification: function (message, options) {
        options = options || {};

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        } else {
            // TODO: this should be removed along with showErrors
            options.key = undefined;
        }

        this.handleNotification({
            message: message,
            status: 'notification',
            type: options.type,
            key: options.key
        }, options.delayed);
    },

    // TODO: review whether this can be removed once no longer used by validations
    showErrors: function (errors, options) {
        options = options || {};
        options.type = options.type || 'error';
        // TODO: getting keys from the server would be useful here (necessary for i18n)
        options.key = (options.key && `${options.key}.api-error`) || 'api-error';

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        // ensure all errors that are passed in get shown
        options.doNotCloseNotifications = true;

        for (var i = 0; i < errors.length; i += 1) {
            this.showNotification(errors[i].message || errors[i], options);
        }
    },

    showAPIError: function (resp, options) {
        options = options || {};
        options.type = options.type || 'error';
        // TODO: getting keys from the server would be useful here (necessary for i18n)
        options.key = (options.key && `${options.key}.api-error`) || 'api-error';

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
            this.showAlert(options.defaultErrorText, options);
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

    closeNotifications: function (key) {
        this._removeItems('notification', key);
    },

    closeAlerts: function (key) {
        this._removeItems('alert', key);
    },

    clearAll: function () {
        this.get('content').clear();
    },

    _removeItems: function (status, key) {
        if (key) {
            let keyBase = this._getKeyBase(key),
                // TODO: keys should only have . special char but we should
                // probably use a better regexp escaping function/polyfill
                escapedKeyBase = keyBase.replace('.', '\\.'),
                keyRegex = new RegExp(`^${escapedKeyBase}`);

            this.set('content', this.get('content').reject(function (item) {
                let itemKey = Ember.get(item, 'key'),
                    itemStatus = Ember.get(item, 'status');

                return itemStatus === status && (itemKey && itemKey.match(keyRegex));
            }));
        } else {
            this.set('content', this.get('content').rejectBy('status', status));
        }
    },

    // take a key and return the first two elements, eg:
    // "invite.revoke.failed" => "invite.revoke"
    _getKeyBase: function (key) {
        return key.split('.').slice(0, 2).join('.');
    }
});
