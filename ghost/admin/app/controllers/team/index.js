/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {sort} from '@ember/object/computed';

export default Controller.extend({
    session: service(),

    init() {
        this._super(...arguments);
        this.inviteOrder = ['email'];
        this.userOrder = ['name', 'email'];
    },

    showInviteUserModal: false,

    activeUsers: null,
    suspendedUsers: null,
    invites: null,

    inviteOrder: null,
    userOrder: null,

    sortedInvites: sort('invites', 'inviteOrder'),
    sortedActiveUsers: sort('activeUsers', 'userOrder'),
    sortedSuspendedUsers: sort('suspendedUsers', 'userOrder'),

    actions: {
        toggleInviteUserModal() {
            this.toggleProperty('showInviteUserModal');
        }
    }
});
