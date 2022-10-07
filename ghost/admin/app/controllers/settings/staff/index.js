import Controller from '@ember/controller';
import RSVP from 'rsvp';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class IndexController extends Controller {
    @service session;
    @service store;

    @tracked showInviteUserModal = false;
    @tracked showResetAllPasswordsModal = false;

    inviteOrder = ['email'];
    userOrder = ['name', 'email'];

    allInvites = this.store.peekAll('invite');
    allUsers = this.store.peekAll('user');

    get currentUser() {
        return this.model;
    }

    get invites() {
        return this.allInvites
            .filter(i => !i.isNew)
            .sortBy(...this.inviteOrder);
    }

    get activeUsers() {
        return this.allUsers
            .filter(u => u.status !== 'inactive')
            .sortBy(...this.userOrder);
    }

    get suspendedUsers() {
        return this.allUsers
            .filter(u => u.status === 'inactive')
            .sortBy(...this.userOrder);
    }

    @action
    toggleInviteUserModal() {
        this.showInviteUserModal = !this.showInviteUserModal;
    }

    @action
    toggleResetAllPasswordsModal() {
        this.showResetAllPasswordsModal = !this.showResetAllPasswordsModal;
    }

    @task
    *backgroundUpdateTask() {
        let users = this.fetchUsersTask.perform();
        let invites = this.fetchInvitesTask.perform();

        try {
            yield RSVP.all([users, invites]);
        } catch (error) {
            this.send('error', error);
        }
    }

    @task
    *fetchUsersTask() {
        yield this.store.query('user', {limit: 'all'});
    }

    @task
    *fetchInvitesTask() {
        if (this.currentUser.isAuthorOrContributor) {
            return;
        }

        // ensure roles are loaded before invites. Invites do not have embedded
        // role records which means Ember Data will throw errors when trying to
        // read the invite.role data when the role has not yet been loaded
        yield this.store.query('role', {limit: 'all'});

        return yield this.store.query('invite', {limit: 'all'});
    }
}
