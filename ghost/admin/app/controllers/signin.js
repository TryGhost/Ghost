import $ from 'jquery';
import Controller, {inject as controller} from '@ember/controller';
import RSVP from 'rsvp';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isArray as isEmberArray} from '@ember/array';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    submitting: false,
    loggingIn: false,
    authProperties: null,

    ajax: service(),
    application: controller(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    flowErrors: '',

    // ValidationEngine settings
    validationType: 'signin',

    init() {
        this._super(...arguments);
        this.authProperties = ['identification', 'password'];
    },

    authenticate: task(function* (authStrategy, authentication) {
        try {
            let authResult = yield this.get('session')
                .authenticate(authStrategy, ...authentication);
            let promises = [];

            promises.pushObject(this.get('settings').fetch());
            promises.pushObject(this.get('config').fetchPrivate());

            // fetch settings and private config for synchronous access
            yield RSVP.all(promises);

            return authResult;
        } catch (error) {
            if (isVersionMismatchError(error)) {
                return this.get('notifications').showAPIError(error);
            }

            if (error && error.payload && error.payload.errors) {
                error.payload.errors.forEach((err) => {
                    err.message = err.message.htmlSafe();
                });

                this.set('flowErrors', error.payload.errors[0].message.string);

                if (error.payload.errors[0].message.string.match(/user with that email/)) {
                    this.get('model.errors').add('identification', '');
                }

                if (error.payload.errors[0].message.string.match(/password is incorrect/)) {
                    this.get('model.errors').add('password', '');
                }
            } else {
                // Connection errors don't return proper status message, only req.body
                this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
            }
        }
    }).drop(),

    validateAndAuthenticate: task(function* () {
        let model = this.get('model');
        let authStrategy = 'authenticator:oauth2';

        this.set('flowErrors', '');
        // Manually trigger events for input fields, ensuring legacy compatibility with
        // browsers and password managers that don't send proper events on autofill
        $('#login').find('input').trigger('change');

        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
        this.get('hasValidated').addObjects(this.authProperties);

        try {
            yield this.validate({property: 'signin'});
            return yield this.get('authenticate')
                .perform(authStrategy, [model.get('identification'), model.get('password')]);
        } catch (error) {
            this.set('flowErrors', 'Please fill out the form to sign in.');
        }
    }).drop(),

    forgotten: task(function* () {
        let email = this.get('model.identification');
        let forgottenUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');
        let notifications = this.get('notifications');

        this.set('flowErrors', '');
        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'forgotPassword'
        this.get('hasValidated').addObject('identification');

        try {
            yield this.validate({property: 'forgotPassword'});
            yield this.get('ajax').post(forgottenUrl, {data: {passwordreset: [{email}]}});
            notifications.showAlert(
                'Please check your email for instructions.',
                {type: 'info', key: 'forgot-password.send.success'}
            );
            return true;
        } catch (error) {
            // ValidationEngine throws "undefined" for failed validation
            if (!error) {
                return this.set('flowErrors', 'We need your email address to reset your password!');
            }

            if (isVersionMismatchError(error)) {
                return notifications.showAPIError(error);
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                let [{message}] = error.payload.errors;

                this.set('flowErrors', message);

                if (message.match(/no user with that email/)) {
                    this.get('model.errors').add('identification', '');
                }
            } else {
                notifications.showAPIError(error, {defaultErrorText: 'There was a problem with the reset, please try again.', key: 'forgot-password.send'});
            }
        }
    }),

    actions: {
        authenticate() {
            this.get('validateAndAuthenticate').perform();
        }
    }
});
