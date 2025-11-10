const logging = require('@tryghost/logging');

const EmailDeliveredEvent = require('./events/EmailDeliveredEvent');
const EmailOpenedEvent = require('./events/EmailOpenedEvent');
const EmailBouncedEvent = require('./events/EmailBouncedEvent');
const EmailTemporaryBouncedEvent = require('./events/EmailTemporaryBouncedEvent');
const EmailUnsubscribedEvent = require('./events/EmailUnsubscribedEvent');
const SpamComplaintEvent = require('./events/SpamComplaintEvent');

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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handleDelivered(emailIdentification, timestamp, recipientCache = null) {
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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handleOpened(emailIdentification, timestamp, recipientCache = null) {
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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handleTemporaryFailed(emailIdentification, {timestamp, error, id}, recipientCache = null) {
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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handlePermanentFailed(emailIdentification, {timestamp, error, id}, recipientCache = null) {
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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handleUnsubscribed(emailIdentification, timestamp, recipientCache = null) {
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
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     */
    async handleComplained(emailIdentification, timestamp, recipientCache = null) {
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
     * Batch lookup recipients for multiple events at once
     * @param {Array<{emailId?: string, providerId?: string, email: string}>} emailIdentifications
     * @returns {Promise<Map<string, EmailRecipientInformation>>} Map keyed by "email:emailId"
     */
    async batchGetRecipients(emailIdentifications) {
        const recipientMap = new Map();

        if (!emailIdentifications || emailIdentifications.length === 0) {
            return recipientMap;
        }

        // Track statistics for logging
        let eventsWithEmailId = 0;
        let eventsNeedingLookup = 0;
        let eventsFromCache = 0;

        // First, batch resolve providerIds to emailIds for events that don't have emailId
        // emailId is present for emails sent by Ghost (via user-variables['email-id']),
        // but may be missing for older emails sent before this feature was added
        const providerIdsToResolve = new Set();
        for (const identification of emailIdentifications) {
            if (identification.emailId) {
                eventsWithEmailId += 1;
            } else if (identification.providerId) {
                if (this.providerIdEmailIdMap[identification.providerId]) {
                    eventsFromCache += 1;
                } else {
                    eventsNeedingLookup += 1;
                    providerIdsToResolve.add(identification.providerId);
                }
            }
        }

        // Log statistics
        if (emailIdentifications.length > 0) {
            logging.info(`[EmailAnalytics] batchGetRecipients: ${emailIdentifications.length} events - ${eventsWithEmailId} with emailId, ${eventsFromCache} from cache, ${eventsNeedingLookup} need lookup`);
        }

        // Batch fetch all missing emailIds in a single query
        if (providerIdsToResolve.size > 0) {
            const providerIdArray = Array.from(providerIdsToResolve);
            const lookupStart = Date.now();
            logging.info(`[EmailAnalytics] Looking up ${providerIdsToResolve.size} providerIds in batch query`);
            
            const emailBatchMappings = await this.#db.knex('email_batches')
                .select('provider_id', 'email_id')
                .whereIn('provider_id', providerIdArray);

            const lookupDuration = Date.now() - lookupStart;
            logging.info(`[EmailAnalytics] Batch lookup completed in ${lookupDuration}ms - found ${emailBatchMappings.length}/${providerIdsToResolve.size} mappings`);

            // Cache the results
            for (const mapping of emailBatchMappings) {
                this.providerIdEmailIdMap[mapping.provider_id] = mapping.email_id;
            }
        }

        // Build list of lookups with resolved emailIds
        const lookups = [];
        for (const identification of emailIdentifications) {
            if (!identification.emailId && !identification.providerId) {
                continue;
            }

            const emailId = identification.emailId ?? this.providerIdEmailIdMap[identification.providerId];
            if (!emailId) {
                continue;
            }

            lookups.push({
                email: identification.email,
                emailId: emailId
            });
        }

        if (lookups.length === 0) {
            return recipientMap;
        }

        // Process in batches to avoid very large OR queries
        const MAX_RECIPIENT_BATCH_SIZE = 500;
        const recipientQueryStart = Date.now();
        let recipientQueryBatches = 0;
        
        for (let i = 0; i < lookups.length; i += MAX_RECIPIENT_BATCH_SIZE) {
            const batchLookups = lookups.slice(i, i + MAX_RECIPIENT_BATCH_SIZE);
            recipientQueryBatches += 1;

            // Build query with OR conditions for this batch
            const batchQueryStart = Date.now();
            const recipients = await this.#db.knex('email_recipients')
                .select('id', 'member_id', 'email_id', 'member_email')
                .where((builder) => {
                    for (const lookup of batchLookups) {
                        builder.orWhere({
                            member_email: lookup.email,
                            email_id: lookup.emailId
                        });
                    }
                });
            const batchQueryDuration = Date.now() - batchQueryStart;

            if (batchLookups.length > 100) {
                logging.info(`[EmailAnalytics] Recipient query batch ${recipientQueryBatches}: ${batchLookups.length} lookups, ${recipients.length} found, ${batchQueryDuration}ms`);
            }

            // Build map: "email:emailId" -> recipient info
            for (const recipient of recipients) {
                const key = `${recipient.member_email}:${recipient.email_id}`;
                recipientMap.set(key, {
                    emailRecipientId: recipient.id,
                    memberId: recipient.member_id,
                    emailId: recipient.email_id
                });
            }
        }

        const recipientQueryDuration = Date.now() - recipientQueryStart;
        if (lookups.length > 100) {
            logging.info(`[EmailAnalytics] Total recipient queries: ${recipientQueryBatches} batches, ${lookups.length} lookups, ${recipientMap.size} recipients found, ${recipientQueryDuration}ms`);
        }

        return recipientMap;
    }

    /**
     * @private
     * @param {EmailIdentification} emailIdentification
     * @param {Map<string, EmailRecipientInformation>} [recipientCache] Optional pre-fetched recipient cache
     * @returns {Promise<EmailRecipientInformation|undefined>}
     */
    async getRecipient(emailIdentification, recipientCache = null) {
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

        // Check cache first if provided
        if (recipientCache) {
            const key = `${emailIdentification.email}:${emailId}`;
            const cached = recipientCache.get(key);
            if (cached) {
                return cached;
            }
        }

        // Fall back to individual query (for backwards compatibility)
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
     * Flush batched updates to email_recipients table
     * @returns {Promise<{delivered: number, opened: number, failed: number}>}
     */
    async flushBatchedUpdates() {
        return await this.#eventStorage.flushBatchedUpdates();
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

        // Log individual lookups (should be rare if batchGetRecipients is used)
        logging.warn(`[EmailAnalytics] Individual getEmailId() lookup for providerId: ${providerId?.substring(0, 50)}...`);
        
        const queryStart = Date.now();
        const {emailId} = await this.#db.knex('email_batches')
            .select('email_id as emailId')
            .where('provider_id', providerId)
            .first() || {};
        const queryDuration = Date.now() - queryStart;

        if (!emailId) {
            logging.warn(`[EmailAnalytics] getEmailId() lookup failed for providerId: ${providerId?.substring(0, 50)}... (${queryDuration}ms)`);
            return;
        }

        logging.warn(`[EmailAnalytics] getEmailId() lookup succeeded: ${providerId?.substring(0, 50)}... -> ${emailId} (${queryDuration}ms)`);
        this.providerIdEmailIdMap[providerId] = emailId;
        return emailId;
    }
}

module.exports = EmailEventProcessor;
