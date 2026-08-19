import Component from '@glimmer/component';
import moment from 'moment-timezone';
import paywallPreviewAudience from 'ghost-admin/utils/paywall-preview-audience';
import {capitalizeFirstLetter} from 'ghost-admin/helpers/capitalize-first-letter';
import {htmlSafe} from '@ember/template';
import {isArray} from '@ember/array';
import {isServerUnreachableError} from 'ghost-admin/services/ajax';
import {publishFlowDots} from 'ghost-admin/utils/publish-flow-steps';
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

    get isStepped() {
        return this.feature.publishFlowSteps;
    }

    // Matches the question voice of the earlier steps
    get reviewHeading() {
        if (this.args.publishOptions.isScheduled) {
            return 'Ready to schedule?';
        }

        return this.publishType === 'send' ? 'Ready to send?' : 'Ready to publish?';
    }

    /**
     * Who hits the paywall on the site.
     *
     * Web only: `willEmail` is left false because the email side is now its own
     * sentence, built from the preview audience the author actually chose. Rolled
     * together, the two read as one claim and neither is checkable.
     */
    get webPaywallAudience() {
        if (!this.isStepped || !this.willPublish) {
            return null;
        }

        return paywallPreviewAudience(this.args.publishOptions.post, null, {willPublish: true});
    }

    // Named the same way the preview step named it, so the review confirms a
    // choice rather than restating it in different words
    get previewAudience() {
        if (!this.isStepped || !this.willEmail) {
            return null;
        }

        return this.args.publishOptions.previewAudienceLabel;
    }

    // The legacy single-screen flow still shows the old combined sentence,
    // where web and email are one claim because there's only one audience
    get legacyPreviewAudience() {
        if (this.isStepped) {
            return null;
        }

        return paywallPreviewAudience(this.args.publishOptions.post, this.args.publishOptions.combinedRecipientFilter, {
            willPublish: this.willPublish,
            willEmail: this.willEmail
        });
    }

    // `none` means nobody was picked for the post itself, which is a real state
    // once the preview has an audience of its own
    get hasPostAudience() {
        return this.args.recipientType && this.args.recipientType !== 'none';
    }

    /**
     * The opening half of the sentence the summary blocks finish.
     *
     * "Your post will be" leads straight into "Published on your site" and
     * "Emailed to 812 subscribers", so the review reads as one statement rather
     * than a heading followed by findings. The timing belongs here for the same
     * reason - it qualifies both halves of what follows.
     */
    get summaryLead() {
        const {publishOptions} = this.args;
        // trails off into the summary lines, which finish the sentence
        const subject = `your ${publishOptions.post.displayName} will be…`;

        if (!publishOptions.isScheduled) {
            return capitalizeFirstLetter(subject);
        }

        // same date wording as the confirm button, so the two agree
        const scheduled = moment.tz(publishOptions.scheduledAtUTC, this.settings.timezone);

        return `On ${scheduled.format('MMMM Do')} at ${scheduled.format('HH:mm')}, ${subject}`;
    }

    /**
     * Where it lands on the web, and who meets the paywall there.
     *
     * Null when the post isn't being published - the absence is said by its own
     * note rather than as a line in a list of destinations.
     */
    get siteSummary() {
        if (!this.willPublish) {
            return null;
        }

        // Two sentences rather than a subordinate clause - the destination and
        // its consequence are separate facts, and a comma made the line read as
        // one long qualification.
        //
        // Shorter than the email line on purpose. On the web there's only one
        // page, so the paywall is the whole story; in an inbox the preview is a
        // separate artefact that arrives instead of the post, which is why that
        // line names it. Saying "a preview and the paywall" in both places made
        // two different situations sound identical.
        return this.webPaywallAudience
            ? `Published on your site. ${capitalizeFirstLetter(this.webPaywallAudience)} will see the paywall.`
            : 'Published on your site.';
    }

    // Only worth naming when the site has more than one to choose between
    get newsletterSuffix() {
        const {publishOptions} = this.args;

        return publishOptions.onlyDefaultNewsletter ? '' : ` of ${publishOptions.newsletter.name}`;
    }

    /**
     * Which shape the email sentence takes.
     *
     * Both audiences are independently optional, so the post can reach nobody
     * while the preview reaches someone - and "where X will get a preview"
     * would be wrong there, because there's no "where" to speak of. The counts
     * themselves are fetched in the template, so only the shape is decided here.
     *
     * @returns {'post-and-preview'|'post-only'|'preview-only'|null}
     */
    get emailShape() {
        if (!this.willEmail) {
            return null;
        }

        if (!this.hasPostAudience) {
            return this.previewAudience ? 'preview-only' : null;
        }

        return this.previewAudience ? 'post-and-preview' : 'post-only';
    }

    // -1 puts the flow past every question, on the review
    get dots() {
        return publishFlowDots(this.args.publishOptions, -1);
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
