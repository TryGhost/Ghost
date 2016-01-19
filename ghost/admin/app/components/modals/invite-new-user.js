import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    RSVP: {Promise},
    inject: {service},
    run
} = Ember;
const emberA = Ember.A;

export default ModalComponent.extend(ValidationEngine, {
    classNames: 'modal-content invite-new-user',

    role: null,
    roles: null,
    authorRole: null,
    submitting: false,

    validationType: 'inviteUser',

    notifications: service(),
    store: service(),

    init() {
        this._super(...arguments);

        // populate roles and set initial value for the dropdown
        run.schedule('afterRender', this, function () {
            this.get('store').query('role', {permissions: 'assign'}).then((roles) => {
                let authorRole = roles.findBy('name', 'Author');

                this.set('roles', roles);
                this.set('authorRole', authorRole);

                if (!this.get('role')) {
                    this.set('role', authorRole);
                }
            });
        });
    },

    willDestroyElement() {
        this._super(...arguments);
        // TODO: this should not be needed, ValidationEngine acts as a
        // singleton and so it's errors and hasValidated state stick around
        this.get('errors').clear();
        this.set('hasValidated', emberA());
    },

    validate() {
        let email = this.get('email');

        // TODO: either the validator should check the email's existence or
        // the API should return an appropriate error when attempting to save
        return new Promise((resolve, reject) => {
            return this._super().then(() => {
                this.get('store').findAll('user', {reload: true}).then((result) => {
                    let invitedUser = result.findBy('email', email);

                    if (invitedUser) {
                        this.get('errors').clear('email');
                        if (invitedUser.get('status') === 'invited' || invitedUser.get('status') === 'invited-pending') {
                            this.get('errors').add('email', 'A user with that email address was already invited.');
                        } else {
                            this.get('errors').add('email', 'A user with that email address already exists.');
                        }

                        // TODO: this shouldn't be needed, ValidationEngine doesn't mark
                        // properties as validated when validating an entire object
                        this.get('hasValidated').addObject('email');
                        reject();
                    } else {
                        resolve();
                    }
                });
            }, () => {
                // TODO: this shouldn't be needed, ValidationEngine doesn't mark
                // properties as validated when validating an entire object
                this.get('hasValidated').addObject('email');
                reject();
            });
        });
    },

    actions: {
        setRole(role) {
            this.set('role', role);
        },

        confirm() {
            let email = this.get('email');
            let role = this.get('role');
            let notifications = this.get('notifications');
            let newUser;

            this.validate().then(() => {
                this.set('submitting', true);

                newUser = this.get('store').createRecord('user', {
                    email,
                    role,
                    status: 'invited'
                });

                newUser.save().then(() => {
                    let notificationText = `Invitation sent! (${email})`;

                    // If sending the invitation email fails, the API will still return a status of 201
                    // but the user's status in the response object will be 'invited-pending'.
                    if (newUser.get('status') === 'invited-pending') {
                        notifications.showAlert('Invitation email was not sent.  Please try resending.', {type: 'error', key: 'invite.send.failed'});
                    } else {
                        notifications.showNotification(notificationText, {key: 'invite.send.success'});
                    }
                }).catch((errors) => {
                    newUser.deleteRecord();
                    notifications.showErrors(errors, {key: 'invite.send'});
                }).finally(() => {
                    this.send('closeModal');
                });
            });
        }
    }
});
