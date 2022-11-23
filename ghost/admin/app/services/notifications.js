import * as Sentry from '@sentry/ember';
import Service, {inject as service} from '@ember/service';
import {TrackedArray} from 'tracked-built-ins';
import {dasherize} from '@ember/string';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray} from '@ember/array';
import {isBlank} from '@ember/utils';
import {
    isMaintenanceError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {tracked} from '@glimmer/tracking';

// Notification keys take the form of "noun.verb.message", eg:
//
// "invite.resend.api-error"
// "user.invite.already-invited"
//
// The "noun.verb" part will be used as the "key base" in duplicate checks
// to avoid stacking of multiple error messages whilst leaving enough
// specificity to re-use keys for i18n lookups

// Rather than showing raw JS error messages to users we want to show a generic one.
// This list is used to check obj.name in `showApiError(obj)` as the first line
// of defence, then at the lowest `handleNotification(msg)` level we check the
// first word of the message text as a fallback in case we get JS error messages
// from the API. If there's a match we show the generic message.
const GENERIC_ERROR_NAMES = [
    'AggregateError',
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError'
];

export const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred, please try again.';

export default class NotificationsService extends Service {
    @service upgradeStatus;

    @inject config;

    @tracked delayedNotifications = new TrackedArray([]);
    @tracked content = new TrackedArray([]);

    get alerts() {
        return this.content.filter(n => n.status === 'alert');
    }

    get notifications() {
        return this.content.filter(n => n.status === 'notification');
    }

    handleNotification(message, delayed = false) {
        const wordRegex = /[a-z]+/igm;
        const wordMatches = (message.message.string || message.message).matchAll(wordRegex);

        for (const wordMatch of wordMatches) {
            if (GENERIC_ERROR_NAMES.includes(wordMatch[0])) {
                message.message = GENERIC_ERROR_MESSAGE;
                break;
            }
        }

        // If this is an alert message from the server, treat it as html safe
        if (message.constructor.modelName === 'notification' && message.status === 'alert') {
            message.message = htmlSafe(message.message);
        }

        if (!message.status) {
            message.status = 'notification';
        }

        // close existing duplicate alerts/notifications to avoid stacking
        if (message.key) {
            this._removeItems(message.status, message.key);
        }

        // close existing alerts/notifications which have the same text to avoid stacking
        let newText = message.message.string || message.message;
        this.content = new TrackedArray(this.content.reject((notification) => {
            let existingText = notification.message.string || notification.message;
            return existingText === newText;
        }));

        if (!delayed) {
            this.content.push(message);
        } else {
            this.delayedNotifications.push(message);
        }
    }

    showAlert(message, options = {}) {
        options = options || {};

        if (!options.isApiError && (!options.type || options.type === 'error')) {
            if (this.config.sentry_dsn) {
                // message could be a htmlSafe object rather than a string
                const displayedMessage = message.string || message;

                const contexts = {
                    ghost: {
                        displayed_message: displayedMessage,
                        ghost_error_code: options.ghostErrorCode,
                        full_error: message
                    }
                };

                Sentry.captureMessage(displayedMessage, {
                    contexts,
                    tags: {
                        shown_to_user: true,
                        source: 'showAlert'
                    }
                });
            }
        }

        this.handleNotification({
            message,
            status: 'alert',
            description: options.description,
            icon: options.icon,
            type: options.type,
            key: options.key,
            actions: options.actions
        }, options.delayed);
    }

    showNotification(message, options) {
        options = options || {};

        this.handleNotification({
            message,
            status: 'notification',
            description: options.description,
            icon: options.icon,
            type: options.type,
            key: options.key,
            actions: options.actions
        }, options.delayed);
    }

    showAPIError(resp, options) {
        // handle "global" errors
        if (isVersionMismatchError(resp)) {
            return this.upgradeStatus.requireUpgrade();
        } else if (isMaintenanceError(resp)) {
            return this.upgradeStatus.maintenanceAlert();
        }

        // loop over ember-ajax errors object
        if (isArray(resp?.payload?.errors)) {
            return resp.payload.errors.forEach((error) => {
                this._showAPIError(error, options);
            });
        }

        this._showAPIError(resp, options);
    }

    _showAPIError(resp, options) {
        options = options || {};
        options.type = options.type || 'error';

        // if possible use the title to get a unique key
        // - we only show one alert for each key so if we get multiple errors
        //   only the last one will be shown
        if (!options.key && !isBlank(resp?.title)) {
            options.key = dasherize(resp?.title);
        }
        options.key = ['api-error', options.key].compact().join('.');

        let msg = options.defaultErrorText || GENERIC_ERROR_MESSAGE;

        if (resp?.name && GENERIC_ERROR_NAMES.includes(resp.name)) {
            msg = GENERIC_ERROR_MESSAGE;
        } else if (resp instanceof String) {
            msg = resp;
        } else if (!isBlank(resp?.message)) {
            msg = resp.message;
        }

        if (!isBlank(resp?.context) && resp?.context !== msg) {
            msg = `${msg} ${resp.context}`;
        }

        if (this.config.sentry_dsn) {
            const reportedError = resp instanceof Error ? resp : msg;

            Sentry.captureException(reportedError, {
                contexts: {
                    ghost: {
                        ghost_error_code: resp.ghostErrorCode,
                        displayed_message: msg,
                        full_error: resp
                    }
                },
                tags: {
                    shown_to_user: true,
                    source: 'showAPIError'
                }
            });
        }

        options.isApiError = true;

        this.showAlert(msg, options);
    }

    displayDelayed() {
        this.delayedNotifications.forEach((message) => {
            this.content.push(message);
        });
        this.delayedNotifications = new TrackedArray([]);
    }

    closeNotification(notification) {
        let content = this.content;

        if (notification.constructor.modelName === 'notification') {
            notification.deleteRecord();
            notification.save().finally(() => {
                content.removeObject(notification);
            });
        } else {
            content.removeObject(notification);
        }
    }

    closeNotifications(key) {
        this._removeItems('notification', key);
    }

    closeAlerts(key) {
        this._removeItems('alert', key);
    }

    clearAll() {
        this.content = new TrackedArray([]);
    }

    _removeItems(status, key) {
        if (key) {
            let keyBase = this._getKeyBase(key);
            // TODO: keys should only have . special char but we should
            // probably use a better regexp escaping function/polyfill
            let escapedKeyBase = keyBase.replace('.', '\\.');
            let keyRegex = new RegExp(`^${escapedKeyBase}`);

            this.content = new TrackedArray(this.content.reject((item) => {
                let itemKey = item.key;
                let itemStatus = item.status;

                return itemStatus === status && (itemKey && itemKey.match(keyRegex));
            }));
        } else {
            this.content = new TrackedArray(this.content.rejectBy('status', status));
        }
    }

    // take a key and return the first two elements, eg:
    // "invite.revoke.failed" => "invite.revoke"
    _getKeyBase(key) {
        return key.split('.').slice(0, 2).join('.');
    }
}
