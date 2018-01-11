import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {isNotFoundError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';

export default Component.extend({
    notifications: service(),
    store: service(),

    tagName: '',

    invite: null,
    isSending: false,

    createdAt: computed('invite.createdAtUTC', function () {
        let createdAtUTC = this.get('invite.createdAtUTC');

        return createdAtUTC ? moment(createdAtUTC).fromNow() : '';
    }),

    expiresAt: computed('invite.expires', function () {
        let expires = this.get('invite.expires');

        return expires ? moment(expires).fromNow() : '';
    }),

    isExpired: computed('invite.expires', function () {
        let expires = this.get('invite.expires');
        let now = (new Date()).valueOf();

        return expires < now;
    }),

    actions: {
        resend() {
            let invite = this.get('invite');
            let notifications = this.get('notifications');

            this.set('isSending', true);
            invite.resend().then((result) => {
                let notificationText = `Invitation resent! (${invite.get('email')})`;

                // the server deletes the old record and creates a new one when
                // resending so we need to update the store accordingly
                invite.unloadRecord();
                this.get('store').pushPayload('invite', result);

                // If sending the invitation email fails, the API will still return a status of 201
                // but the invite's status in the response object will be 'invited-pending'.
                if (result.invites[0].status === 'invited-pending') {
                    notifications.showAlert('Invitation email was not sent.  Please try resending.', {type: 'error', key: 'invite.resend.not-sent'});
                } else {
                    notifications.showNotification(notificationText, {key: 'invite.resend.success'});
                }
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'invite.resend'});
            }).finally(() => {
                this.set('isSending', false);
            });
        },

        revoke() {
            let invite = this.get('invite');
            let email = invite.get('email');
            let notifications = this.get('notifications');

            // reload the invite to get the most up-to-date information
            invite.reload().then(() => {
                invite.destroyRecord().then(() => {
                    let notificationText = `Invitation revoked. (${email})`;
                    notifications.showNotification(notificationText, {key: 'invite.revoke.success'});
                }).catch((error) => {
                    notifications.showAPIError(error, {key: 'invite.revoke'});
                });
            }).catch((error) => {
                if (isNotFoundError(error)) {
                    // if the invite no longer exists, then show a warning and reload the route
                    let action = this.get('reload');
                    if (action) {
                        action();
                    }

                    notifications.showAlert('This invite has been revoked or a user has already accepted the invitation.', {type: 'error', delayed: true, key: 'invite.revoke.already-accepted'});
                } else {
                    throw error;
                }
            });
        }
    }
});
