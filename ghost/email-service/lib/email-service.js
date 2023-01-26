/* eslint-disable no-unused-vars */

/**
 * @typedef {object} Post
 * @typedef {object} Email
 * @typedef {object} LimitService
 * @typedef {{checkVerificationRequired(): Promise<boolean>}} VerificationTrigger
 */

const BatchSendingService = require('./batch-sending-service');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const EmailRenderer = require('./email-renderer');
const EmailSegmenter = require('./email-segmenter');
const SendingService = require('./sending-service');
const logging = require('@tryghost/logging');

const messages = {
    archivedNewsletterError: 'Cannot send email to archived newsletters',
    missingNewsletterError: 'The post does not have a newsletter relation',
    emailSendingDisabled: `Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org`
};

class EmailService {
    #batchSendingService;
    #sendingService;
    #models;
    #settingsCache;
    #emailRenderer;
    #emailSegmenter;
    #limitService;
    #membersRepository;
    #verificationTrigger;
    #emailAnalyticsJobs;

    /**
     *
     * @param {object} dependencies
     * @param {BatchSendingService} dependencies.batchSendingService
     * @param {SendingService} dependencies.sendingService
     * @param {object} dependencies.models
     * @param {object} dependencies.models.Email
     * @param {object} dependencies.settingsCache
     * @param {EmailRenderer} dependencies.emailRenderer
     * @param {EmailSegmenter} dependencies.emailSegmenter
     * @param {LimitService} dependencies.limitService
     * @param {object} dependencies.membersRepository
     * @param {VerificationTrigger} dependencies.verificationTrigger
     * @param {object} dependencies.emailAnalyticsJobs
     */
    constructor({
        batchSendingService,
        sendingService,
        models,
        settingsCache,
        emailRenderer,
        emailSegmenter,
        limitService,
        membersRepository,
        verificationTrigger,
        emailAnalyticsJobs
    }) {
        this.#batchSendingService = batchSendingService;
        this.#models = models;
        this.#settingsCache = settingsCache;
        this.#emailRenderer = emailRenderer;
        this.#emailSegmenter = emailSegmenter;
        this.#limitService = limitService;
        this.#membersRepository = membersRepository;
        this.#sendingService = sendingService;
        this.#verificationTrigger = verificationTrigger;
        this.#emailAnalyticsJobs = emailAnalyticsJobs;
    }

    /**
     * @private
     */
    async checkLimits(addedCount = 0) {
        // Check host limit for allowed member count and throw error if over limit
        // - do this even if it's a retry so that there's no way around the limit
        if (this.#limitService.isLimited('members')) {
            await this.#limitService.errorIfIsOverLimit('members');
        }

        // Check host limit for disabled emails or going over emails limit
        if (this.#limitService.isLimited('emails')) {
            await this.#limitService.errorIfWouldGoOverLimit('emails', {addedCount});
        }

        // Check if email verification is required
        if (await this.#verificationTrigger.checkVerificationRequired()) {
            throw new errors.HostLimitError({
                message: tpl(messages.emailSendingDisabled)
            });
        }
    }

    /**
     *
     * @param {Post} post
     * @returns {Promise<Email>}
     */
    async createEmail(post) {
        let newsletter = await post.getLazyRelation('newsletter');
        if (!newsletter) {
            throw new errors.EmailError({
                message: tpl(messages.missingNewsletterError)
            });
        }

        if (newsletter.get('status') !== 'active') {
            // A post might have been scheduled to an archived newsletter.
            // Don't send it (people can't unsubscribe any longer).
            throw new errors.EmailError({
                message: tpl(messages.archivedNewsletterError)
            });
        }

        const emailRecipientFilter = post.get('email_recipient_filter');
        const emailCount = await this.#emailSegmenter.getMembersCount(newsletter, emailRecipientFilter);
        await this.checkLimits(emailCount);

        const email = await this.#models.Email.add({
            post_id: post.id,
            newsletter_id: newsletter.id,
            status: 'pending',
            submitted_at: new Date(),
            track_opens: !!this.#settingsCache.get('email_track_opens'),
            track_clicks: !!this.#settingsCache.get('email_track_clicks'),
            feedback_enabled: !!newsletter.get('feedback_enabled'),
            recipient_filter: emailRecipientFilter,
            subject: this.#emailRenderer.getSubject(post),
            from: this.#emailRenderer.getFromAddress(post, newsletter),
            replyTo: this.#emailRenderer.getReplyToAddress(post, newsletter),
            email_count: emailCount,
            source: post.get('lexical') || post.get('mobiledoc'),
            source_type: post.get('lexical') ? 'lexical' : 'mobiledoc'
        });

        try {
            this.#batchSendingService.scheduleEmail(email);
        } catch (e) {
            await email.save({
                status: 'failed',
                error: e.message || 'Something went wrong while scheduling the email'
            }, {patch: true});
        }

        // make sure recurring background analytics jobs are running once we have emails
        try {
            await this.#emailAnalyticsJobs.scheduleRecurringJobs(true);
        } catch (e) {
            logging.error(e);
        }

        return email;
    }
    async retryEmail(email) {
        await this.checkLimits();
        this.#batchSendingService.scheduleEmail(email);
        return email;
    }

    /**
     * @private
     * @param {string} [email] (optional) Search for a member with this email address and use it as the example. If not found, defaults to the default but still uses the provided email address.
     * @return {Promise<import('./email-renderer').MemberLike>}
     */
    async getExampleMember(email) {
        /**
         * @type {import('./email-renderer').MemberLike}
         */
        const exampleMember = {
            id: 'example-id',
            uuid: 'example-uuid',
            email: 'jamie@example.com',
            name: 'Jamie Larson'
        };

        // fetch any matching members so that replacements use expected values
        if (email) {
            const member = await this.#membersRepository.get({email});
            if (member) {
                exampleMember.id = member.id;
                exampleMember.uuid = member.get('uuid');
                exampleMember.email = member.get('email');
                exampleMember.name = member.get('name');
            } else {
                exampleMember.name = ''; // Force empty name to simulate name fallbacks
                exampleMember.email = email;
            }
        }

        return exampleMember;
    }

    /**
     *
     * @param {*} post
     * @param {*} newsletter
     * @param {import('./email-renderer').Segment} segment
     * @returns {Promise<{subject: string, html: string, plaintext: string}>} Email preview
     */
    async previewEmail(post, newsletter, segment) {
        const exampleMember = await this.getExampleMember();

        const subject = this.#emailRenderer.getSubject(post);
        let {html, plaintext, replacements} = await this.#emailRenderer.renderBody(post, newsletter, segment, {clickTrackingEnabled: false});

        // Do manual replacements with an example member
        for (const replacement of replacements) {
            html = html.replace(replacement.token, replacement.getValue(exampleMember));
            plaintext = plaintext.replace(replacement.token, replacement.getValue(exampleMember));
        }

        return {
            subject,
            html,
            plaintext
        };
    }

    /**
     *
     * @param {*} post
     * @param {*} newsletter
     * @param {import('./email-renderer').Segment} segment
     * @param {string[]} emails
     */
    async sendTestEmail(post, newsletter, segment, emails) {
        const members = [];
        for (const email of emails) {
            members.push(await this.getExampleMember(email));
        }

        await this.#sendingService.send({
            post,
            newsletter,
            segment,
            members,
            emailId: null
        }, {
            clickTrackingEnabled: false,
            openTrackingEnabled: false
        });
    }
}

module.exports = EmailService;
