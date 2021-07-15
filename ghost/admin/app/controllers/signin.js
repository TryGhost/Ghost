import $ from 'jquery';
import Controller, {inject as controller} from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {isArray as isEmberArray} from '@ember/array';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    application: controller(),
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    submitting: false,
    loggingIn: false,
    authProperties: null,

    flowErrors: '',
    passwordResetEmailSent: false,

    // ValidationEngine settings
    validationType: 'signin',

    init() {
        this._super(...arguments);
        this.authProperties = ['identification', 'password'];
    },

    signin: alias('model'),

    accentColor: computed('config.accent_color', function () {
        let color = this.get('config.accent_color');
        return color;
    }),

    siteIconStyle: computed('config.icon', function () {
        let icon = this.get('config.icon');

        if (icon) {
            return htmlSafe(`background-image: url(${icon})`);
        }

        icon = 'https://static.ghost.org/v4.0.0/images/ghost-orb-2.png';
        return htmlSafe(`background-image: url(${icon})`);
    }),

    actions: {
        authenticate() {
            return this.validateAndAuthenticate.perform();
        }
    },

    authenticate: task(function* (authStrategy, authentication) {
        try {
            return yield this.session
                .authenticate(authStrategy, ...authentication)
                .then(() => true); // ensure task button transitions to "success" state
        } catch (error) {
            if (isVersionMismatchError(error)) {
                return this.notifications.showAPIError(error);
            }

            if (error && error.payload && error.payload.errors) {
                let [mainError] = error.payload.errors;

                mainError.message = htmlSafe(mainError.message || '');
                mainError.context = htmlSafe(mainError.context || '');

                this.set('flowErrors', (mainError.context.string || mainError.message.string));

                if (mainError.type === 'PasswordResetRequiredError') {
                    this.set('passwordResetEmailSent', true);
                }

                if (mainError.context.string.match(/user with that email/i)) {
                    this.get('signin.errors').add('identification', '');
                }

                if (mainError.context.string.match(/password is incorrect/i)) {
                    this.get('signin.errors').add('password', '');
                }
            } else {
                console.error(error); // eslint-disable-line no-console
                // Connection errors don't return proper status message, only req.body
                this.notifications.showAlert(
                    'There was a problem on the server.',
                    {type: 'error', key: 'session.authenticate.failed'}
                );
            }

            return false;
        }
    }).drop(),

    validateAndAuthenticate: task(function* () {
        let signin = this.signin;
        let authStrategy = 'authenticator:cookie';

        this.set('flowErrors', '');
        // Manually trigger events for input fields, ensuring legacy compatibility with
        // browsers and password managers that don't send proper events on autofill
        $('#login').find('input').trigger('change');

        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
        this.hasValidated.addObjects(this.authProperties);

        try {
            yield this.validate({property: 'signin'});
            return yield this.authenticate
                .perform(authStrategy, [signin.get('identification'), signin.get('password')]);
        } catch (error) {
            this.set('flowErrors', 'Please fill out the form to sign in.');
        }
    }).drop(),

    forgotten: task(function* () {
        let email = this.get('signin.identification');
        let forgottenUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');
        let notifications = this.notifications;

        this.set('flowErrors', '');
        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'forgotPassword'
        this.hasValidated.addObject('identification');

        try {
            yield this.validate({property: 'forgotPassword'});
            yield this.ajax.post(forgottenUrl, {data: {passwordreset: [{email}]}});
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

                if (message.match(/no user|not found/)) {
                    this.get('signin.errors').add('identification', '');
                }
            } else {
                notifications.showAPIError(error, {defaultErrorText: 'There was a problem with the reset, please try again.', key: 'forgot-password.send'});
            }
        }
    })
});
