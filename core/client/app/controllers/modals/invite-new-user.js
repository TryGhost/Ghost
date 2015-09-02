import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    notifications: Ember.inject.service(),

    validationType: 'signup',

    role: null,
    authorRole: null,

    roles: Ember.computed(function () {
        return this.store.find('role', {permissions: 'assign'});
    }),

    // Used to set the initial value for the dropdown
    authorRoleObserver: Ember.observer('roles.@each.role', function () {
        var self = this;

        this.get('roles').then(function (roles) {
            var authorRole = roles.findBy('name', 'Author');

            self.set('authorRole', authorRole);

            if (!self.get('role')) {
                self.set('role', authorRole);
            }
        });
    }),

    confirm: {
        accept: {
            text: 'send invitation now'
        },
        reject: {
            buttonClass: 'hidden'
        }
    },

    actions: {
        setRole: function (role) {
            this.set('role', role);
        },

        confirmAccept: function () {
            var email = this.get('email'),
                role = this.get('role'),
                validationErrors = this.get('errors.messages'),
                self = this,
                newUser;

            // reset the form and close the modal
            this.set('email', '');
            this.set('role', self.get('authorRole'));

            this.store.find('user').then(function (result) {
                var invitedUser = result.findBy('email', email);

                if (invitedUser) {
                    if (invitedUser.get('status') === 'invited' || invitedUser.get('status') === 'invited-pending') {
                        self.get('notifications').showAlert('A user with that email address was already invited.', {type: 'warn'});
                    } else {
                        self.get('notifications').showAlert('A user with that email address already exists.', {type: 'warn'});
                    }
                } else {
                    newUser = self.store.createRecord('user', {
                        email: email,
                        status: 'invited',
                        role: role
                    });

                    newUser.save().then(function () {
                        var notificationText = 'Invitation sent! (' + email + ')';

                        // If sending the invitation email fails, the API will still return a status of 201
                        // but the user's status in the response object will be 'invited-pending'.
                        if (newUser.get('status') === 'invited-pending') {
                            self.get('notifications').showAlert('Invitation email was not sent.  Please try resending.', {type: 'error'});
                        } else {
                            self.get('notifications').showNotification(notificationText);
                        }
                    }).catch(function (errors) {
                        newUser.deleteRecord();
                        // TODO: user model includes ValidationEngine mixin so
                        // save is overridden in order to validate, we probably
                        // want to use inline-validations here and only show an
                        // alert if we have an actual error
                        if (errors) {
                            self.get('notifications').showErrors(errors);
                        } else if (validationErrors) {
                            self.get('notifications').showAlert(validationErrors.toString(), {type: 'error'});
                        }
                    }).finally(function () {
                        self.get('errors').clear();
                    });
                }
            });
        },

        confirmReject: function () {
            return false;
        }
    }
});
