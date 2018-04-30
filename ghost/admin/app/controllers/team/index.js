/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {sort} from '@ember/object/computed';

export default Controller.extend({
    session: service(),

    showInviteUserModal: false,

    activeUsers: null,
    suspendedUsers: null,
    invites: null,

    inviteOrder: null,
    userOrder: null,

    init() {
        this._super(...arguments);
        this.inviteOrder = ['email'];
        this.userOrder = ['name', 'email'];
    },

    sortedInvites: sort('filteredInvites', 'inviteOrder'),
    sortedActiveUsers: sort('activeUsers', 'userOrder'),
    sortedSuspendedUsers: sort('suspendedUsers', 'userOrder'),

    filteredInvites: computed('invites.@each.isNew', function () {
        return this.get('invites').filterBy('isNew', false);
    }),

    actions: {
        toggleInviteUserModal() {
            this.toggleProperty('showInviteUserModal');
        }
    }
});
