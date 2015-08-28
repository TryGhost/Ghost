import Ember from 'ember';
import DS from 'ember-data';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),
    two: Ember.inject.controller('setup/two'),

    errors: DS.Errors.create(),
    users: '',
    ownerEmail: Ember.computed.alias('two.email'),
    submitting: false,

    usersArray: Ember.computed('users', function () {
        var errors = this.get('errors'),
            users = this.get('users').split('\n').filter(function (email) {
            return email.trim().length > 0;
        });

        // remove "no users to invite" error if we have users
        if (users.uniq().length > 0 && errors.get('users.length') === 1) {
            if (errors.get('users.firstObject').message.match(/no users/i)) {
                errors.remove('users');
            }
        }

        return users.uniq();
    }),

    validUsersArray: Ember.computed('usersArray', 'ownerEmail', function () {
        var ownerEmail = this.get('ownerEmail');

        return this.get('usersArray').filter(function (user) {
            return validator.isEmail(user) && user !== ownerEmail;
        });
    }),

    invalidUsersArray: Ember.computed('usersArray', 'ownerEmail', function () {
        var ownerEmail = this.get('ownerEmail');

        return this.get('usersArray').reject(function (user) {
            return validator.isEmail(user) || user === ownerEmail;
        });
    }),

    validationResult: Ember.computed('invalidUsersArray', function () {
        var errors = [];

        this.get('invalidUsersArray').forEach(function (user) {
            errors.push({
                user: user,
                error: 'email'
            });
        });

        if (errors.length === 0) {
            // ensure we aren't highlighting fields when everything is fine
            this.get('errors').clear();
            return true;
        } else {
            return errors;
        }
    }),

    validate: function () {
        var errors = this.get('errors'),
            validationResult = this.get('validationResult');

        errors.clear();

        if (validationResult === true) { return true; }

        validationResult.forEach(function (error) {
            // Only one error type here so far, but one day the errors might be more detailed
            switch (error.error) {
            case 'email':
                errors.add('users', error.user + ' is not a valid email.');
            }
        });

        return false;
    },

    buttonText: Ember.computed('errors.users', 'validUsersArray', 'invalidUsersArray', function () {
        var usersError = this.get('errors.users.firstObject.message'),
            validNum = this.get('validUsersArray').length,
            invalidNum = this.get('invalidUsersArray').length,
            userCount;

        if (usersError && usersError.match(/no users/i)) {
            return usersError;
        }

        if (invalidNum > 0) {
            userCount = invalidNum === 1 ? 'email address' : 'email addresses';
            return `${invalidNum} invalid ${userCount}`;
        }

        if (validNum > 0) {
            userCount = validNum === 1 ? 'user' : 'users';
            userCount = validNum + ' ' + userCount;
        } else {
            userCount = 'some users';
        }

        return 'Invite ' + userCount;
    }),

    buttonClass: Ember.computed('validationResult', 'usersArray.length', function () {
        if (this.get('validationResult') === true && this.get('usersArray.length') > 0) {
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
        validate: function () {
            this.validate();
        },

        invite: function () {
            var self = this,
                users = this.get('usersArray'),
                notifications = this.get('notifications'),
                invitationsString;

            if (this.validate() && users.length > 0) {
                this.toggleProperty('submitting');
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
                            invitationsString = erroredEmails.length > 1 ? ' invitations: ' : ' invitation: ';
                            message = 'Failed to send ' + erroredEmails.length + invitationsString;
                            message += erroredEmails.join(', ');
                            notifications.showAlert(message, {type: 'error', delayed: successCount > 0});
                        }

                        if (successCount > 0) {
                            // pluralize
                            invitationsString = successCount > 1 ? 'invitations' : 'invitation';
                            notifications.showAlert(successCount + ' ' + invitationsString + ' sent!', {type: 'success', delayed: true});
                        }
                        self.send('loadServerNotifications');
                        self.toggleProperty('submitting');
                        self.transitionToRoute('posts.index');
                    });
                });
            } else if (users.length === 0) {
                this.get('errors').add('users', 'No users to invite');
            }
        },

        skipInvite: function () {
            this.send('loadServerNotifications');
            this.transitionToRoute('posts.index');
        }
    }
});
