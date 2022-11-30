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
            try {
                await this.handleDelivered(event);
            } catch (err) {
                logging.error(err);
            }
        });

        domainEvents.subscribe(EmailOpenedEvent, async (event) => {
            try {
                await this.handleOpened(event);
            } catch (err) {
                logging.error(err);
            }
        });

        domainEvents.subscribe(EmailBouncedEvent, async (event) => {
            try {
                await this.handlePermanentFailed(event);
            } catch (e) {
                logging.error(e);
            }
        });

        domainEvents.subscribe(EmailTemporaryBouncedEvent, async (event) => {
            try {
                await this.handleTemporaryFailed(event);
            } catch (e) {
                logging.error(e);
            }
        });

        domainEvents.subscribe(EmailUnsubscribedEvent, async (event) => {
            try {
                await this.handleUnsubscribed(event);
            } catch (e) {
                logging.error(e);
            }
        });

        domainEvents.subscribe(SpamComplaintEvent, async (event) => {
            try {
                await this.handleComplained(event);
            } catch (e) {
                logging.error(e);
            }
        });
    }

    async handleDelivered(event) {
        // To properly handle events that are received out of order (this happens because of polling)
        // we only can set an email recipient to delivered if they are not already marked as failed
        // Why handle this her?  An email can be 'delivered' and later have a delayed bounce event. So we need to prevent that delivered_at is set again.
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .whereNull('failed_at')
            .update({
                delivered_at: this.#db.knex.raw('COALESCE(delivered_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handleOpened(event) {
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                opened_at: this.#db.knex.raw('COALESCE(opened_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')])
            });
    }

    async handlePermanentFailed(event) {
        await this.#db.knex('email_recipients')
            .where('id', '=', event.emailRecipientId)
            .update({
                failed_at: this.#db.knex.raw('COALESCE(failed_at, ?)', [moment.utc(event.timestamp).format('YYYY-MM-DD HH:mm:ss')]),
                delivered_at: null // Reset in case we have a delayed bounce event
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
            filter: `email_recipient_id:${event.emailRecipientId}`
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
            }, {...options, patch: true});
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
