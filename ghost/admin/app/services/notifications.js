import Service from 'ember-service';
import {filter} from 'ember-computed';
import {A as emberA, isEmberArray} from 'ember-array/utils';
import get from 'ember-metal/get';
import set from 'ember-metal/set';
import injectService from 'ember-service/inject';
import {isBlank} from 'ember-utils';
import {dasherize} from 'ember-string';
import {
    isMaintenanceError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';

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

    upgradeStatus: injectService(),

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

    showAPIError(resp, options) {
        // handle "global" errors
        if (isVersionMismatchError(resp)) {
            return this.get('upgradeStatus').requireUpgrade();
        } else if (isMaintenanceError(resp)) {
            return this.get('upgradeStatus').maintenanceAlert();
        }

        // loop over Ember Data / ember-ajax errors object
        if (resp && isEmberArray(resp.errors)) {
            return resp.errors.forEach((error) => {
                this._showAPIError(error, options);
            });
        }

        this._showAPIError(resp, options);
    },

    _showAPIError(resp, options) {
        options = options || {};
        options.type = options.type || 'error';

        // if possible use the title to get a unique key
        // - we only show one alert for each key so if we get multiple errors
        //   only the last one will be shown
        if (!options.key && !isBlank(get(resp, 'title'))) {
            options.key = dasherize(get(resp, 'title'));
        }
        options.key = ['api-error', options.key].compact().join('.');

        let msg = options.defaultErrorText || 'There was a problem on the server, please try again.';

        if (resp instanceof String) {
            msg = resp;
        } else if (!isBlank(get(resp, 'detail'))) {
            msg = resp.detail;
        } else if (!isBlank(get(resp, 'message'))) {
            msg = resp.message;
        }

        this.showAlert(msg, options);
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
