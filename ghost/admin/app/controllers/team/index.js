import Controller from 'ember-controller';
import {alias, filter} from 'ember-computed';
import injectService from 'ember-service/inject';

export default Controller.extend({

    showInviteUserModal: false,

    users: alias('model'),

    session: injectService(),

    activeUsers: filter('users', function (user) {
        return /^active|warn-[1-4]|locked$/.test(user.get('status'));
    }),

    invitedUsers: filter('users', function (user) {
        let status = user.get('status');

        return status === 'invited' || status === 'invited-pending';
    }),

    actions: {
        toggleInviteUserModal() {
            this.toggleProperty('showInviteUserModal');
        }
    }
});
