import * as Sentry from '@sentry/ember';
import Service, {inject as service} from '@ember/service';
import {TrackedArray} from 'tracked-built-ins';
import {dasherize} from '@ember/string';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray} from '@ember/array';
import {isBlank} from '@ember/utils';
import {isHTMLSafe} from '@ember/template';
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
    'URIError',
    // ember-ajax errors - https://github.com/ember-cli/ember-ajax/blob/master/addon/errors.ts
    'AjaxError',
    'ServerError'
];

export const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred, please try again.';

// Plain strings that Ember code passes to showAlert/showAPIError must not be
// rendered as raw HTML on the React side — otherwise a server error like
// `errors[0].message = '<script>...</script>'` becomes XSS. Callers that
// intentionally include markup wrap their message in htmlSafe(); everything
// else gets entity-escaped here so the bridge payload is always safe HTML.
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}

/**
 * Notifications come in two shapes:
 *
 *   - status='alert'  → top-of-viewport banner. Owned by React: every alert is
 *     fire-and-forget through the state bridge into the React Query cache.
 *     Ember keeps no state for these.
 *
 *   - status='notification' → bottom-left corner toast. Still rendered by
 *     <GhNotifications/> from the local `content` array. No React equivalent
 *     yet, so Ember owns the storage.
 *
 * Public API (showAlert / showAPIError / showNotification / closeAlerts /
 * closeNotification / clearAll) is unchanged for the ~80 call sites.
 */
export default class NotificationsService extends Service {
    @service stateBridge;
    @service upgradeStatus;

    @inject config;

    @tracked delayedToasts = new TrackedArray([]);
    @tracked delayedAlerts = new TrackedArray([]);
    @tracked content = new TrackedArray([]);

    get notifications() {
        return this.content;
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

        if (!message.status) {
            message.status = 'notification';
        }

        if (message.status === 'alert') {
            // Escape plain strings before crossing the bridge so the React
            // banner can render everything through one path without having
            // to trust the source. Callers that intentionally pass markup
            // wrap their message in htmlSafe().
            const messageHtml = isHTMLSafe(message.message)
                ? message.message.toString()
                : escapeHtml(message.message);
            const alert = {
                id: message.id ?? crypto.randomUUID(),
                message: messageHtml,
                status: 'alert',
                type: message.type,
                key: message.key,
                description: message.description,
                icon: message.icon,
                actions: message.actions
            };

            if (delayed) {
                this.delayedAlerts.push(alert);
            } else {
                this.stateBridge.triggerAlertPush(alert);
            }
            return;
        }

        // status === 'notification' (toast). Owned by Ember.

        // close existing duplicate toasts to avoid stacking
        if (message.key) {
            this._removeToastsByKey(message.key);
        }

        // close existing toasts which have the same text to avoid stacking
        let newText = message.message.string || message.message;
        this.content = new TrackedArray(this.content.reject((toast) => {
            let existingText = toast.message.string || toast.message;
            return existingText === newText;
        }));

        if (!delayed) {
            this.content.push(message);
        } else {
            this.delayedToasts.push(message);
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

        if (
            resp?.name && GENERIC_ERROR_NAMES.includes(resp.name) ||
            resp?.constructor && GENERIC_ERROR_NAMES.includes(resp.constructor.name)
        ) {
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
        this.delayedToasts.forEach((toast) => {
            this.content.push(toast);
        });
        this.delayedToasts = new TrackedArray([]);

        this.delayedAlerts.forEach((alert) => {
            this.stateBridge.triggerAlertPush(alert);
        });
        this.delayedAlerts = new TrackedArray([]);
    }

    closeNotification(notification) {
        // Only toasts are stored in Ember. Alerts dismiss locally in React.
        this.content.removeObject(notification);
    }

    closeNotifications(key) {
        this._removeToastsByKey(key);
    }

    closeAlerts(key) {
        if (key) {
            this.stateBridge.triggerAlertsRemoveByKey(this._getKeyBase(key));
        } else {
            this.stateBridge.triggerAlertsClear();
        }
    }

    clearAll() {
        this.content = new TrackedArray([]);
        this.stateBridge.triggerAlertsClear();
    }

    _removeToastsByKey(key) {
        if (!key) {
            this.content = new TrackedArray(this.content.rejectBy('status', 'notification'));
            return;
        }
        let keyBase = this._getKeyBase(key);
        let escapedKeyBase = keyBase.replace('.', '\\.');
        let keyRegex = new RegExp(`^${escapedKeyBase}`);

        this.content = new TrackedArray(this.content.reject((toast) => {
            return toast.key && toast.key.match(keyRegex);
        }));
    }

    // take a key and return the first two elements, eg:
    // "invite.revoke.failed" => "invite.revoke"
    _getKeyBase(key) {
        return key.split('.').slice(0, 2).join('.');
    }
}
