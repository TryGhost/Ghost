const moment = require('moment-timezone');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

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

        // Initialize pending updates for batched processing
        this.#pendingUpdates = {
            delivered: new Map(), // recipientId -> timestamp
            opened: new Map(), // recipientId -> timestamp
            failed: new Map() // recipientId -> timestamp
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
        const useBatchProcessing = config.get('emailAnalytics:batchProcessing');

        if (useBatchProcessing) {
            // Accumulate update for batch processing
            const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
            const existing = this.#pendingUpdates.delivered.get(event.emailRecipientId);

            // Keep the earliest timestamp (out-of-order protection)
            if (!existing || timestamp < existing) {
                this.#pendingUpdates.delivered.set(event.emailRecipientId, timestamp);
            }
        } else {
            // Sequential mode: immediate update
            // To properly handle events that are received out of order (this happens because of polling)
            // only set if delivered_at is null
            const rowCount = await this.#db.knex('email_recipients')
                .where('id', '=', event.emailRecipientId)
                .whereNull('delivered_at')
                .update({
                    delivered_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')
                });
            this.recordEventStored('delivered', rowCount);
        }
    }

    async handleOpened(event) {
        const useBatchProcessing = config.get('emailAnalytics:batchProcessing');

        if (useBatchProcessing) {
            // Accumulate update for batch processing
            const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
            const existing = this.#pendingUpdates.opened.get(event.emailRecipientId);

            // Keep the earliest timestamp (out-of-order protection)
            if (!existing || timestamp < existing) {
                this.#pendingUpdates.opened.set(event.emailRecipientId, timestamp);
            }
        } else {
            // Sequential mode: immediate update
            // To properly handle events that are received out of order (this happens because of polling)
            // only set if opened_at is null
            const rowCount = await this.#db.knex('email_recipients')
                .where('id', '=', event.emailRecipientId)
                .whereNull('opened_at')
                .update({
                    opened_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')
                });
            this.recordEventStored('opened', rowCount);
        }
    }

    async handlePermanentFailed(event) {
        const useBatchProcessing = config.get('emailAnalytics:batchProcessing');

        if (useBatchProcessing) {
            // Accumulate update for batch processing
            const timestamp = moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss');
            const existing = this.#pendingUpdates.failed.get(event.emailRecipientId);

            // Keep the earliest timestamp (out-of-order protection)
            if (!existing || timestamp < existing) {
                this.#pendingUpdates.failed.set(event.emailRecipientId, timestamp);
            }
        } else {
            // Sequential mode: immediate update
            // To properly handle events that are received out of order (this happens because of polling)
            // only set if failed_at is null
            await this.#db.knex('email_recipients')
                .where('id', '=', event.emailRecipientId)
                .whereNull('failed_at')
                .update({
                    failed_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')
                });
        }
        await this.saveFailure('permanent', event);
    }

    async handleTemporaryFailed(event) {
        await this.saveFailure('temporary', event);
    }

    /**
     * @private
     * @param {'temporary'|'permanent'} severity
     * @param {import('./events/email-temporary-bounced-event')|import('./events/email-bounced-event')} event
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

            // Remove from Mailgun's suppression list so it doesn't affect other sites on the same domain
            await this.#emailSuppressionList.removeComplaint(event.email);
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
     * Flush all batched updates to the database
     * @returns {Promise<void>}
     */
    async flushBatchedUpdates() {
        const deliveredCount = this.#pendingUpdates.delivered.size;
        const openedCount = this.#pendingUpdates.opened.size;
        const failedCount = this.#pendingUpdates.failed.size;

        if (deliveredCount === 0 && openedCount === 0 && failedCount === 0) {
            return; // Nothing to flush
        }

        // Flush delivered events
        if (deliveredCount > 0) {
            await this.#flushDeliveredUpdates();
        }

        // Flush opened events
        if (openedCount > 0) {
            await this.#flushOpenedUpdates();
        }

        // Flush failed events
        if (failedCount > 0) {
            await this.#flushFailedUpdates();
        }

        // Clear the pending updates
        this.#pendingUpdates.delivered.clear();
        this.#pendingUpdates.opened.clear();
        this.#pendingUpdates.failed.clear();
    }

    /**
     * @private
     */
    async #flushDeliveredUpdates() {
        const updates = Array.from(this.#pendingUpdates.delivered.entries());
        if (updates.length === 0) {
            return;
        }

        // Build CASE statement for batched update
        const recipientIds = updates.map(([id]) => id);
        const caseClauses = updates.map(([id, timestamp]) => {
            return `WHEN '${id}' THEN '${timestamp}'`;
        }).join(' ');

        const sql = `
            UPDATE email_recipients
            SET delivered_at = CASE id ${caseClauses} END
            WHERE id IN (${recipientIds.map(() => '?').join(',')})
            AND delivered_at IS NULL
        `;

        const rowCount = await this.#db.knex.raw(sql, recipientIds);
        this.recordEventStored('delivered', updates.length);
        return rowCount;
    }

    /**
     * @private
     */
    async #flushOpenedUpdates() {
        const updates = Array.from(this.#pendingUpdates.opened.entries());
        if (updates.length === 0) {
            return;
        }

        // Build CASE statement for batched update
        const recipientIds = updates.map(([id]) => id);
        const caseClauses = updates.map(([id, timestamp]) => {
            return `WHEN '${id}' THEN '${timestamp}'`;
        }).join(' ');

        const sql = `
            UPDATE email_recipients
            SET opened_at = CASE id ${caseClauses} END
            WHERE id IN (${recipientIds.map(() => '?').join(',')})
            AND opened_at IS NULL
        `;

        const rowCount = await this.#db.knex.raw(sql, recipientIds);
        this.recordEventStored('opened', updates.length);
        return rowCount;
    }

    /**
     * @private
     */
    async #flushFailedUpdates() {
        const updates = Array.from(this.#pendingUpdates.failed.entries());
        if (updates.length === 0) {
            return;
        }

        // Build CASE statement for batched update
        const recipientIds = updates.map(([id]) => id);
        const caseClauses = updates.map(([id, timestamp]) => {
            return `WHEN '${id}' THEN '${timestamp}'`;
        }).join(' ');

        const sql = `
            UPDATE email_recipients
            SET failed_at = CASE id ${caseClauses} END
            WHERE id IN (${recipientIds.map(() => '?').join(',')})
            AND failed_at IS NULL
        `;

        const rowCount = await this.#db.knex.raw(sql, recipientIds);
        return rowCount;
    }
}

module.exports = EmailEventStorage;
