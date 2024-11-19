import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isArray as isEmberArray} from '@ember/array';
import {isTwoFactorTokenRequiredError, isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class SignupController extends Controller {
    @service ajax;
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;
    @service router;

    @inject config;

    @tracked flowErrors = '';

    get signupDetails() {
        return this.model;
    }

    @action
    validate(property) {
        return this.signupDetails.validate({property});
    }

    @action
    setSignupProperty(property, event) {
        const value = event.target.value;
        this.signupDetails[property] = value;
    }

    @action
    trimSignupProperty(property, event) {
        const value = event.target.value.trim();
        this.signupDetails[property] = value;
    }

    @action
    submit(event) {
        event.preventDefault();
        this.signupTask.perform();
    }

    @task({drop: true})
    *signupTask() {
        const setupProperties = ['name', 'email', 'password', 'token'];

        this.flowErrors = '';
        this.signupDetails.hasValidated.addObjects(setupProperties);

        try {
            yield this.signupDetails.validate();
            yield this._completeInvitation();

            try {
                yield this._authenticateWithPassword();
            } catch (error) {
                if (isTwoFactorTokenRequiredError(error)) {
                    yield this.router.transitionTo('signin-verify');
                    return true;
                }
                this.notifications.showAPIError(error, {key: 'signup.complete'});
            }

            return true;
        } catch (error) {
            // ValidationEngine throws undefined
            if (!error) {
                this.flowErrors = 'Please fill out the form to complete your signup';
                return false;
            }

            if (isEmberArray(error?.payload?.errors)) {
                if (isVersionMismatchError(error)) {
                    this.notifications.showAPIError(error);
                }
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.notifications.showAPIError(error, {key: 'signup.complete'});
            }

            return false;
        }
    }

    _completeInvitation() {
        const authUrl = this.ghostPaths.url.api('authentication', 'invitation');
        const signupDetails = this.signupDetails;

        return this.ajax.post(authUrl, {
            dataType: 'json',
            data: {
                invitation: [{
                    name: signupDetails.name,
                    email: signupDetails.email,
                    password: signupDetails.password,
                    token: signupDetails.token
                }]
            }
        });
    }

    _authenticateWithPassword() {
        const {email, password} = this.signupDetails;

        return this.session
            .authenticate('authenticator:cookie', {identification: email, password});
    }
}
