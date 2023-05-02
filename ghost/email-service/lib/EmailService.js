/* eslint-disable no-unused-vars */

/**
 * @typedef {object} Post
 * @typedef {object} Email
 * @typedef {object} LimitService
 * @typedef {{checkVerificationRequired(): Promise<boolean>}} VerificationTrigger
 */

const BatchSendingService = require('./BatchSendingService');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const EmailRenderer = require('./EmailRenderer');
const EmailSegmenter = require('./EmailSegmenter');
const SendingService = require('./SendingService');
const logging = require('@tryghost/logging');

const messages = {
    archivedNewsletterError: 'Cannot send email to archived newsletters',
    missingNewsletterError: 'The post does not have a newsletter relation',
    emailSendingDisabled: `Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org`,
    retryEmailStatusError: 'Can only retry emails for published posts'
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
        // Block accidentaly retrying non-published posts (can happen due to bugs in frontend)
        const post = await email.getLazyRelation('post');
        if (post.get('status') !== 'published' && post.get('status') !== 'sent') {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.retryEmailStatusError)
            });
        }

        await this.checkLimits();

        // Change email status back to 'pending' before scheduling
        // so we have a immediate response when retrying an email (schedule can take a while to kick off sometimes)
        if (email.get('status') === 'failed') {
            await email.save({status: 'pending'}, {patch: true});
        }

        this.#batchSendingService.scheduleEmail(email);
        return email;
    }

    /**
     * @params {string} [segment]
     * @return {import('./EmailRenderer').MemberLike}
     */
    getDefaultExampleMember(segment) {
        /**
         * @type {import('./EmailRenderer').MemberLike}
         */
        return {
            id: 'example-id',
            uuid: 'example-uuid',
            email: 'jamie@example.com',
            name: 'Jamie Larson',
            createdAt: new Date(),
            status: segment === 'status:free' ? 'free' : 'paid',
            subscriptions: segment === 'status:free' ? [] : [
                {
                    cancel_at_period_end: false,
                    trial_end_at: null,
                    current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    status: 'active'
                }
            ],
            tiers: []
        };
    }

    /**
     * @private
     * @param {string} [email] (optional) Search for a member with this email address and use it as the example. If not found, defaults to the default but still uses the provided email address.
     * @param {string} [segment] (optional) The segment to use for the example member
     * @return {Promise<import('./EmailRenderer').MemberLike>}
     */
    async getExampleMember(email, segment) {
        /**
         * @type {import('./EmailRenderer').MemberLike}
         */
        const exampleMember = this.getDefaultExampleMember(segment);

        // fetch any matching members so that replacements use expected values
        if (email) {
            const member = await this.#membersRepository.get({email});
            if (member) {
                exampleMember.id = member.id;
                exampleMember.uuid = member.get('uuid');
                exampleMember.email = member.get('email');
                exampleMember.name = member.get('name');
                exampleMember.createdAt = member.get('created_at');

                if (segment === 'status:-free' && member.get('status') !== 'free') {
                    // Make sure the example member matches the chosen segment (otherwise we'll send an email to free segment, but include a paid member details, which looks like a bug)
                    exampleMember.status = member.get('status');
                    const subscriptions = (await member.getLazyRelation('stripeSubscriptions')).toJSON();
                    exampleMember.subscriptions = subscriptions;

                    const tiers = (await member.getLazyRelation('products')).toJSON();
                    exampleMember.tiers = tiers;
                }
            } else {
                exampleMember.name = ''; // Force empty name to simulate name fallbacks
                exampleMember.email = email;
            }
        }

        return exampleMember;
    }

    /**
     * Do a manual replacement of tokens with values for a member (normally only used for previews)
     *
     * @param {string} htmlOrPlaintext
     * @param {import('./EmailRenderer').ReplacementDefinition[]} replacements
     * @param {import('./EmailRenderer').MemberLike} member
     * @return {string}
     */
    replaceDefinitions(htmlOrPlaintext, replacements, member) {
        // Do manual replacements with an example member
        for (const replacement of replacements) {
            htmlOrPlaintext = htmlOrPlaintext.replace(replacement.token, replacement.getValue(member));
        }
        return htmlOrPlaintext;
    }

    /**
     *
     * @param {*} post
     * @param {*} newsletter
     * @param {import('./EmailRenderer').Segment} segment
     * @returns {Promise<{subject: string, html: string, plaintext: string}>} Email preview
     */
    async previewEmail(post, newsletter, segment) {
        const exampleMember = await this.getExampleMember(null, segment);

        const subject = this.#emailRenderer.getSubject(post);
        let {html, plaintext, replacements} = await this.#emailRenderer.renderBody(post, newsletter, segment, {clickTrackingEnabled: false});

        return {
            subject,
            html: this.replaceDefinitions(html, replacements, exampleMember),
            plaintext: this.replaceDefinitions(plaintext, replacements, exampleMember)
        };
    }

    /**
     *
     * @param {*} post
     * @param {*} newsletter
     * @param {import('./EmailRenderer').Segment} segment
     * @param {string[]} emails
     */
    async sendTestEmail(post, newsletter, segment, emails) {
        const members = [];
        for (const email of emails) {
            members.push(await this.getExampleMember(email, segment));
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
