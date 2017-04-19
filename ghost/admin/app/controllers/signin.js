import $ from 'jquery';
import Controller from 'ember-controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import injectController from 'ember-controller/inject';
import injectService from 'ember-service/inject';
import {isEmberArray} from 'ember-array/utils';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {task} from 'ember-concurrency';

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
    settings: injectService(),
    torii: injectService(),

    flowErrors: '',

    // ValidationEngine settings
    validationType: 'signin',

    authenticate: task(function* (authStrategy, authentication) {
        try {
            let authResult = yield this.get('session')
                .authenticate(authStrategy, ...authentication);

            // fetch settings for synchronous access
            yield this.get('settings').fetch();

            return authResult;

        } catch (error) {
            if (error && error.errors) {
                // we don't get back an ember-data/ember-ajax error object
                // back so we need to pass in a null status in order to
                // test against the payload
                if (isVersionMismatchError(error)) {
                    return this.get('notifications').showAPIError(error);
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

    // TODO: remove duplication with controllers/setup/two
    authenticateWithGhostOrg: task(function* () {
        let authStrategy = 'authenticator:oauth2-ghost';

        this.set('flowErrors', '');

        try {
            let authentication = yield this.get('torii')
                .open('ghost-oauth2', {type: 'signin'});

            return yield this.get('authenticate').perform(authStrategy, [authentication]);

        } catch (error) {
            this.set('flowErrors', 'Authentication with Ghost.org denied or failed');
            throw error;
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

            if (error && error.errors && isEmberArray(error.errors)) {
                let [{message}] = error.errors;

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
