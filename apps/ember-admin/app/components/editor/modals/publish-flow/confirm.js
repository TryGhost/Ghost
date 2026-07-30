import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {formatNumber} from 'ghost-admin/helpers/format-number';
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
    @service membersCountCache;
    @service router;

    @tracked errorMessage;
    @tracked emailCount = null;

    // store any derived state from PublishOptions on creation so the copy
    // doesn't change whilst the post is saving
    willEmail = this.args.publishOptions.willEmail;
    willPublish = this.args.publishOptions.willPublish;

    constructor() {
        super(...arguments);

        if (this.feature.publishFlowRedesign && this.willEmail) {
            this.fetchEmailCountTask.perform();
        }
    }

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

    get confirmButtonText() {
        let buttonText = '';

        if (this.feature.publishFlowRedesign) {
            buttonText = this.redesignIdleText;
        } else {
            buttonText = this.buttonTextMap[this.publishType].idle;
        }

        if (this.feature.publishFlowRedesign) {
            // the redesign builds the whole sentence, including timing — the
            // suffixes below produced "Publish post — no email, right now"
            return buttonText;
        }

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

    // redesign: the committing button states its consequence in people counts
    // ("Publish & email 143 people") so the highest-stakes fact is read even
    // by users who read nothing else
    get redesignIdleText() {
        const {post, isScheduled, scheduledAtUTC} = this.args.publishOptions;
        const count = this.emailCount === null ? null : formatNumber(this.emailCount);
        const people = `${count} ${this.emailCount === 1 ? 'person' : 'people'}`;

        // a scheduled confirm schedules — it does not publish, and the verb
        // has to say so or the button contradicts what the click does
        if (isScheduled) {
            const when = moment.tz(scheduledAtUTC, this.settings.timezone).format('D MMM [at] HH:mm');

            if (this.publishType === 'publish+send') {
                return count === null
                    ? `Schedule for ${when}`
                    : `Schedule & email ${people} on ${when}`;
            }

            if (this.publishType === 'send') {
                return count === null
                    ? `Schedule email for ${when}`
                    : `Schedule email to ${people} for ${when}`;
            }

            return `Schedule ${post.displayName} for ${when}`;
        }

        if (this.publishType === 'publish+send') {
            return count === null
                ? `Publish & send now`
                : `Publish & email ${people} now`;
        }

        if (this.publishType === 'send') {
            return count === null
                ? `Send email now`
                : `Send to ${people} now`;
        }

        return `Publish ${post.displayName} now — no email`;
    }

    @task
    *fetchEmailCountTask() {
        const count = yield this.membersCountCache.count(this.args.publishOptions.fullRecipientFilter);
        this.emailCount = count;
    }

    // the redesign spends all its weight on the button's words, not on
    // animation — a pulsing publish button injects urgency into the moment
    // that most needs calm
    get confirmIdleClass() {
        return this.feature.publishFlowRedesign ? 'gh-btn-black' : 'gh-btn-pulse';
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
