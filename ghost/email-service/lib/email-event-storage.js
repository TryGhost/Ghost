const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, EmailTemporaryBouncedEvent, EmailUnsubscribedEvent, SpamComplaintEvent} = require('@tryghost/email-events');
const moment = require('moment-timezone');
const logging = require('@tryghost/logging');

class EmailEventStorage {
    #db;
    #membersRepository;
    #models;

    constructor({db, models, membersRepository}) {
        this.#db = db;
        this.#models = models;
        this.#membersRepository = membersRepository;
    }

    /**
     * @param {import('@tryghost/domain-events')} domainEvents
     */
    listen(domainEvents) {
        domainEvents.subscribe(EmailDeliveredEvent, async (event) => {
            await this.handleDelivered(event);
        });

        domainEvents.subscribe(EmailOpenedEvent, async (event) => {
            await this.handleOpened(event);
        });

        domainEvents.subscribe(EmailBouncedEvent, async (event) => {
            await this.handlePermanentFailed(event);
        });

        domainEvents.subscribe(EmailTemporaryBouncedEvent, async (event) => {
            await this.handleTemporaryFailed(event);
        });

        domainEvents.subscribe(EmailUnsubscribedEvent, async (event) => {
            await this.handleUnsubscribed(event);
        });

        domainEvents.subscribe(SpamComplaintEvent, async (event) => {
            await this.handleComplained(event);
        });
    }

    async handleDelivered(event) {
        // To properly handle events that are received out of order (this happens because of polling)
        // only set if delivered_at is null
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                delivered_at: this.#db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handleOpened(event) {
        // To properly handle events that are received out of order (this happens because of polling)
        // only set if opened_at is null
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                opened_at: this.#db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handlePermanentFailed(event) {
        // To properly handle events that are received out of order (this happens because of polling)
        // only set if failed_at is null
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                failed_at: this.#db.knex.raw('COALESCE(failed_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
        await this.saveFailure('permanent', event);
    }

    async handleTemporaryFailed(event) {
        await this.saveFailure('temporary', event);
    }

    /**
     * @private
     * @param {'temporary'|'permanent'} severity
     * @param {import('@tryghost/email-events').EmailTemporaryBouncedEvent|import('@tryghost/email-events').EmailBouncedEvent} event
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
                message: event.error.message,
                code: event.error.code,
                enhanced_code: event.error.enhancedCode,
                failed_at: event.timestamp,
                event_id: event.id
            }, options);
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
                message: event.error.message,
                code: event.error.code,
                enhanced_code: event.error.enhancedCode ?? null,
                failed_at: event.timestamp,
                event_id: event.id
            }, {...options, patch: true, autoRefresh: false});
        }
    }

    async handleUnsubscribed(event) {
        return this.unsubscribeFromNewsletters(event);
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

    async unsubscribeFromNewsletters(event) {
        await this.#membersRepository.update({newsletters: []}, {id: event.memberId});
    }
}

module.exports = EmailEventStorage;
