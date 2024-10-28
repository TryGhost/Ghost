import Controller from '@ember/controller';
// eslint-disable-next-line
import DS from 'ember-data';
import config from 'ghost-admin/config/environment';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {isUnauthorizedError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const {Errors} = DS;

const TASK_SUCCESS = true;
const TASK_FAILURE = false;
const DEFAULT_RESEND_TOKEN_COUNTDOWN = 15;

// eslint-disable-next-line ghost/ember/alias-model-in-controller
class VerifyData {
    @tracked token;
    @tracked hasValidated = new TrackedArray();

    errors = Errors.create();

    validate() {
        this.resetValidations();

        if (!this.token?.trim()) {
            this.errors.add('token', 'Verification code is required');
            this.hasValidated.push('token');
            return false;
        }

        if (!this.token?.trim().match(/^\d{6}$/)) {
            this.errors.add('token', 'Verification code must be 6 numbers');
            this.hasValidated.push('token');
            return false;
        }

        return true;
    }

    setTokenError(message) {
        this.resetValidations();
        this.errors.add('token', message);
        this.hasValidated.push('token');
    }

    resetValidations() {
        this.errors.clear();
        this.hasValidated = new TrackedArray();
    }

    get validationMessage() {
        return this.errors.toArray()[0]?.message;
    }
}

export default class SigninVerifyController extends Controller {
    @service ajax;
    @service session;
    @service ghostPaths;

    @tracked flowErrors = '';
    @tracked verifyData = new VerifyData();
    @tracked resendTokenCountdown = DEFAULT_RESEND_TOKEN_COUNTDOWN;

    resetResendTokenCountdown() {
        clearInterval(this.resendTokenCountdownInterval);
        this.resendTokenCountdownStarted = false;
    }

    @action
    resetData() {
        this.verifyData = new VerifyData();
    }

    @action
    handleTokenInput(event) {
        this.resetErrorState();
        this.verifyData.token = event.target.value;
    }

    @task({drop: true})
    *verifyTokenTask() {
        this.flowErrors = '';

        if (!this.verifyData.validate()) {
            return TASK_FAILURE;
        }

        try {
            yield this.session.authenticate('authenticator:cookie', {token: this.verifyData.token});
            return TASK_SUCCESS;
        } catch (error) {
            if (isUnauthorizedError(error)) {
                this.verifyData.setTokenError('Your verification code is incorrect.');
            } else if (error && error.payload && error.payload.errors) {
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.flowErrors = 'There was a problem verifying the code. Please try again.';
            }
            return TASK_FAILURE;
        }
    }

    @task({drop: true})
    *resendTokenTask() {
        const resendTokenPath = `${this.ghostPaths.apiRoot}/session/verify`;

        try {
            yield this.ajax.post(resendTokenPath, {
                contentType: 'application/json;charset=utf-8',
                // API responds with "OK" which will throw if we do a default JSON parse
                dataType: 'text'
            });
            this.delayResendAvailabilityTask.perform();
            return TASK_SUCCESS;
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.flowErrors = 'There was a problem resending the verification token.';
            }
            return TASK_FAILURE;
        }
    }

    @task
    *delayResendAvailabilityTask() {
        this.resendTokenCountdown = DEFAULT_RESEND_TOKEN_COUNTDOWN;
        while (this.resendTokenCountdown > 0) {
            yield timeout(config.environment === 'test' ? 10 : 1000);
            this.resendTokenCountdown = this.resendTokenCountdown - 1;
        }
    }

    resetErrorState() {
        this.verifyTokenTask.last = null; // resets GhTaskButton state
        this.flowErrors = '';
        this.verifyData.resetValidations();
    }
}
