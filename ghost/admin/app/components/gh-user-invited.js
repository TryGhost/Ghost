import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {isNotFoundError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhUserInvited extends Component {
    @service notifications;
    @service store;

    @tracked isSending = false;

    get createdAt() {
        const createdAtUTC = this.args.invite.createdAtUTC;
        return createdAtUTC ? moment(createdAtUTC).fromNow() : '';
    }

    get expiresAt() {
        const expires = this.args.invite.expires;
        return expires ? moment(expires).fromNow() : '';
    }

    get isExpired() {
        const expires = this.args.invite.expires;
        const now = (new Date()).valueOf();
        return expires < now;
    }

    @action
    resend(event) {
        event?.preventDefault();

        const invite = this.args.invite;
        const notifications = this.notifications;

        this.isSending = true;
        invite.resend().then((result) => {
            const notificationText = `Invitation resent! (${invite.email})`;

            // the server deletes the old record and creates a new one when
            // resending so we need to update the store accordingly
            invite.unloadRecord();
            this.store.pushPayload('invite', result);

            // If sending the invitation email fails, the API will still return a status of 201
            // but the invite's status in the response object will be 'invited-pending'.
            if (result.invites[0].status === 'invited-pending') {
                notifications.showAlert('Invitation email was not sent.  Please try resending.', {type: 'error', key: 'invite.resend.not-sent'});
            } else {
                notifications.showNotification(notificationText, {icon: 'send-email', key: 'invite.resend.success'});
            }
        }).catch((error) => {
            notifications.showAPIError(error, {key: 'invite.resend'});
        }).finally(() => {
            this.isSending = false;
        });
    }

    @action
    revoke(event) {
        event?.preventDefault();

        const invite = this.args.invite;
        const email = invite.email;
        const notifications = this.notifications;

        // reload the invite to get the most up-to-date information
        invite.reload().then(() => {
            invite.destroyRecord().then(() => {
                notifications.showNotification('Invitation revoked', {key: 'invite.revoke.success', description: `${email}`});
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'invite.revoke'});
            });
        }).catch((error) => {
            if (isNotFoundError(error)) {
                this.args.reload?.();
                notifications.showAlert('This invite has been revoked or a user has already accepted the invitation.', {type: 'error', delayed: true, key: 'invite.revoke.already-accepted'});
            } else {
                throw error;
            }
        });
    }
}
