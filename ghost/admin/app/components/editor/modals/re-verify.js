import Component from '@glimmer/component';
import DS from 'ember-data'; // eslint-disable-line
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const {Errors} = DS;

const TASK_SUCCESS = true;
const TASK_FAILURE = false;
const DEFAULT_RESEND_TOKEN_COUNTDOWN = 15;

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

export default class ReVerifyModal extends Component {
    @service ajax;
    @service session;
    @service ghostPaths;
    @service notifications;

    static modalOptions = {
        className: 'fullscreen-modal-wide fullscreen-modal-action modal-reauthenticate',
        ignoreBackdropClick: true,
        backgroundLight: true,
        backgroundBlur: true
    };

    @tracked flowErrors = '';
    @tracked verifyData = new VerifyData();
    @tracked resendTokenCountdown = DEFAULT_RESEND_TOKEN_COUNTDOWN;

    constructor() {
        super(...arguments);
        this.resetData();
    }

    @action
    resetData() {
        this.verifyData = new VerifyData();
        this.flowErrors = '';
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
            yield this._authenticate();
            this.notifications.closeAlerts();
            this.args.close();
            return TASK_SUCCESS;
        } catch (error) {
            if (error?.payload?.errors) {
                const [firstError] = error.payload.errors;
                
                if (firstError.type === 'UnauthorizedError') {
                    this.verifyData.setTokenError('Your verification code is incorrect.');
                } else {
                    this.flowErrors = firstError.message;
                }
            } else {
                this.flowErrors = 'There was a problem verifying the code. Please try again.';
            }
            return TASK_FAILURE;
        }
    }

    async _authenticate() {
        this.session.skipAuthSuccessHandler = true;

        try {
            await this.session.authenticate('authenticator:cookie', {
                token: this.verifyData.token
            });
        } finally {
            this.session.skipAuthSuccessHandler = undefined;
        }
    }

    @task({drop: true})
    *resendTokenTask() {
        const resendTokenPath = `${this.ghostPaths.apiRoot}/session/verify`;

        try {
            yield this.ajax.post(resendTokenPath, {
                contentType: 'application/json;charset=utf-8',
                dataType: 'text'
            });
            
            this.notifications.showNotification(
                'A new verification code has been sent to your email.',
                {type: 'success'}
            );
            
            this.delayResendAvailabilityTask.perform();
            return TASK_SUCCESS;
        } catch (error) {
            if (error?.payload?.errors) {
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
            yield timeout(1000);
            this.resendTokenCountdown = this.resendTokenCountdown - 1;
        }
    }

    resetErrorState() {
        this.flowErrors = '';
        this.verifyData.resetValidations();
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.delayResendAvailabilityTask.cancelAll();
    }
}
