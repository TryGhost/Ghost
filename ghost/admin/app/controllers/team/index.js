import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import {sort} from 'ember-computed';

export default Controller.extend({

    showInviteUserModal: false,

    users: null,
    invites: null,

    session: injectService(),

    inviteOrder: ['email'],
    sortedInvites: sort('invites', 'inviteOrder'),

    actions: {
        toggleInviteUserModal() {
            this.toggleProperty('showInviteUserModal');
        }
    }
});
