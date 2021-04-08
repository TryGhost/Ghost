import ModalComponent from 'ghost-admin/components/modal-base';
import RSVP from 'rsvp';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {action} from '@ember/object';
import {A as emberA} from '@ember/array';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const {Promise} = RSVP;

export default ModalComponent.extend(ValidationEngine, {
    router: service(),
    notifications: service(),
    store: service(),
    limit: service(),

    classNames: 'modal-content invite-new-user',

    role: null,
    roles: null,

    limitErrorMessage: null,

    validationType: 'inviteUser',

    didInsertElement() {
        this._super(...arguments);
        this.fetchRoles.perform();
    },

    willDestroyElement() {
        this._super(...arguments);
        // TODO: this should not be needed, ValidationEngine acts as a
        // singleton and so it's errors and hasValidated state stick around
        this.errors.clear();
        this.set('hasValidated', emberA());
    },

    actions: {
        confirm() {
            this.sendInvitation.perform();
        }
    },

    setRole: action(function (roleName) {
        const role = this.roles.findBy('name', roleName);
        this.set('role', role);
        this.errors.remove('role');
        this.validateRole();
    }),

    async validateRole() {
        if (this.get('role.name') !== 'Contributor'
            && this.limit.limiter && this.limit.limiter.isLimited('staff')) {
            try {
                await this.limit.limiter.errorIfWouldGoOverLimit('staff');

                this.set('limitErrorMessage', null);
            } catch (error) {
                if (error.errorType === 'HostLimitError') {
                    this.set('limitErrorMessage', error.message);
                } else {
                    this.notifications.showAPIError(error, {key: 'staff.limit'});
                }
            }
        } else {
            this.set('limitErrorMessage', null);
        }
    },

    validate() {
        let email = this.email;

        // TODO: either the validator should check the email's existence or
        // the API should return an appropriate error when attempting to save
        return new Promise((resolve, reject) => this._super().then(() => RSVP.hash({
            users: this.store.findAll('user', {reload: true}),
            invites: this.store.findAll('invite', {reload: true})
        }).then((data) => {
            let existingUser = data.users.findBy('email', email);
            let existingInvite = data.invites.findBy('email', email);

            if (existingUser || existingInvite) {
                this.errors.clear('email');
                if (existingUser) {
                    this.errors.add('email', 'A user with that email address already exists.');
                } else {
                    this.errors.add('email', 'A user with that email address was already invited.');
                }

                // TODO: this shouldn't be needed, ValidationEngine doesn't mark
                // properties as validated when validating an entire object
                this.hasValidated.addObject('email');
                reject();
            } else {
                resolve();
            }
        }), () => {
            // TODO: this shouldn't be needed, ValidationEngine doesn't mark
            // properties as validated when validating an entire object
            this.hasValidated.addObject('email');
            reject();
        }));
    },

    fetchRoles: task(function * () {
        let roles = yield this.store.query('role', {permissions: 'assign'});
        let defaultRole = roles.findBy('name', 'Contributor');

        this.set('roles', roles);

        if (!this.role) {
            this.set('role', defaultRole);
        }
    }),

    sendInvitation: task(function* () {
        let email = this.email;
        let role = this.role;
        let notifications = this.notifications;
        let invite;

        try {
            yield this.validate();

            invite = this.store.createRecord('invite', {
                email,
                role
            });

            yield invite.save();

            // If sending the invitation email fails, the API will still return a status of 201
            // but the invite's status in the response object will be 'invited-pending'.
            if (invite.get('status') === 'pending') {
                notifications.showAlert('Invitation email was not sent', {type: 'error', key: 'invite.send.failed', description: 'Please try resending.'});
            } else {
                notifications.showNotification('Invitation sent', {icon: 'send-email', key: 'invite.send.success', description: `${email}`});
            }

            this.send('closeModal');
        } catch (error) {
            // validation will reject and cause this to be called with no error
            if (error) {
                invite.deleteRecord();
                notifications.showAPIError(error, {key: 'invite.send'});
                this.send('closeModal');
            }
        }
    }).drop(),

    transitionToBilling: task(function () {
        this.router.transitionTo('pro');

        this.send('closeModal');
    })
});
