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

    classNames: 'modal-content invite-new-user',

    role: null,
    limitErrorMessage: null,

    validationType: 'inviteUser',

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
        },

        roleValidationFailed(reason) {
            this.set('limitErrorMessage', reason);
        },

        roleValidationSucceeded() {
            this.set('limitErrorMessage', null);
        }
    },

    setRole: action(function (role) {
        this.set('role', role);
        this.errors.remove('role');
    }),

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
