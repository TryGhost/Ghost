/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller, {inject as controller} from '@ember/controller';
import DS from 'ember-data';
import RSVP from 'rsvp';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {A as emberA} from '@ember/array';
import {htmlSafe} from '@ember/string';
import {isInvalidError} from 'ember-ajax/errors';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const {Errors} = DS;

export default Controller.extend({
    two: controller('setup/two'),
    notifications: service(),

    users: '',

    errors: Errors.create(),
    hasValidated: emberA(),
    ownerEmail: alias('two.email'),

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

        return this.get('usersArray').reject(user => validator.isEmail(user) || user === ownerEmail);
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
            return 'gh-btn-green';
        } else {
            return 'gh-btn-minor';
        }
    }),

    authorRole: computed(function () {
        return this.store.findAll('role', {reload: true}).then(roles => roles.findBy('name', 'Author'));
    }),

    actions: {
        validate() {
            this.validate();
        },

        invite() {
            this.get('invite').perform();
        },

        skipInvite() {
            this.send('loadServerNotifications');
            this.transitionToRoute('posts.index');
        }
    },

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

    _transitionAfterSubmission() {
        if (!this._hasTransitioned) {
            this._hasTransitioned = true;
            this.transitionToRoute('posts.index');
        }
    },

    invite: task(function* () {
        let users = this.get('validUsersArray');

        if (this.validate() && users.length > 0) {
            this._hasTransitioned = false;

            this.get('_slowSubmissionTimeout').perform();

            let authorRole = yield this.get('authorRole');
            let invites = yield this._saveInvites(authorRole);

            this.get('_slowSubmissionTimeout').cancelAll();

            this._showNotifications(invites);

            run.schedule('actions', this, function () {
                this.send('loadServerNotifications');
                this._transitionAfterSubmission();
            });
        } else if (users.length === 0) {
            this.get('errors').add('users', 'No users to invite');
        }
    }).drop(),

    _slowSubmissionTimeout: task(function* () {
        yield timeout(4000);
        this._transitionAfterSubmission();
    }).drop(),

    _saveInvites(authorRole) {
        let users = this.get('validUsersArray');

        return RSVP.Promise.all(
            users.map((user) => {
                let invite = this.store.createRecord('invite', {
                    email: user,
                    role: authorRole
                });

                return invite.save().then(() => ({
                    email: user,
                    success: invite.get('status') === 'sent'
                })).catch(error => ({
                    error,
                    email: user,
                    success: false
                }));
            })
        );
    },

    _showNotifications(invites) {
        let notifications = this.get('notifications');
        let erroredEmails = [];
        let successCount = 0;
        let invitationsString, message;

        invites.forEach((invite) => {
            if (invite.success) {
                successCount += 1;
            } else if (isInvalidError(invite.error)) {
                message = `${invite.email} was invalid: ${invite.error.payload.errors[0].message}`;
                notifications.showAlert(message, {type: 'error', delayed: true, key: `signup.send-invitations.${invite.email}`});
            } else {
                erroredEmails.push(invite.email);
            }
        });

        if (erroredEmails.length > 0) {
            invitationsString = erroredEmails.length > 1 ? ' invitations: ' : ' invitation: ';
            message = `Failed to send ${erroredEmails.length} ${invitationsString}`;
            message += erroredEmails.join(', ');
            message += '. Please check your email configuration, see <a href=\'https://docs.ghost.org/v1.0.0/docs/mail-config\' target=\'_blank\'>https://docs.ghost.org/v1.0.0/docs/mail-config</a> for instructions';

            message = htmlSafe(message);
            notifications.showAlert(message, {type: 'error', delayed: successCount > 0, key: 'signup.send-invitations.failed'});
        }

        if (successCount > 0) {
            // pluralize
            invitationsString = successCount > 1 ? 'invitations' : 'invitation';
            notifications.showAlert(`${successCount} ${invitationsString} sent!`, {type: 'success', delayed: true, key: 'signup.send-invitations.success'});
        }
    }
});
