import $ from 'jquery';
import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import injectController from 'ember-controller/inject';
import {isEmberArray} from 'ember-array/utils';

import {
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Controller.extend(ValidationEngine, {
    submitting: false,
    loggingIn: false,
    authProperties: ['identification', 'password'],

    ajax: injectService(),
    application: injectController(),
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),

    flowErrors: '',

    // ValidationEngine settings
    validationType: 'signin',

    actions: {
        validateAndAuthenticate() {
            let model = this.get('model');
            let authStrategy = 'authenticator:oauth2';

            this.set('flowErrors', '');
            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
            this.get('hasValidated').addObjects(this.authProperties);
            this.validate({property: 'signin'}).then(() => {
                this.toggleProperty('loggingIn');
                this.send('authenticate', authStrategy, [model.get('identification'), model.get('password')]);
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
