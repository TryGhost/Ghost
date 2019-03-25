import Service, {inject as service} from '@ember/service';
import {dasherize, htmlSafe} from '@ember/string';
import {A as emberA, isArray as isEmberArray} from '@ember/array';
import {filter} from '@ember/object/computed';
import {get, set} from '@ember/object';
import {isBlank} from '@ember/utils';
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
    delayedNotifications: null,
    content: null,

    init() {
        this._super(...arguments);
        this.delayedNotifications = emberA();
        this.content = emberA();
    },

    upgradeStatus: service(),

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
            message.set('message', htmlSafe(message.get('message')));
        }

        if (!get(message, 'status')) {
            set(message, 'status', 'notification');
        }

        // close existing duplicate alerts/notifications to avoid stacking
        if (get(message, 'key')) {
            this._removeItems(get(message, 'status'), get(message, 'key'));
        }

        // close existing alerts/notifications which have the same text to avoid stacking
        let newText = get(message, 'message').string || get(message, 'message');
        this.set('content', this.content.reject((notification) => {
            let existingText = get(notification, 'message').string || get(notification, 'message');
            return existingText === newText;
        }));

        if (!delayed) {
            this.content.pushObject(message);
        } else {
            this.delayedNotifications.pushObject(message);
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
            return this.upgradeStatus.requireUpgrade();
        } else if (isMaintenanceError(resp)) {
            return this.upgradeStatus.maintenanceAlert();
        }

        // loop over ember-ajax errors object
        if (resp && resp.payload && isEmberArray(resp.payload.errors)) {
            return resp.payload.errors.forEach((error) => {
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

        if (!isBlank(get(resp, 'context'))) {
            msg = `${msg} ${get(resp, 'context')}`;
        }

        this.showAlert(msg, options);
    },

    displayDelayed() {
        this.delayedNotifications.forEach((message) => {
            this.content.pushObject(message);
        });
        this.set('delayedNotifications', []);
    },

    closeNotification(notification) {
        let content = this.content;

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
        this.content.clear();
    },

    _removeItems(status, key) {
        if (key) {
            let keyBase = this._getKeyBase(key);
            // TODO: keys should only have . special char but we should
            // probably use a better regexp escaping function/polyfill
            let escapedKeyBase = keyBase.replace('.', '\\.');
            let keyRegex = new RegExp(`^${escapedKeyBase}`);

            this.set('content', this.content.reject((item) => {
                let itemKey = get(item, 'key');
                let itemStatus = get(item, 'status');

                return itemStatus === status && (itemKey && itemKey.match(keyRegex));
            }));
        } else {
            this.set('content', this.content.rejectBy('status', status));
        }
    },

    // take a key and return the first two elements, eg:
    // "invite.revoke.failed" => "invite.revoke"
    _getKeyBase(key) {
        return key.split('.').slice(0, 2).join('.');
    }
});
