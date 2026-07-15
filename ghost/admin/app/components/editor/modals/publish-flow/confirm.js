import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {getPublicPreviewPaywallRecipientFilter} from 'ghost-admin/utils/public-preview';
import {htmlSafe} from '@ember/template';
import {isArray} from '@ember/array';
import {isServerUnreachableError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

function isString(str) {
    return toString.call(str) === '[object String]';
}

export default class PublishFlowOptions extends Component {
    @service settings;
    @service feature;
    @service router;

    @tracked errorMessage;

    // store any derived state from PublishOptions on creation so the copy
    // doesn't change whilst the post is saving
    willEmail = this.args.publishOptions.willEmail;
    willPublish = this.args.publishOptions.willPublish;

    buttonTextMap = {
        'publish+send': {
            idle: 'Publish & send',
            running: 'Publishing & sending',
            success: 'Published & sent'
        },
        send: {
            idle: 'Send email',
            running: 'Sending',
            success: 'Sent'
        },
        publish: {
            idle: 'Publish',
            running: 'Publishing',
            success: 'Published'
        },
        schedule: {
            // idle: '', - uses underlying publish type text
            running: 'Scheduling',
            success: 'Scheduled'
        }
    };

    get publishType() {
        const {publishOptions} = this.args;

        if (this.willPublish && this.willEmail) {
            return 'publish+send';
        } else if (publishOptions.willOnlyEmail) {
            return 'send';
        } else {
            return 'publish';
        }
    }

    get publicPreviewPaywallRecipientFilter() {
        const publishOptions = this.args.publishOptions;

        return getPublicPreviewPaywallRecipientFilter({
            post: publishOptions.post,
            publicPreviewStatus: this.args.publicPreviewStatus,
            fullRecipientFilter: publishOptions.fullRecipientFilter,
            willEmail: this.willEmail
        });
    }

    get hasPublicPreviewWebPaywall() {
        const post = this.args.publishOptions.post;

        return this.willPublish
            && this.args.publicPreviewStatus === 'valid'
            && ['members', 'paid', 'tiers'].includes(post.visibility);
    }

    get postAccessDescription() {
        const post = this.args.publishOptions.post;
        const visibility = post.visibility || this.settings.defaultContentVisibility || 'public';

        if (visibility === 'tiers') {
            return `${post.displayName} for specific tiers`;
        }

        const accessLabels = {
            public: 'public',
            members: 'members only',
            paid: 'paid-members only'
        };

        return `${accessLabels[visibility] || 'public'} ${post.displayName}`;
    }

    get confirmButtonText() {
        let buttonText = '';

        buttonText = this.buttonTextMap[this.publishType].idle;

        if (this.publishType === 'publish') {
            buttonText += ` ${this.args.publishOptions.post.displayName}`;
        }

        if (this.args.publishOptions.isScheduled) {
            const scheduleMoment = moment.tz(this.args.publishOptions.scheduledAtUTC, this.settings.timezone);
            buttonText += `, on ${scheduleMoment.format('MMMM Do')}`;
        } else {
            buttonText += ', right now';
        }

        return buttonText;
    }

    get confirmRunningText() {
        const publishType = this.args.publishOptions.isScheduled ? 'schedule' : this.publishType;
        return this.buttonTextMap[publishType].running;
    }

    get confirmSuccessText() {
        const publishType = this.args.publishOptions.isScheduled ? 'schedule' : this.publishType;
        return this.buttonTextMap[publishType].success;
    }

    @task({drop: true})
    *confirmTask() {
        this.errorMessage = null;

        try {
            yield this.args.saveTask.perform();
            this.args.setCompleted();
        } catch (e) {
            if (e === undefined && this.args.publishOptions.post.errors.length !== 0) {
                // validation error
                const validationError = this.args.publishOptions.post.errors.messages[0];
                this.errorMessage = `Validation failed: ${validationError}`;
                return false;
            }

            let errorMessage = '';

            const payloadError = e?.payload?.errors?.[0];

            if (isServerUnreachableError(e)) {
                errorMessage = 'Unable to connect, please check your internet connection and try again.';
            } else if (payloadError?.type === 'HostLimitError') {
                errorMessage = htmlSafe(payloadError.context.replace(/please upgrade/i, '<a href="#/pro">$&</a>'));
            } else if (e && isString(e)) {
                errorMessage = e;
            } else if (e && isArray(e)) {
                // This is here because validation errors are returned as an array
                // TODO: remove this once validations are fixed
                errorMessage = e[0];
            } else if (payloadError?.message) {
                errorMessage = e.payload.errors[0].message;
            } else {
                errorMessage = 'Unknown Error';
            }

            this.errorMessage = htmlSafe(errorMessage);
            return false;
        }
    }
}
