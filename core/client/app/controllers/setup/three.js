import Ember from 'ember';

var SetupThreeController = Ember.Controller.extend({
    notifications: Ember.inject.service(),
    users: '',
    usersArray: Ember.computed('users', function () {
        var users = this.get('users').split('\n').filter(function (email) {
            return email.trim().length > 0;
        });

        return users.uniq();
    }),
    validUsersArray: Ember.computed('usersArray', function () {
        return this.get('usersArray').filter(function (user) {
            return validator.isEmail(user);
        });
    }),
    validateUsers: Ember.computed('usersArray', function () {
        var errors = [];

        this.get('usersArray').forEach(function (user) {
            if (!validator.isEmail(user)) {
                errors.push({
                    user: user,
                    error: 'email'
                });
            }
        });

        return errors.length === 0 ? true : errors;
    }),
    numUsers: Ember.computed('validUsersArray', function () {
        return this.get('validUsersArray').length;
    }),
    buttonText: Ember.computed('usersArray', function () {
        var num = this.get('usersArray').length,
            user;

        if (num > 0) {
            user = num === 1 ? 'user' : 'users';
            user = num + ' ' + user;
        } else {
            user = 'some users';
        }

        return 'Invite ' + user;
    }),
    buttonClass: Ember.computed('validateUsers', 'numUsers', function () {
        if (this.get('validateUsers') === true && this.get('numUsers') > 0) {
            return 'btn-green';
        } else {
            return 'btn-minor';
        }
    }),
    authorRole: Ember.computed(function () {
        return this.store.find('role').then(function (roles) {
            return roles.findBy('name', 'Author');
        });
    }),
    actions: {
        invite: function () {
            var self = this,
                validationErrors = this.get('validateUsers'),
                users = this.get('usersArray'),
                errorMessages,
                notifications = this.get('notifications'),
                invitationsString;

            if (validationErrors === true && users.length > 0) {
                this.get('authorRole').then(function (authorRole) {
                    Ember.RSVP.Promise.all(
                        users.map(function (user) {
                            var newUser = self.store.createRecord('user', {
                                email: user,
                                status: 'invited',
                                role: authorRole
                            });

                            return newUser.save().then(function () {
                                return {
                                    email: user,
                                    success: newUser.get('status') === 'invited'
                                };
                            }).catch(function () {
                                return {
                                    email: user,
                                    success: false
                                };
                            });
                        })
                    ).then(function (invites) {
                        var successCount = 0,
                            erroredEmails = [],
                            message;

                        invites.forEach(function (invite) {
                            if (invite.success) {
                                successCount++;
                            } else {
                                erroredEmails.push(invite.email);
                            }
                        });

                        if (erroredEmails.length > 0) {
                            message = 'Failed to send ' + erroredEmails.length + ' invitations: ';
                            message += erroredEmails.join(', ');
                            notifications.showError(message, {delayed: successCount > 0});
                        }

                        if (successCount > 0) {
                            // pluralize
                            invitationsString = successCount > 1 ? 'invitations' : 'invitation';

                            notifications.showSuccess(successCount + ' ' + invitationsString + ' sent!', {delayed: true});
                            self.transitionTo('posts.index');
                        }
                    });
                });
            } else if (users.length === 0) {
                notifications.showError('No users to invite.');
            } else {
                errorMessages = validationErrors.map(function (error) {
                    // Only one error type here so far, but one day the errors might be more detailed
                    switch (error.error) {
                    case 'email':
                        return {message: error.user + ' is not a valid email.'};
                    }
                });

                notifications.showErrors(errorMessages);
            }
        }
    }
});

export default SetupThreeController;
