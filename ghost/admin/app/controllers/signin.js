import $ from 'jquery';
import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import injectController from 'ember-controller/inject';
import {isEmberArray} from 'ember-array/utils';

import {
    VersionMismatchError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Controller.extend(ValidationEngine, {
    submitting: false,
    loggingIn: false,
    authProperties: ['identification', 'password'],

    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    application: injectController(),
    ajax: injectService(),
    flowErrors: '',

    // ValidationEngine settings
    validationType: 'signin',

    actions: {
        authenticate() {
            let model = this.get('model');
            let authStrategy = 'authenticator:oauth2';

            // Authentication transitions to posts.index, we can leave spinner running unless there is an error
            this.get('session').authenticate(authStrategy, model.get('identification'), model.get('password')).catch((error) => {
                this.toggleProperty('loggingIn');

                if (error && error.errors) {
                    // we don't get back an ember-data/ember-ajax error object
                    // back so we need to pass in a null status in order to
                    // test against the payload
                    if (isVersionMismatchError(null, error)) {
                        let versionMismatchError = new VersionMismatchError(error);
                        return this.get('notifications').showAPIError(versionMismatchError);
                    }

                    error.errors.forEach((err) => {
                        err.message = err.message.htmlSafe();
                    });

                    this.set('flowErrors', error.errors[0].message.string);

                    if (error.errors[0].message.string.match(/user with that email/)) {
                        this.get('model.errors').add('identification', '');
                    }

                    if (error.errors[0].message.string.match(/password is incorrect/)) {
                        this.get('model.errors').add('password', '');
                    }
                } else {
                    // Connection errors don't return proper status message, only req.body
                    this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
                }
            });
        },

        validateAndAuthenticate() {
            this.set('flowErrors', '');
            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
            this.get('hasValidated').addObjects(this.authProperties);
            this.validate({property: 'signin'}).then(() => {
                this.toggleProperty('loggingIn');
                this.send('authenticate');
            }).catch(() => {
                this.set('flowErrors', 'Please fill out the form to sign in.');
            });
        },

        forgotten() {
            let email = this.get('model.identification');
            let notifications = this.get('notifications');

            this.set('flowErrors', '');
            // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'forgotPassword'
            this.get('hasValidated').addObject('identification');
            this.validate({property: 'forgotPassword'}).then(() => {
                let forgottenUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');
                this.toggleProperty('submitting');

                this.get('ajax').post(forgottenUrl, {
                    data: {
                        passwordreset: [{email}]
                    }
                }).then(() => {
                    this.toggleProperty('submitting');
                    notifications.showAlert('Please check your email for instructions.', {type: 'info', key: 'forgot-password.send.success'});
                }).catch((error) => {
                    this.toggleProperty('submitting');

                    if (isVersionMismatchError(error)) {
                        return notifications.showAPIError(error);
                    }

                    if (error && error.errors && isEmberArray(error.errors)) {
                        let [{message}] = error.errors;

                        this.set('flowErrors', message);

                        if (message.match(/no user with that email/)) {
                            this.get('model.errors').add('identification', '');
                        }
                    } else {
                        notifications.showAPIError(error, {defaultErrorText: 'There was a problem with the reset, please try again.', key: 'forgot-password.send'});
                    }
                });
            }).catch(() => {
                this.set('flowErrors', 'We need your email address to reset your password!');
            });
        }
    }
});
