import Ember from 'ember';
import {AjaxError} from 'ember-ajax/errors';

const {
    Service,
    computed: {filter},
    get,
    set,
    isArray
} = Ember;
const emberA = Ember.A;

// Notification keys take the form of "noun.verb.message", eg:
//
// "invite.resend.api-error"
// "user.invite.already-invited"
//
// The "noun.verb" part will be used as the "key base" in duplicate checks
// to avoid stacking of multiple error messages whilst leaving enough
// specificity to re-use keys for i18n lookups

export default Service.extend({
    delayedNotifications: emberA(),
    content: emberA(),

    alerts: filter('content', function (notification) {
        let status = get(notification, 'status');
        return status === 'alert';
    }),

    notifications: filter('content', function (notification) {
        let status = get(notification, 'status');
        return status === 'notification';
    }),

    handleNotification(message, delayed) {
        // If this is an alert message from the server, treat it as html safe
        if (typeof message.toJSON === 'function' && message.get('status') === 'alert') {
            message.set('message', message.get('message').htmlSafe());
        }

        if (!get(message, 'status')) {
            set(message, 'status', 'notification');
        }

        // close existing duplicate alerts/notifications to avoid stacking
        if (get(message, 'key')) {
            this._removeItems(get(message, 'status'), get(message, 'key'));
        }

        if (!delayed) {
            this.get('content').pushObject(message);
        } else {
            this.get('delayedNotifications').pushObject(message);
        }
    },

    showAlert(message, options) {
        options = options || {};

        this.handleNotification({
            message,
            status: 'alert',
            type: options.type,
            key: options.key
        }, options.delayed);
    },

    showNotification(message, options) {
        options = options || {};

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        } else {
            // TODO: this should be removed along with showErrors
            options.key = undefined;
        }

        this.handleNotification({
            message,
            status: 'notification',
            type: options.type,
            key: options.key
        }, options.delayed);
    },

    // TODO: review whether this can be removed once no longer used by validations
    showErrors(errors, options) {
        options = options || {};
        options.type = options.type || 'error';
        // TODO: getting keys from the server would be useful here (necessary for i18n)
        options.key = (options.key && `${options.key}.api-error`) || 'api-error';

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        // ensure all errors that are passed in get shown
        options.doNotCloseNotifications = true;

        for (let i = 0; i < errors.length; i += 1) {
            this.showNotification(errors[i].message || errors[i], options);
        }
    },

    showAPIError(resp, options) {
        options = options || {};
        options.type = options.type || 'error';
        // TODO: getting keys from the server would be useful here (necessary for i18n)
        options.key = (options.key && `${options.key}.api-error`) || 'api-error';

        if (!options.doNotCloseNotifications) {
            this.closeNotifications();
        }

        options.defaultErrorText = options.defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp instanceof AjaxError) {
            resp = resp.errors;
        }

        if (resp && isArray(resp) && resp.length) { // Array of errors
            this.showErrors(resp, options);
        } else if (resp && resp.detail) { // ember-ajax provided error message
            this.showAlert(resp.detail, options);
        } else { // text error or no error
            this.showAlert(resp || options.defaultErrorText, options);
        }
    },

    displayDelayed() {
        this.delayedNotifications.forEach((message) => {
            this.get('content').pushObject(message);
        });
        this.delayedNotifications = [];
    },

    closeNotification(notification) {
        let content = this.get('content');

        if (typeof notification.toJSON === 'function') {
            notification.deleteRecord();
            notification.save().finally(() => {
                content.removeObject(notification);
            });
        } else {
            content.removeObject(notification);
        }
    },

    closeNotifications(key) {
        this._removeItems('notification', key);
    },

    closeAlerts(key) {
        this._removeItems('alert', key);
    },

    clearAll() {
        this.get('content').clear();
    },

    _removeItems(status, key) {
        if (key) {
            let keyBase = this._getKeyBase(key);
            // TODO: keys should only have . special char but we should
            // probably use a better regexp escaping function/polyfill
            let escapedKeyBase = keyBase.replace('.', '\\.');
            let keyRegex = new RegExp(`^${escapedKeyBase}`);

            this.set('content', this.get('content').reject((item) => {
                let itemKey = get(item, 'key');
                let itemStatus = get(item, 'status');

                return itemStatus === status && (itemKey && itemKey.match(keyRegex));
            }));
        } else {
            this.set('content', this.get('content').rejectBy('status', status));
        }
    },

    // take a key and return the first two elements, eg:
    // "invite.revoke.failed" => "invite.revoke"
    _getKeyBase(key) {
        return key.split('.').slice(0, 2).join('.');
    }
});
