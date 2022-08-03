import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import moment from 'moment';
import {action, computed} from '@ember/object';
import {isNotFoundError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhUserInvited extends Component {
    @service notifications;
    @service store;

    invite = null;
    isSending = false;

    @computed('invite.createdAtUTC')
    get createdAt() {
        let createdAtUTC = this.get('invite.createdAtUTC');

        return createdAtUTC ? moment(createdAtUTC).fromNow() : '';
    }

    @computed('invite.expires')
    get expiresAt() {
        let expires = this.get('invite.expires');

        return expires ? moment(expires).fromNow() : '';
    }

    @computed('invite.expires')
    get isExpired() {
        let expires = this.get('invite.expires');
        let now = (new Date()).valueOf();

        return expires < now;
    }

    @action
    resend() {
        let invite = this.invite;
        let notifications = this.notifications;

        this.set('isSending', true);
        invite.resend().then((result) => {
            let notificationText = `Invitation resent! (${invite.get('email')})`;

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
            this.set('isSending', false);
        });
    }

    @action
    revoke() {
        let invite = this.invite;
        let email = invite.get('email');
        let notifications = this.notifications;

        // reload the invite to get the most up-to-date information
        invite.reload().then(() => {
            invite.destroyRecord().then(() => {
                notifications.showNotification('Invitation revoked', {key: 'invite.revoke.success', description: `${email}`});
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'invite.revoke'});
            });
        }).catch((error) => {
            if (isNotFoundError(error)) {
                // if the invite no longer exists, then show a warning and reload the route
                let reloadAction = this.reload;
                if (reloadAction) {
                    reloadAction();
                }

                notifications.showAlert('This invite has been revoked or a user has already accepted the invitation.', {type: 'error', delayed: true, key: 'invite.revoke.already-accepted'});
            } else {
                throw error;
            }
        });
    }
}
