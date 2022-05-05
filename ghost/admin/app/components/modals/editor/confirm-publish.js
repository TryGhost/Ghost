import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ConfirmPublishModal extends Component {
    @service membersCountCache;
    @service session;
    @service store;

    @tracked errorMessage = null;
    @tracked errorDetailsOpen = false;
    @tracked memberCount = null;
    @tracked memberCountString = null;

    get isEmailOnlyWithNoMembers() {
        return this.isEmailOnly && this.memberCount === 0;
    }

    get publishAndSendButtonText() {
        if (this.isEmailOnly) {
            return 'Send';
        }

        if (this.isPublishOnly || this.memberCount === 0) {
            return 'Publish';
        }

        return 'Publish and Send';
    }

    constructor() {
        super(...arguments);

        // set static up-front so it doesn't change when post is saved and email is created
        this.isPublishOnly = this.args.data.sendEmailWhenPublished === 'none'
            || this.args.data.post.displayName === 'page'
            || this.args.data.post.email;

        this.isEmailOnly = this.args.data.emailOnly;
    }

    @action
    confirm() {
        if (this.errorMessage) {
            return this.retryEmailTask.perform();
        } else {
            if (!this.countRecipientsTask.isRunning) {
                return this.confirmAndCheckErrorTask.perform();
            }
        }
    }

    @action
    toggleErrorDetails() {
        this.errorDetailsOpen = !this.errorDetailsOpen;
    }

    @task
    *countRecipientsTask() {
        const {sendEmailWhenPublished,newsletter} = this.args.data;
        const filter = `${newsletter.recipientFilter}+(${sendEmailWhenPublished})`;

        this.memberCount = sendEmailWhenPublished ? (yield this.membersCountCache.count(filter)) : 0;
        this.memberCountString = sendEmailWhenPublished ? (yield this.membersCountCache.countString(filter)) : '0 members';
    }

    @task
    *confirmAndCheckErrorTask() {
        try {
            yield this.args.data.confirm();
            this.args.close();
            return true;
        } catch (e) {
            // switch to "failed" state if email fails
            if (e && e.name === 'EmailFailedError') {
                this.errorMessage = e.message;
                return false;
            }

            // close modal and continue with normal error handling if it was
            // a non-email-related error
            this.args.close();

            if (e) {
                throw e;
            }
        }
    }

    @task
    *retryEmailTask() {
        try {
            yield this.args.data.retryEmailSend();
            this.args.close();
            return true;
        } catch (e) {
            // update "failed" state if email fails again
            if (e && e.name === 'EmailFailedError') {
                this.errorMessage = e.message;
                return;
            }

            // TODO: test a non-email failure - maybe this needs to go through
            // the notifications service
            if (e) {
                throw e;
            }
        }
    }
}
