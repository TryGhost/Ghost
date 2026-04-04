const logging = require('@tryghost/logging');

const EmailDeliveredEvent = require('./events/email-delivered-event');
const EmailOpenedEvent = require('./events/email-opened-event');
const EmailBouncedEvent = require('./events/email-bounced-event');
const EmailTemporaryBouncedEvent = require('./events/email-temporary-bounced-event');
const EmailUnsubscribedEvent = require('./events/email-unsubscribed-event');
const SpamComplaintEvent = require('./events/spam-complaint-event');

async function waitForEvent() {
    return new Promise((resolve) => {
        setTimeout(resolve, 70);
    });
}

/**
 * @typedef EmailIdentification
 * @property {string} email
 * @property {string} providerId
 * @property {string} [emailId] Optional email id
 */

/**
 * @typedef EmailRecipientInformation
 * @property {string} emailRecipientId
 * @property {string} memberId
 * @property {string} emailId
 */

/**
 * @typedef EmailEventStorage
 * @property {(event: EmailDeliveredEvent) => Promise<void>} handleDelivered
 * @property {(event: EmailOpenedEvent) => Promise<void>} handleOpened
 * @property {(event: EmailBouncedEvent) => Promise<void>} handlePermanentFailed
 * @property {(event: EmailTemporaryBouncedEvent) => Promise<void>} handleTemporaryFailed
 * @property {(event: EmailUnsubscribedEvent) => Promise<void>} handleUnsubscribed
 * @property {(event: SpamComplaintEvent) => Promise<void>} handleComplained
 */

/**
 * WARNING: this class is used in a separate thread (an offloaded job). Be careful when working with settings and models.
 */
class EmailEventProcessor {
    #domainEvents;
    #db;
    #eventStorage;
    #prometheusClient;
    constructor({domainEvents, db, eventStorage, prometheusClient}) {
        this.#domainEvents = domainEvents;
        this.#db = db;
        this.#eventStorage = eventStorage;
        this.#prometheusClient = prometheusClient;
        // Avoid having to query email_batch by provider_id for every event
        this.providerIdEmailIdMap = {};

        if (this.#prometheusClient) {
            this.#prometheusClient.registerCounter({
                name: 'email_analytics_events_processed',
                help: 'Number of email analytics events processed',
                labelNames: ['event']
            });
        }
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handleDelivered(emailIdentification, timestamp, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = EmailDeliveredEvent.create({
                email: emailIdentification.email,
                emailRecipientId: recipient.emailRecipientId,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            });
            await this.#eventStorage.handleDelivered(event);

            this.#domainEvents.dispatch(event);
            this.recordEventProcessed('delivered');
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handleOpened(emailIdentification, timestamp, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = EmailOpenedEvent.create({
                email: emailIdentification.email,
                emailRecipientId: recipient.emailRecipientId,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            });
            this.#domainEvents.dispatch(event);
            await this.#eventStorage.handleOpened(event);
            this.recordEventProcessed('opened');
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {{id: string, timestamp: Date, error: {code: number; message: string; enhandedCode: string|number} | null}} event
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handleTemporaryFailed(emailIdentification, {timestamp, error, id}, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = EmailTemporaryBouncedEvent.create({
                id,
                error,
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                emailRecipientId: recipient.emailRecipientId,
                timestamp
            });
            await this.#eventStorage.handleTemporaryFailed(event);

            this.#domainEvents.dispatch(event);
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {{id: string, timestamp: Date, error: {code: number; message: string; enhandedCode: string|number} | null}} event
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handlePermanentFailed(emailIdentification, {timestamp, error, id}, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = EmailBouncedEvent.create({
                id,
                error,
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                emailRecipientId: recipient.emailRecipientId,
                timestamp
            });
            await this.#eventStorage.handlePermanentFailed(event);

            this.#domainEvents.dispatch(event);
            await waitForEvent(); // Avoids knex connection pool to run dry
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handleUnsubscribed(emailIdentification, timestamp, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = EmailUnsubscribedEvent.create({
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            });
            await this.#eventStorage.handleUnsubscribed(event);

            this.#domainEvents.dispatch(event);
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     */
    async handleComplained(emailIdentification, timestamp, recipientCache) {
        const recipient = await this.getRecipient(emailIdentification, recipientCache);
        if (recipient) {
            const event = SpamComplaintEvent.create({
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            });
            await this.#eventStorage.handleComplained(event);

            this.#domainEvents.dispatch(event);
            await waitForEvent(); // Avoids knex connection pool to run dry
        }
        return recipient;
    }

    /**
     * @private
     * @param {EmailIdentification} emailIdentification
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional cache for batched processing
     * @returns {Promise<EmailRecipientInformation|undefined>}
     */
    async getRecipient(emailIdentification, recipientCache) {
        if (!emailIdentification.emailId && !emailIdentification.providerId) {
            // Protection if both are null or undefined
            return;
        }

        // With the provider_id and email address we can look for the EmailRecipient
        const emailId = emailIdentification.emailId ?? await this.getEmailId(emailIdentification.providerId);
        if (!emailId) {
            // Invalid
            return;
        }

        // Check cache first if batched processing is enabled
        if (recipientCache) {
            const key = `${emailIdentification.email}:${emailId}`;
            const cached = recipientCache.get(key);
            if (cached) {
                return cached;
            }
        }

        // Fall back to individual query for backwards compatibility
        const {id: emailRecipientId, member_id: memberId} = await this.#db.knex('email_recipients')
            .select('id', 'member_id')
            .where('member_email', emailIdentification.email)
            .where('email_id', emailId)
            .first() || {};

        if (emailRecipientId && memberId) {
            return {
                emailRecipientId,
                memberId,
                emailId
            };
        }
    }

    /**
     * Record event processed
     * @param {string} event
     */
    recordEventProcessed(event) {
        try {
            if (this.#prometheusClient) {
                this.#prometheusClient.getMetric('email_analytics_events_processed')?.inc({event});
            }
        } catch (err) {
            logging.error('Error recording email analytics event processed', err);
        }
    }

    /**
     * @private
     * @param {string} providerId
     * @returns {Promise<string|undefined>}
     */
    async getEmailId(providerId) {
        if (this.providerIdEmailIdMap[providerId]) {
            return this.providerIdEmailIdMap[providerId];
        }

        const {emailId} = await this.#db.knex('email_batches')
            .select('email_id as emailId')
            .where('provider_id', providerId)
            .first() || {};

        if (!emailId) {
            return;
        }

        this.providerIdEmailIdMap[providerId] = emailId;
        return emailId;
    }

    /**
     * Batch lookup recipients for all events
     * @param {Array<EmailIdentification>} emailIdentifications
     * @returns {Promise<Map<string, EmailRecipientInformation>>}
     */
    async batchGetRecipients(emailIdentifications) {
        const recipientCache = new Map();

        if (!emailIdentifications || emailIdentifications.length === 0) {
            return recipientCache;
        }

        // Step 1: Resolve all providerId -> emailId mappings
        const providerIds = [...new Set(
            emailIdentifications
                .filter(e => e.providerId && !e.emailId)
                .map(e => e.providerId)
        )];

        if (providerIds.length > 0) {
            const providerIdMapping = await this.#db.knex('email_batches')
                .select('provider_id', 'email_id')
                .whereIn('provider_id', providerIds);

            for (const row of providerIdMapping) {
                this.providerIdEmailIdMap[row.provider_id] = row.email_id;
            }
        }

        // Step 2: Build list of (email, emailId) pairs to lookup
        const lookups = [];
        for (const identification of emailIdentifications) {
            const emailId = identification.emailId ?? this.providerIdEmailIdMap[identification.providerId];
            if (emailId && identification.email) {
                lookups.push({
                    email: identification.email,
                    emailId: emailId
                });
            }
        }

        if (lookups.length === 0) {
            return recipientCache;
        }

        // Step 3: Batch query all recipients with OR conditions
        // Build the WHERE clause with OR conditions
        const recipientQuery = this.#db.knex('email_recipients')
            .select('id', 'member_id', 'email_id', 'member_email');

        // Add WHERE conditions - need to build complex OR query
        recipientQuery.where(function () {
            for (const lookup of lookups) {
                this.orWhere(function () {
                    this.where('member_email', lookup.email)
                        .andWhere('email_id', lookup.emailId);
                });
            }
        });

        const recipients = await recipientQuery;

        // Step 4: Build cache map keyed by "email:emailId"
        for (const recipient of recipients) {
            const key = `${recipient.member_email}:${recipient.email_id}`;
            recipientCache.set(key, {
                emailRecipientId: recipient.id,
                memberId: recipient.member_id,
                emailId: recipient.email_id
            });
        }

        return recipientCache;
    }

    /**
     * Flush any batched updates to the database
     * @returns {Promise<void>}
     */
    async flushBatchedUpdates() {
        return await this.#eventStorage.flushBatchedUpdates();
    }
}

module.exports = EmailEventProcessor;
