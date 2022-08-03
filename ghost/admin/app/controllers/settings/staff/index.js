import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {alias, filterBy, sort} from '@ember/object/computed';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import RSVP from 'rsvp';
import {task} from 'ember-concurrency';

@classic
export default class IndexController extends Controller {
    @service session;
    @service store;

    showInviteUserModal = false;
    showResetAllPasswordsModal = false;
    inviteOrder = null;
    userOrder = null;

    init() {
        super.init(...arguments);
        this.inviteOrder = ['email'];
        this.userOrder = ['name', 'email'];
    }

    @alias('model')
        currentUser;

    @sort('filteredInvites', 'inviteOrder')
        sortedInvites;

    @sort('activeUsers', 'userOrder')
        sortedActiveUsers;

    @sort('suspendedUsers', 'userOrder')
        sortedSuspendedUsers;

    @filterBy('invites', 'isNew', false)
        filteredInvites;

    @computed
    get invites() {
        return this.store.peekAll('invite');
    }

    @computed
    get allUsers() {
        return this.store.peekAll('user');
    }

    @computed('allUsers.@each.status')
    get activeUsers() {
        return this.allUsers.filter((user) => {
            return user.status !== 'inactive';
        });
    }

    @computed('allUsers.@each.status')
    get suspendedUsers() {
        return this.allUsers.filter((user) => {
            return user.status === 'inactive';
        });
    }

    @action
    toggleInviteUserModal() {
        this.toggleProperty('showInviteUserModal');
    }

    @action
    toggleResetAllPasswordsModal() {
        this.toggleProperty('showResetAllPasswordsModal');
    }

    @task(function* () {
        let users = this.fetchUsers.perform();
        let invites = this.fetchInvites.perform();

        try {
            yield RSVP.all([users, invites]);
        } catch (error) {
            this.send('error', error);
        }
    })
        backgroundUpdate;

    @task(function* () {
        yield this.store.query('user', {limit: 'all'});
    })
        fetchUsers;

    @task(function* () {
        if (this.currentUser.isAuthorOrContributor) {
            return;
        }

        // ensure roles are loaded before invites. Invites do not have embedded
        // role records which means Ember Data will throw errors when trying to
        // read the invite.role data when the role has not yet been loaded
        yield this.store.query('role', {limit: 'all'});

        return yield this.store.query('invite', {limit: 'all'});
    })
        fetchInvites;
}
