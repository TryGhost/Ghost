import Controller from '@ember/controller';
// eslint-disable-next-line
import DS from 'ember-data';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const {Errors} = DS;

const DEFAULT_RESEND_TOKEN_COUNTDOWN = 15;

// eslint-disable-next-line ghost/ember/alias-model-in-controller
class VerifyData {
    @tracked token;
    @tracked hasValidated = new TrackedArray();

    errors = Errors.create();

    validate() {
        this.errors.clear();
        this.hasValidated = new TrackedArray();

        if (!this.token?.trim()) {
            this.errors.add('token', 'Token is required');
            this.hasValidated.push('token');
        }
    }
}

export default class SigninVerifyController extends Controller {
    @service ajax;
    @service session;
    @service ghostPaths;

    @tracked flowErrors = '';
    @tracked verifyData = new VerifyData();
    @tracked resendTokenCountdown = DEFAULT_RESEND_TOKEN_COUNTDOWN;
    @tracked resendTokenCountdownStarted = false;

    startResendTokenCountdown() {
        this.resendTokenCountdown = DEFAULT_RESEND_TOKEN_COUNTDOWN;
        this.resendTokenCountdownStarted = true;
        this.resendTokenCountdownInterval = setInterval(() => {
            if (this.resendTokenCountdown > 0) {
                this.resendTokenCountdown = this.resendTokenCountdown - 1;
            } else {
                this.resetResendTokenCountdown();
            }
        }, 1000);
    }

    resetResendTokenCountdown() {
        clearInterval(this.resendTokenCountdownInterval);
        this.resendTokenCountdownStarted = false;
    }

    @action
    resetData() {
        this.verifyData = new VerifyData();
    }

    @action
    validateToken() {
        this.verifyData.validate();
    }

    @action
    handleTokenInput(event) {
        this.verifyData.token = event.target.value;
    }

    @task
    *verifyTokenTask() {
        try {
            yield this.session.authenticate('authenticator:cookie', {token: this.verifyData.token});
            return true;
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.flowErrors = 'There was a problem with the verification token.';
            }
        }
    }

    @task
    *resendTokenTask() {
        const resendTokenPath = `${this.ghostPaths.apiRoot}/session/verify`;

        try {
            yield this.ajax.post(resendTokenPath, {
                contentType: 'application/json;charset=utf-8',
                // ember-ajax will try and parse the response as JSON if not explicitly set
                dataType: 'text'
            });
            this.startResendTokenCountdown();
            return true;
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.flowErrors = 'There was a problem resending the verification token.';
            }
        }
    }
}
