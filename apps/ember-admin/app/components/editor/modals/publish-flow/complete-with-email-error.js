import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isServerUnreachableError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';
import {waitForEmailHandOff} from '../../publish-management';

function isString(str) {
    return toString.call(str) === '[object String]';
}

export default class PublishFlowCompleteWithEmailError extends Component {
    @tracked canRetry = false;
    @tracked retryErrorMessage;
    @tracked retryEligibilityErrorMessage;
    @inject config;
    @service store;

    constructor() {
        super(...arguments);
        this.fetchRetryEligibilityTask.perform();
    }

    @task({restartable: true})
    *fetchRetryEligibilityTask() {
        this.retryEligibilityErrorMessage = null;
        const email = this.args.publishOptions.post.email;
        if (!email?.id) {
            this.canRetry = false;
            return;
        }
        try {
            const sending = yield this.store.adapterFor('email').sendingStatus(email);
            this.canRetry = sending?.status === 'failed' && sending.retryable === true;
        } catch {
            this.retryEligibilityErrorMessage = 'Could not check whether this email can be retried. Please try checking again.';
        }
    }

    get isPartialError() {
        // For now we look at the error message.
        // This is covered in E2E tests so we'll be notified when this changes.
        return this.args.emailErrorMessage?.includes('partially');
    }

    // Like a publish, the retried send is handed to post analytics rather than awaited
    @task({drop: true})
    *retryEmailTask() {
        if (!this.canRetry) {
            return;
        }
        this.retryErrorMessage = null;
        const startedAt = Date.now();

        try {
            yield this.args.publishOptions.post.email.retry();
        } catch (e) {
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
            // A rejected retry means the eligibility on screen is stale.
            yield this.fetchRetryEligibilityTask.perform();
            return false;
        }

        yield* waitForEmailHandOff(startedAt);
        this.args.setCompleted();
        return true;
    }
}
