/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import RSVP from 'rsvp';
import {alias, sort} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    session: service(),
    store: service(),

    showInviteUserModal: false,

    inviteOrder: null,
    userOrder: null,

    init() {
        this._super(...arguments);
        this.inviteOrder = ['email'];
        this.userOrder = ['name', 'email'];
    },

    currentUser: alias('model'),

    sortedInvites: sort('filteredInvites', 'inviteOrder'),
    sortedActiveUsers: sort('activeUsers', 'userOrder'),
    sortedSuspendedUsers: sort('suspendedUsers', 'userOrder'),

    invites: computed(function () {
        return this.store.peekAll('invite');
    }),

    filteredInvites: computed('invites.@each.isNew', function () {
        return this.invites.filterBy('isNew', false);
    }),

    allUsers: computed(function () {
        return this.store.peekAll('user');
    }),

    activeUsers: computed('allUsers.@each.status', function () {
        return this.allUsers.filter((user) => {
            return user.status !== 'inactive';
        });
    }),

    suspendedUsers: computed('allUsers.@each.status', function () {
        return this.allUsers.filter((user) => {
            return user.status === 'inactive';
        });
    }),

    actions: {
        toggleInviteUserModal() {
            this.toggleProperty('showInviteUserModal');
        }
    },

    backgroundUpdate: task(function* () {
        let users = this.fetchUsers.perform();
        let invites = this.fetchInvites.perform();

        try {
            yield RSVP.all([users, invites]);
        } catch (error) {
            this.send('error', error);
        }
    }),

    fetchUsers: task(function* () {
        yield this.store.query('user', {limit: 'all'});
    }),

    fetchInvites: task(function* () {
        if (this.currentUser.isAuthorOrContributor) {
            return;
        }

        // ensure roles are loaded before invites. Invites do not have embedded
        // role records which means Ember Data will try to fetch the roles
        // automatically when invite.role is queried, loading roles first makes
        // them available in memory and cuts down on network noise
        let knownRoles = this.store.peekAll('role');
        if (knownRoles.length <= 1) {
            yield this.store.query('role', {limit: 'all'});
        }

        return yield this.store.query('invite', {limit: 'all'});
    })
});
