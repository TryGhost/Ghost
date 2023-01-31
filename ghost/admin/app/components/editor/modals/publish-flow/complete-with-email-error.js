import Component from '@glimmer/component';
import EmailFailedError from 'ghost-admin/errors/email-failed-error';
import {CONFIRM_EMAIL_MAX_POLL_LENGTH, CONFIRM_EMAIL_POLL_LENGTH} from '../../publish-management';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isServerUnreachableError} from 'ghost-admin/services/ajax';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

function isString(str) {
    return toString.call(str) === '[object String]';
}

export default class PublishFlowCompleteWithEmailError extends Component {
    @tracked newEmailErrorMessage;
    @tracked retryErrorMessage;
    @inject config;

    get emailErrorMessage() {
        return this.newEmailErrorMessage || this.args.emailErrorMessage;
    }

    @task({drop: true})
    *retryEmailTask() {
        this.retryErrorMessage = null;

        try {
            let email = yield this.args.publishOptions.post.email.retry();

            let pollTimeout = 0;
            if (email && email.status !== 'submitted') {
                while (pollTimeout < CONFIRM_EMAIL_MAX_POLL_LENGTH) {
                    yield timeout(CONFIRM_EMAIL_POLL_LENGTH);
                    pollTimeout += CONFIRM_EMAIL_POLL_LENGTH;

                    email = yield email.reload();

                    if (email.status === 'submitted') {
                        break;
                    }
                    if (email.status === 'failed') {
                        throw new EmailFailedError(email.error);
                    }
                }
            }

            this.args.setCompleted();

            return email;
        } catch (e) {
            // update "failed" state if email fails again
            if (e && e.name === 'EmailFailedError') {
                this.newEmailErrorMessage = e.message;
                return false;
            }

            if (e) {
                let errorMessage = '';

                if (isServerUnreachableError(e)) {
                    errorMessage = 'Unable to connect, please check your internet connection and try again.';
                } else if (e && isString(e)) {
                    errorMessage = e;
                } else if (e?.payload?.errors?.[0].message) {
                    errorMessage = e.payload.errors[0].message;
                } else {
                    errorMessage = 'Unknown Error occurred when attempting to resend';
                }

                this.retryErrorMessage = htmlSafe(errorMessage);
                return false;
            }
        }
    }
}
