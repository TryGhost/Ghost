import Controller, {inject as controller} from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray as isEmberArray} from '@ember/array';
import {isTwoFactorTokenRequiredError} from '../services/ajax';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const SUCCESS = true;
const FAILURE = false;

/* eslint-disable ghost/ember/alias-model-in-controller */
export default class SigninController extends Controller.extend(ValidationEngine) {
    @controller application;

    @service ajax;
    @service ghostPaths;
    @service notifications;
    @service router;
    @service session;
    @service settings;

    @inject config;

    @tracked submitting = false;
    @tracked loggingIn = false;
    @tracked flowNotification = '';
    @tracked flowErrors = '';
    @tracked passwordResetEmailSent = false;

    // ValidationEngine settings
    validationType = 'signin';

    authProperties = ['identification', 'password'];

    get signin() {
        return this.model;
    }

    @action
    handleInput(event) {
        this.signin[event.target.name] = event.target.value;
    }

    @action
    validateProperty(property) {
        return this.validate({property});
    }

    @task({drop: true})
    *authenticateTask(authStrategy, {identification, password}) {
        try {
            yield this.session.authenticate(authStrategy, {identification, password});
            return SUCCESS;
        } catch (error) {
            if (isTwoFactorTokenRequiredError(error)) {
                // login was successful, but 2FA verification is required
                this.router.transitionTo('signin-verify');
                return SUCCESS;
            }

            if (isVersionMismatchError(error)) {
                this.notifications.showAPIError(error);
                return FAILURE;
            }

            this.signin.errors.clear();

            if (error && error.payload && error.payload.errors) {
                let [mainError] = error.payload.errors;

                mainError.message = htmlSafe(mainError.message || '');
                mainError.context = htmlSafe(mainError.context || '');

                this.flowErrors = (mainError.context.string || mainError.message.string);

                if (mainError.type === 'TooManyRequestsError') {
                    // Prefer full message in this case
                    this.flowErrors = mainError.message.string;
                }

                if (mainError.type === 'PasswordResetRequiredError') {
                    this.passwordResetEmailSent = true;
                }

                if (mainError.context.string.match(/user with that email/i)) {
                    this.signin.errors.add('identification', '');
                }

                if (mainError.context.string.match(/password is incorrect/i)) {
                    this.signin.errors.add('password', '');
                }
            } else {
                console.error(error); // eslint-disable-line no-console
                // Connection errors don't return proper status message, only req.body
                this.notifications.showAlert(
                    'There was a problem on the server.',
                    {type: 'error', key: 'session.authenticate.failed'}
                );
            }

            return FAILURE;
        }
    }

    @task({drop: true})
    *validateAndAuthenticateTask() {
        const {identification, password} = this.signin;

        this.flowErrors = '';

        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
        this.hasValidated.addObjects(this.authProperties);

        try {
            yield this.validate({property: 'signin'});
            return yield this.authenticateTask
                .perform('authenticator:cookie', {identification, password});
        } catch (error) {
            this.flowErrors = 'Please fill out the form to sign in.';
            return FAILURE;
        }
    }

    @task
    *forgotPasswordTask() {
        let email = this.signin.identification;
        let forgottenUrl = this.ghostPaths.url.api('authentication', 'password_reset');
        let notifications = this.notifications;

        this.flowErrors = '';
        this.flowNotification = '';
        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'forgotPassword'
        this.hasValidated.addObject('identification');

        try {
            yield this.validate({property: 'forgotPassword'});
            yield this.ajax.post(forgottenUrl, {data: {password_reset: [{email}]}});
            this.flowNotification = 'An email with password reset instructions has been sent.';
            return SUCCESS;
        } catch (error) {
            // ValidationEngine throws "undefined" for failed validation
            if (!error) {
                this.flowErrors = 'We need your email address to reset your password.';
                return FAILURE;
            }

            if (isVersionMismatchError(error)) {
                notifications.showAPIError(error);
                return FAILURE;
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                let [{message}] = error.payload.errors;

                this.flowErrors = message;

                if (message.match(/no user|not found/)) {
                    this.signin.errors.add('identification', '');
                }
            } else {
                notifications.showAPIError(error, {defaultErrorText: 'There was a problem with the reset, please try again.', key: 'forgot-password.send'});
            }

            return FAILURE;
        }
    }
}
