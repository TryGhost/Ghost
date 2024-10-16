const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, SpamComplaintEvent, EmailUnsubscribedEvent, EmailTemporaryBouncedEvent} = require('@tryghost/email-events');

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

    constructor({domainEvents, db, eventStorage}) {
        this.#domainEvents = domainEvents;
        this.#db = db;
        this.#eventStorage = eventStorage;

        // Avoid having to query email_batch by provider_id for every event
        this.providerIdEmailIdMap = {};
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     */
    async handleDelivered(emailIdentification, timestamp) {
        const recipient = await this.getRecipient(emailIdentification);
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
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {Date} timestamp
     */
    async handleOpened(emailIdentification, timestamp) {
        const recipient = await this.getRecipient(emailIdentification);
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
        }
        return recipient;
    }

    /**
     * @param {EmailIdentification} emailIdentification
     * @param {{id: string, timestamp: Date, error: {code: number; message: string; enhandedCode: string|number} | null}} event
     */
    async handleTemporaryFailed(emailIdentification, {timestamp, error, id}) {
        const recipient = await this.getRecipient(emailIdentification);
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
     */
    async handlePermanentFailed(emailIdentification, {timestamp, error, id}) {
        const recipient = await this.getRecipient(emailIdentification);
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
     */
    async handleUnsubscribed(emailIdentification, timestamp) {
        const recipient = await this.getRecipient(emailIdentification);
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
     */
    async handleComplained(emailIdentification, timestamp) {
        const recipient = await this.getRecipient(emailIdentification);
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
     * @returns {Promise<EmailRecipientInformation|undefined>}
     */
    async getRecipient(emailIdentification) {
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
}

module.exports = EmailEventProcessor;
