import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: '',

    user: null,
    isSending: false,

    notifications: service(),

    createdAt: computed('user.createdAt', function () {
        let createdAt = this.get('user.createdAt');

        return createdAt ? createdAt.fromNow() : '';
    }),

    actions: {
        resend() {
            let user = this.get('user');
            let notifications = this.get('notifications');

            this.set('isSending', true);
            user.resendInvite().then((result) => {
                let notificationText = `Invitation resent! (${user.get('email')})`;

                // If sending the invitation email fails, the API will still return a status of 201
                // but the user's status in the response object will be 'invited-pending'.
                if (result.users[0].status === 'invited-pending') {
                    notifications.showAlert('Invitation email was not sent.  Please try resending.', {type: 'error', key: 'invite.resend.not-sent'});
                } else {
                    user.set('status', result.users[0].status);
                    notifications.showNotification(notificationText, {key: 'invite.resend.success'});
                }
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'invite.resend'});
            }).finally(() => {
                this.set('isSending', false);
            });
        },

        revoke() {
            let user = this.get('user');
            let email = user.get('email');
            let notifications = this.get('notifications');

            // reload the user to get the most up-to-date information
            user.reload().then(() => {
                if (user.get('invited')) {
                    user.destroyRecord().then(() => {
                        let notificationText = `Invitation revoked. (${email})`;
                        notifications.showNotification(notificationText, {key: 'invite.revoke.success'});
                    }).catch((error) => {
                        notifications.showAPIError(error, {key: 'invite.revoke'});
                    });
                } else {
                    // if the user is no longer marked as "invited", then show a warning and reload the route
                    this.sendAction('reload');
                    notifications.showAlert('This user has already accepted the invitation.', {type: 'error', delayed: true, key: 'invite.revoke.already-accepted'});
                }
            });
        }
    }
});
