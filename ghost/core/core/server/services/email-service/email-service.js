/* eslint-disable no-unused-vars */

/**
 * @typedef {object} Post
 * @typedef {object} Email
 * @typedef {object} LimitService
 * @typedef {{checkVerificationRequired(): Promise<boolean>}} VerificationTrigger
 * @typedef {import ('./domain-warming-service').DomainWarmingService} DomainWarmingService
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
    emailSendingDisabled: `Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org`,
    retryEmailStatusError: 'Can only retry emails for published posts',
    retryEmailNotFailed: 'Only failed emails can be retried'
};

// Resume scanner won't pick up `submitting` rows older than this. Rows beyond the cutoff
// are flipped to `failed` on first boot so they surface in admin UI for operator review
// rather than being silently resumed (and sending stale newsletters to current members).
// Override via `bulkEmail:resumeMaxAgeMs` in config.
const DEFAULT_RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    #domainWarmingService;
    #config;

    /**
     *
     * @param {object} dependencies
     * @param {BatchSendingService} dependencies.batchSendingService
     * @param {SendingService} dependencies.sendingService
     * @param {object} dependencies.models
     * @param {object} dependencies.models.Email
     * @param {object} [dependencies.models.EmailBatch] - Required for resumeInterruptedSends breadcrumbs
     * @param {object} dependencies.settingsCache
     * @param {EmailRenderer} dependencies.emailRenderer
     * @param {EmailSegmenter} dependencies.emailSegmenter
     * @param {LimitService} dependencies.limitService
     * @param {object} dependencies.membersRepository
     * @param {VerificationTrigger} dependencies.verificationTrigger
     * @param {object} dependencies.emailAnalyticsJobs
     * @param {DomainWarmingService} dependencies.domainWarmingService
     * @param {object} [dependencies.config] - Config service for reading host settings
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
        emailAnalyticsJobs,
        domainWarmingService,
        config
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
        this.#domainWarmingService = domainWarmingService;
        this.#config = config;
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
            const customMessage = this.#config?.get('hostSettings:emailVerification:emailSendingDisabledMessage');
            throw new errors.HostLimitError({
                message: customMessage || tpl(messages.emailSendingDisabled),
                code: 'EMAIL_VERIFICATION_NEEDED'
            });
        }
    }

    /**
     * Pre-check if email sending would be allowed before making any post changes.
     * This validates limits and verification requirements early to avoid leaving
     * posts in a stuck "sent" state if email creation would fail.
     *
     * @param {object} newsletter - The newsletter model to send to
     * @param {string} emailRecipientFilter - The recipient filter for the email
     * @returns {Promise<{emailCount: number}>} The email count if checks pass, throws if email cannot be sent
     */
    async checkCanSendEmail(newsletter, emailRecipientFilter) {
        if (!newsletter) {
            throw new errors.EmailError({
                message: tpl(messages.missingNewsletterError)
            });
        }

        if (newsletter.get('status') !== 'active') {
            // A post might have been scheduled to an archived newsletter.
            // Don't send it (people can't unsubscribe any longer).
            throw new errors.BadRequestError({
                message: tpl(messages.archivedNewsletterError)
            });
        }

        const emailCount = await this.#emailSegmenter.getMembersCount(newsletter, emailRecipientFilter);
        await this.checkLimits(emailCount);

        return {emailCount};
    }

    /**
     *
     * @param {Post} post
     * @returns {Promise<Email>}
     */
    async createEmail(post) {
        const newsletter = await post.getLazyRelation('newsletter');
        const emailRecipientFilter = post.get('email_recipient_filter');

        const {emailCount} = await this.checkCanSendEmail(newsletter, emailRecipientFilter);

        const csdEmailCount = this.#domainWarmingService.isEnabled()
            ? await this.#domainWarmingService.getWarmupLimit(emailCount)
            : undefined; // Undefined here means domain warming was not used -- distinct from 0

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
            csd_email_count: csdEmailCount,
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
            await this.#emailAnalyticsJobs.scheduleRecurringNewslettersJob(true);
        } catch (e) {
            logging.error(e);
        }

        return email;
    }

    /**
     * Boot-time scanner: resumes newsletter emails left in `submitting` after a
     * previous container's interrupted send. Iterates sequentially; one failure
     * does not skip others. Rows older than the configured max-age are flipped
     * to `failed` (not resumed) so stale content does not get sent to current members.
     */
    async resumeInterruptedSends() {
        const maxAgeMs = this.#config?.get?.('bulkEmail:resumeMaxAgeMs') ?? DEFAULT_RESUME_MAX_AGE_MS;
        const cutoffIso = new Date(Date.now() - maxAgeMs).toISOString();

        // Stale rows: too old to safely resume. Flip to `failed` so they surface in admin UI
        // for operator review instead of being silently left in `submitting` forever.
        const stale = await this.#models.Email.findAll({
            filter: `status:submitting+created_at:<'${cutoffIso}'`
        });
        const staleList = stale.models || stale;
        for (const email of staleList) {
            try {
                const locked = await this.#batchSendingService.updateStatusLock(
                    this.#models.Email,
                    email.id,
                    'failed',
                    ['submitting']
                );
                if (locked) {
                    logging.warn(`Email resume: ${email.id} created_at=${email.get('created_at') && new Date(email.get('created_at')).toISOString()} exceeds max age (${maxAgeMs}ms) — flipped to failed for operator review`);
                }
            } catch (e) {
                logging.error(e);
            }
        }

        // Fresh rows: within the cutoff. Resume through the normal emailJob path.
        const emails = await this.#models.Email.findAll({
            filter: `status:submitting+created_at:>'${cutoffIso}'`
        });
        const list = emails.models || emails;
        if (staleList.length === 0 && list.length === 0) {
            return;
        }
        if (list.length > 0) {
            logging.info(`Email resume: found ${list.length} email(s) in submitting status within max age (${maxAgeMs}ms)`);
        }

        for (const email of list) {
            try {
                await this.#resumeOneEmail(email);
            } catch (e) {
                logging.error(e);
            }
        }

        logging.info(`Email resume scan complete: ${staleList.length} stale email(s) flipped to failed, ${list.length} fresh email(s) rescheduled`);
    }

    async #resumeOneEmail(email) {
        const post = await email.getLazyRelation('post');
        const postStatus = post ? post.get('status') : null;
        const sendable = postStatus === 'published' || postStatus === 'sent';

        if (!sendable) {
            // Parent post was unpublished or deleted while the email was in flight.
            // Can't resume — mark the email as failed so it stops showing as "submitting".
            const locked = await this.#batchSendingService.updateStatusLock(
                this.#models.Email,
                email.id,
                'failed',
                ['submitting']
            );
            if (locked) {
                logging.warn(`Email resume: ${email.id} parent post status=${postStatus} is not sendable — marked email as failed`);
            }
            return;
        }

        // Flip submitting -> pending so emailJob's status lock (['pending', 'failed']) admits it.
        // If updateStatusLock returns undefined, another path raced us — just continue.
        const locked = await this.#batchSendingService.updateStatusLock(
            this.#models.Email,
            email.id,
            'pending',
            ['submitting']
        );
        if (!locked) {
            logging.info(`Email resume: ${email.id} status changed before lock could be taken — skipping`);
            return;
        }

        // Structured breadcrumb so post-incident timing/batch state is recoverable from logs.
        const breadcrumb = await this.#buildResumeBreadcrumb(email);
        logging.warn(`Email resume: scheduling ${email.id} for re-send ${JSON.stringify(breadcrumb)}`);

        // Skip checkLimits — this email already passed limits when first sent.
        this.#batchSendingService.scheduleEmail(email);
    }

    async #buildResumeBreadcrumb(email) {
        const counts = {};
        let latestStatusWrite = email.get('updated_at') || email.get('created_at');
        if (this.#models.EmailBatch) {
            try {
                const batches = await this.#models.EmailBatch.findAll({
                    filter: `email_id:'${email.id}'`
                });
                for (const batch of batches.models || batches) {
                    const status = batch.get('status');
                    counts[status] = (counts[status] || 0) + 1;
                    const updatedAt = batch.get('updated_at');
                    if (updatedAt && (!latestStatusWrite || updatedAt > latestStatusWrite)) {
                        latestStatusWrite = updatedAt;
                    }
                }
            } catch (e) {
                // Breadcrumb is best-effort; never block resume on it.
                logging.warn(`Email resume: could not build breadcrumb for ${email.id}: ${e.message}`);
            }
        }
        const msSinceLastStatusWrite = latestStatusWrite
            ? Date.now() - new Date(latestStatusWrite).getTime()
            : null;
        const targetDeliveryWindowMs = this.#config?.get?.('bulkEmail:targetDeliveryWindow') ?? 0;
        return {
            email_id: email.id,
            post_id: email.get('post_id'),
            batch_counts_by_status: counts,
            ms_since_last_status_write: msSinceLastStatusWrite,
            target_delivery_window_ms: targetDeliveryWindowMs
        };
    }

    async retryEmail(email) {
        // Block accidentaly retrying non-published posts (can happen due to bugs in frontend)
        const post = await email.getLazyRelation('post');
        if (post.get('status') !== 'published' && post.get('status') !== 'sent') {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.retryEmailStatusError)
            });
        }

        if (email.get('status') !== 'failed') {
            throw new errors.BadRequestError({
                message: tpl(messages.retryEmailNotFailed)
            });
        }

        await this.checkLimits();

        // Change email status back to 'pending' before scheduling
        // so we have a immediate response when retrying an email (schedule can take a while to kick off sometimes)
        await email.save({status: 'pending'}, {patch: true});

        this.#batchSendingService.scheduleEmail(email);
        return email;
    }

    /**
     * @params {string} [segment]
     * @return {import('./email-renderer').MemberLike}
     */
    getDefaultExampleMember(segment) {
        /**
         * @type {import('./email-renderer').MemberLike}
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
     * @return {Promise<import('./email-renderer').MemberLike>}
     */
    async getExampleMember(email, segment) {
        /**
         * @type {import('./email-renderer').MemberLike}
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
     * @param {import('./email-renderer').ReplacementDefinition[]} replacements
     * @param {import('./email-renderer').MemberLike} member
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
     * @param {import('./email-renderer').Segment} segment
     * @returns {Promise<{subject: string, html: string, plaintext: string}>} Email preview
     */
    async previewEmail(post, newsletter, segment) {
        const exampleMember = await this.getExampleMember(null, segment);
        const renderSegment = this.#emailRenderer.getPreviewSegment(post, segment);

        const subject = this.#emailRenderer.getSubject(post);
        let {html, plaintext, replacements} = await this.#emailRenderer.renderBody(post, newsletter, renderSegment, {clickTrackingEnabled: false});

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
     * @param {import('./email-renderer').Segment} segment
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
            segment: this.#emailRenderer.getPreviewSegment(post, segment),
            members,
            emailId: null
        }, {
            clickTrackingEnabled: false,
            openTrackingEnabled: false,
            isTestEmail: true
        });
    }
}

module.exports = EmailService;
