const moment = require('moment-timezone');
const logging = require('@tryghost/logging');

class EmailEventStorage {
    #db;
    #membersRepository;
    #models;
    #emailSuppressionList;
    #prometheusClient;

    constructor({db, models, membersRepository, emailSuppressionList, prometheusClient}) {
        this.#db = db;
        this.#models = models;
        this.#membersRepository = membersRepository;
        this.#emailSuppressionList = emailSuppressionList;
        this.#prometheusClient = prometheusClient;

        if (this.#prometheusClient) {
            this.#prometheusClient.registerCounter({
                name: 'email_analytics_events_stored',
                help: 'Number of email analytics events stored',
                labelNames: ['event']
            });
        }
    }

    async handleDelivered(event) {
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

    async handleOpened(event) {
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

    async handlePermanentFailed(event) {
        // To properly handle events that are received out of order (this happens because of polling)
        // only set if failed_at is null
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .whereNull('failed_at')
            .update({
                failed_at: moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')
            });
        await this.saveFailure('permanent', event);
    }

    async handleTemporaryFailed(event) {
        await this.saveFailure('temporary', event);
    }

    /**
     * @private
     * @param {'temporary'|'permanent'} severity
     * @param {import('@tryghost/email-service').EmailTemporaryBouncedEvent|import('@tryghost/email-service').EmailBouncedEvent} event
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
}

module.exports = EmailEventStorage;
