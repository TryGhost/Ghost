import Ember from 'ember';

const {
    Controller,
    computed,
    inject: {service}
} = Ember;
const {alias, filter} = computed;

export default Controller.extend({

    showInviteUserModal: false,

    users: alias('model'),

    session: service(),

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
