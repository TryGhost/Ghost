const moment = require('moment-timezone');
const logging = require('@tryghost/logging');

class EmailEventStorage {
    #db;
    #membersRepository;
    #models;
    #emailSuppressionList;
    #prometheusClient;
    #pendingUpdates;

    constructor({db, models, membersRepository, emailSuppressionList, prometheusClient}) {
        this.#db = db;
        this.#models = models;
        this.#membersRepository = membersRepository;
        this.#emailSuppressionList = emailSuppressionList;
        this.#prometheusClient = prometheusClient;

        // Accumulate events for batch processing
        this.#pendingUpdates = {
            delivered: new Map(), // recipientId -> timestamp
            opened: new Map(),
            failed: new Map()
        };

        if (this.#prometheusClient) {
            this.#prometheusClient.registerCounter({
                name: 'email_analytics_events_stored',
                help: 'Number of email analytics events stored',
                labelNames: ['event']
            });
        }
    }

    async handleDelivered(event) {
        // Accumulate for batch processing - keep newest timestamp if duplicate
        const existing = this.#pendingUpdates.delivered.get(event.emailRecipientId);
        if (!existing || event.timestamp > existing) {
            this.#pendingUpdates.delivered.set(event.emailRecipientId, event.timestamp);
        }
    }

    async handleOpened(event) {
        // Accumulate for batch processing - keep newest timestamp if duplicate
        const existing = this.#pendingUpdates.opened.get(event.emailRecipientId);
        if (!existing || event.timestamp > existing) {
            this.#pendingUpdates.opened.set(event.emailRecipientId, event.timestamp);
        }
    }

    async handlePermanentFailed(event) {
        // Accumulate for batch processing - keep newest timestamp if duplicate
        const existing = this.#pendingUpdates.failed.get(event.emailRecipientId);
        if (!existing || event.timestamp > existing) {
            this.#pendingUpdates.failed.set(event.emailRecipientId, event.timestamp);
        }
        // Still need to save failure record immediately (separate table)
        await this.saveFailure('permanent', event);
    }

    async handleTemporaryFailed(event) {
        await this.saveFailure('temporary', event);
    }

    /**
     * @private
     * @param {'temporary'|'permanent'} severity
     * @param {import('./events/EmailTemporaryBouncedEvent')|import('./events/EmailBouncedEvent')} event
     * @param {{transacting?: any}} options
     * @returns
     */
    async saveFailure(severity, event, options = {}) {
        if (!event.error) {
            logging.warn(`Missing error information provided for ${severity} failure event with id ${event.id}`);
            return;
        }

        if (!options || !options.transacting) {
            return await this.#models.EmailRecipientFailure.transaction(async (transacting) => {
                await this.saveFailure(severity, event, {transacting});
            });
        }

        // Create a forUpdate transaction
        const existing = await this.#models.EmailRecipientFailure.findOne({
            email_recipient_id: event.emailRecipientId
        }, {...options, require: false, forUpdate: true});

        if (!existing) {
            // Create a new failure
            await this.#models.EmailRecipientFailure.add({
                email_id: event.emailId,
                member_id: event.memberId,
                email_recipient_id: event.emailRecipientId,
                severity,
                message: event.error.message || `Error ${event.error.enhancedCode ?? event.error.code}`,
                code: event.error.code,
                enhanced_code: event.error.enhancedCode,
                failed_at: event.timestamp,
                event_id: event.id
            }, {...options, autoRefresh: false});
        } else {
            if (existing.get('severity') === 'permanent') {
                // Already marked as failed, no need to change anything here
                return;
            }

            if (existing.get('failed_at') > event.timestamp) {
                /// We can get events out of order, so only save the last one
                return;
            }

            // Update the existing failure
            await existing.save({
                severity,
                message: event.error.message || `Error ${event.error.enhancedCode ?? event.error.code}`,
                code: event.error.code,
                enhanced_code: event.error.enhancedCode ?? null,
                failed_at: event.timestamp,
                event_id: event.id
            }, {...options, patch: true, autoRefresh: false});
        }
    }

    async handleUnsubscribed(event) {
        try {
            // Unsubscribe member from the specific newsletter
            const newsletters = await this.findNewslettersToKeep(event);
            await this.#membersRepository.update({newsletters}, {id: event.memberId});

            // Remove member from Mailgun's suppression list
            await this.#emailSuppressionList.removeUnsubscribe(event.email);
        } catch (err) {
            logging.error(err);
        }
    }

    async handleComplained(event) {
        try {
            await this.#models.EmailSpamComplaintEvent.add({
                member_id: event.memberId,
                email_id: event.emailId,
                email_address: event.email
            });
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                logging.error(err);
            }
        }
    }

    async findNewslettersToKeep(event) {
        try {
            const member = await this.#membersRepository.get({email: event.email}, {
                withRelated: ['newsletters']
            });
            const existingNewsletters = member.related('newsletters');

            const email = await this.#models.Email.findOne({id: event.emailId});
            const newsletterToRemove = email.get('newsletter_id');

            return existingNewsletters.models.filter(newsletter => newsletter.id !== newsletterToRemove).map((n) => {
                return {id: n.id};
            });
        } catch (err) {
            logging.error(err);
            return [];
        }
    }

    /**
     * Record event stored
     * @param {string} event
     * @param {number} count
     */
    recordEventStored(event, count = 1) {
        try {
            this.#prometheusClient?.getMetric('email_analytics_events_stored')?.inc({event}, count);
        } catch (err) {
            logging.error('Error recording email analytics event stored', err);
        }
    }

    /**
     * Flush all pending batched updates to the database
     * Uses CASE statements to update multiple recipients in a single query
     * @returns {Promise<{delivered: number, opened: number, failed: number}>} Count of rows updated
     */
    async flushBatchedUpdates() {
        const delivered = this.#pendingUpdates.delivered;
        const opened = this.#pendingUpdates.opened;
        const failed = this.#pendingUpdates.failed;

        // Collect all unique recipient IDs that need updating
        const allRecipientIds = new Set([
            ...delivered.keys(),
            ...opened.keys(),
            ...failed.keys()
        ]);

        if (allRecipientIds.size === 0) {
            return {delivered: 0, opened: 0, failed: 0};
        }

        const recipientIds = Array.from(allRecipientIds);

        // Build CASE statements for each field
        const deliveredCases = [];
        const openedCases = [];
        const failedCases = [];

        for (const recipientId of recipientIds) {
            const deliveredTimestamp = delivered.get(recipientId);
            const openedTimestamp = opened.get(recipientId);
            const failedTimestamp = failed.get(recipientId);

            if (deliveredTimestamp) {
                const formattedTime = moment.utc(deliveredTimestamp).format('YYYY-MM-DD HH:mm:ss');
                deliveredCases.push(`WHEN '${recipientId}' THEN '${formattedTime}'`);
            }

            if (openedTimestamp) {
                const formattedTime = moment.utc(openedTimestamp).format('YYYY-MM-DD HH:mm:ss');
                openedCases.push(`WHEN '${recipientId}' THEN '${formattedTime}'`);
            }

            if (failedTimestamp) {
                const formattedTime = moment.utc(failedTimestamp).format('YYYY-MM-DD HH:mm:ss');
                failedCases.push(`WHEN '${recipientId}' THEN '${formattedTime}'`);
            }
        }

        // Build the UPDATE query with CASE statements
        // Only update if current value is NULL (handles out-of-order events)
        const setClauses = [];

        if (deliveredCases.length > 0) {
            setClauses.push(`delivered_at = CASE WHEN delivered_at IS NULL THEN CASE id ${deliveredCases.join(' ')} ELSE delivered_at END ELSE delivered_at END`);
        }

        if (openedCases.length > 0) {
            setClauses.push(`opened_at = CASE WHEN opened_at IS NULL THEN CASE id ${openedCases.join(' ')} ELSE opened_at END ELSE opened_at END`);
        }

        if (failedCases.length > 0) {
            setClauses.push(`failed_at = CASE WHEN failed_at IS NULL THEN CASE id ${failedCases.join(' ')} ELSE failed_at END ELSE failed_at END`);
        }

        if (setClauses.length === 0) {
            return {delivered: 0, opened: 0, failed: 0};
        }

        // Execute the batch update
        await this.#db.knex.raw(`
            UPDATE email_recipients
            SET ${setClauses.join(', ')}
            WHERE id IN (${recipientIds.map(id => `'${id}'`).join(',')})
        `);

        // Record metrics
        this.recordEventStored('delivered', delivered.size);
        this.recordEventStored('opened', opened.size);
        this.recordEventStored('failed', failed.size);

        // Clear the pending updates
        const counts = {
            delivered: delivered.size,
            opened: opened.size,
            failed: failed.size
        };

        this.#pendingUpdates.delivered.clear();
        this.#pendingUpdates.opened.clear();
        this.#pendingUpdates.failed.clear();

        return counts;
    }

    /**
     * Get the count of pending updates waiting to be flushed
     * @returns {{delivered: number, opened: number, failed: number, total: number}}
     */
    getPendingUpdateCount() {
        const delivered = this.#pendingUpdates.delivered.size;
        const opened = this.#pendingUpdates.opened.size;
        const failed = this.#pendingUpdates.failed.size;

        // Count unique recipients across all types
        const allRecipientIds = new Set([
            ...this.#pendingUpdates.delivered.keys(),
            ...this.#pendingUpdates.opened.keys(),
            ...this.#pendingUpdates.failed.keys()
        ]);

        return {
            delivered,
            opened,
            failed,
            total: allRecipientIds.size
        };
    }
}

module.exports = EmailEventStorage;
