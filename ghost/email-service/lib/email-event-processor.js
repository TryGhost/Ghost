const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, SpamComplaintEvent, EmailUnsubscribedEvent, EmailTemporaryBouncedEvent} = require('@tryghost/email-events');

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
 * WARNING: this class is used in a separate thread (an offloaded job). Be careful when working with settings and models.
 */
class EmailEventProcessor {
    #domainEvents;
    #db;

    constructor({domainEvents, db}) {
        this.#domainEvents = domainEvents;
        this.#db = db;

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
            this.#domainEvents.dispatch(EmailDeliveredEvent.create({
                email: emailIdentification.email,
                emailRecipientId: recipient.emailRecipientId,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            }));
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
            this.#domainEvents.dispatch(EmailOpenedEvent.create({
                email: emailIdentification.email,
                emailRecipientId: recipient.emailRecipientId,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            }));
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
            this.#domainEvents.dispatch(EmailTemporaryBouncedEvent.create({
                id, 
                error,
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                emailRecipientId: recipient.emailRecipientId,
                timestamp
            }));
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
            this.#domainEvents.dispatch(EmailBouncedEvent.create({
                id,
                error,
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                emailRecipientId: recipient.emailRecipientId,
                timestamp
            }));
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
            this.#domainEvents.dispatch(EmailUnsubscribedEvent.create({
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            }));
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
            this.#domainEvents.dispatch(SpamComplaintEvent.create({
                email: emailIdentification.email,
                memberId: recipient.memberId,
                emailId: recipient.emailId,
                timestamp
            }));
        }
        return recipient;
    }

    /**
     * @private
     * @param {EmailIdentification} emailIdentification 
     * @returns {Promise<EmailRecipientInformation|undefined>}
     */
    async getRecipient(emailIdentification) {
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
