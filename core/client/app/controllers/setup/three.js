import Ember from 'ember';
import DS from 'ember-data';

const {
    Controller,
    RSVP,
    computed,
    inject: {service, controller},
    run
} = Ember;
const {Errors} = DS;
const {alias} = computed;
const emberA = Ember.A;

export default Controller.extend({
    notifications: service(),
    two: controller('setup/two'),

    errors: Errors.create(),
    hasValidated: emberA(),
    users: '',
    ownerEmail: alias('two.email'),
    submitting: false,

    usersArray: computed('users', function () {
        let errors = this.get('errors');
        let users = this.get('users').split('\n').filter(function (email) {
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

    validUsersArray: computed('usersArray', 'ownerEmail', function () {
        let ownerEmail = this.get('ownerEmail');

        return this.get('usersArray').filter(function (user) {
            return validator.isEmail(user) && user !== ownerEmail;
        });
    }),

    invalidUsersArray: computed('usersArray', 'ownerEmail', function () {
        let ownerEmail = this.get('ownerEmail');

        return this.get('usersArray').reject((user) => {
            return validator.isEmail(user) || user === ownerEmail;
        });
    }),

    validationResult: computed('invalidUsersArray', function () {
        let errors = [];

        this.get('invalidUsersArray').forEach((user) => {
            errors.push({
                user,
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

    validate() {
        let errors = this.get('errors');
        let validationResult = this.get('validationResult');
        let property = 'users';

        errors.clear();

        // If property isn't in the `hasValidated` array, add it to mark that this field can show a validation result
        this.get('hasValidated').addObject(property);

        if (validationResult === true) {
            return true;
        }

        validationResult.forEach((error) => {
            // Only one error type here so far, but one day the errors might be more detailed
            switch (error.error) {
            case 'email':
                errors.add(property, `${error.user} is not a valid email.`);
            }
        });

        return false;
    },

    buttonText: computed('errors.users', 'validUsersArray', 'invalidUsersArray', function () {
        let usersError = this.get('errors.users.firstObject.message');
        let validNum = this.get('validUsersArray').length;
        let invalidNum = this.get('invalidUsersArray').length;
        let userCount;

        if (usersError && usersError.match(/no users/i)) {
            return usersError;
        }

        if (invalidNum > 0) {
            userCount = invalidNum === 1 ? 'email address' : 'email addresses';
            return `${invalidNum} invalid ${userCount}`;
        }

        if (validNum > 0) {
            userCount = validNum === 1 ? 'user' : 'users';
            userCount = `${validNum} ${userCount}`;
        } else {
            userCount = 'some users';
        }

        return `Invite ${userCount}`;
    }),

    buttonClass: computed('validationResult', 'usersArray.length', function () {
        if (this.get('validationResult') === true && this.get('usersArray.length') > 0) {
            return 'btn-green';
        } else {
            return 'btn-minor';
        }
    }),

    authorRole: computed(function () {
        return this.store.findAll('role', {reload: true}).then((roles) => {
            return roles.findBy('name', 'Author');
        });
    }),

    _transitionAfterSubmission() {
        if (!this._hasTransitioned) {
            this._hasTransitioned = true;
            this.transitionToRoute('posts.index');
        }
    },

    actions: {
        validate() {
            this.validate();
        },

        invite() {
            let users = this.get('usersArray');
            let notifications = this.get('notifications');
            let invitationsString, submissionTimeout;

            if (this.validate() && users.length > 0) {
                this.set('submitting', true);
                this._hasTransitioned = false;

                // wait for 4 seconds, otherwise transition anyway
                submissionTimeout = run.later(this, function () {
                    this._transitionAfterSubmission();
                }, 4000);

                this.get('authorRole').then((authorRole) => {
                    RSVP.Promise.all(
                        users.map((user) => {
                            let newUser = this.store.createRecord('user', {
                                email: user,
                                status: 'invited',
                                role: authorRole
                            });

                            return newUser.save().then(() => {
                                return {
                                    email: user,
                                    success: newUser.get('status') === 'invited'
                                };
                            }).catch(() => {
                                return {
                                    email: user,
                                    success: false
                                };
                            });
                        })
                    ).then((invites) => {
                        let erroredEmails = [];
                        let successCount = 0;
                        let message;

                        run.cancel(submissionTimeout);

                        invites.forEach((invite) => {
                            if (invite.success) {
                                successCount++;
                            } else {
                                erroredEmails.push(invite.email);
                            }
                        });

                        if (erroredEmails.length > 0) {
                            invitationsString = erroredEmails.length > 1 ? ' invitations: ' : ' invitation: ';
                            message = `Failed to send ${erroredEmails.length} ${invitationsString}`;
                            message += erroredEmails.join(', ');
                            message += ". Please check your email configuration, see <a href=\'http://support.ghost.org/mail\' target=\'_blank\'>http://support.ghost.org/mail</a> for instructions";

                            message = Ember.String.htmlSafe(message);
                            notifications.showAlert(message, {type: 'error', delayed: successCount > 0, key: 'signup.send-invitations.failed'});
                        }

                        if (successCount > 0) {
                            // pluralize
                            invitationsString = successCount > 1 ? 'invitations' : 'invitation';
                            notifications.showAlert(`${successCount} ${invitationsString} sent!`, {type: 'success', delayed: true, key: 'signup.send-invitations.success'});
                        }

                        this.set('submitting', false);

                        run.schedule('actions', this, function () {
                            this.send('loadServerNotifications');
                            this._transitionAfterSubmission();
                        });
                    });
                });
            } else if (users.length === 0) {
                this.get('errors').add('users', 'No users to invite');
            }
        },

        skipInvite() {
            this.send('loadServerNotifications');
            this.transitionToRoute('posts.index');
        }
    }
});
