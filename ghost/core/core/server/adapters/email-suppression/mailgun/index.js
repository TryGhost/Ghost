/* eslint-disable ghost/filenames/match-exported-class */
// Filename must be index.js for adapter module resolution (email-suppression/mailgun → email-suppression/mailgun/index.js)
const EmailSuppressionBase = require('../EmailSuppressionBase');
const {EmailSuppressionData, EmailSuppressedEvent} = require('../../../services/email-suppression-list/EmailSuppressionList');
const SpamComplaintEvent = require('../../../services/email-service/events/SpamComplaintEvent');
const EmailBouncedEvent = require('../../../services/email-service/events/EmailBouncedEvent');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const models = require('../../../models');

/**
 * Mailgun Email Suppression List Adapter
 *
 * Manages email suppression lists (bounces, spam complaints, unsubscribes) through Mailgun's API.
 * Extends EmailSuppressionBase to work with Ghost's AdapterManager.
 */
class MailgunEmailSuppressionAdapter extends EmailSuppressionBase {
    #apiClient;
    #Suppression;

    /**
     * @param {Object} config - Adapter configuration
     * @param {Object} config.apiClient - Mailgun API client with suppression methods
     * @param {Object} [config.Suppression] - Suppression model (defaults to models.Suppression)
     */
    constructor(config) {
        super(config);

        if (!config.apiClient) {
            const errors = require('@tryghost/errors');
            throw new errors.IncorrectUsageError({
                message: 'Mailgun suppression adapter requires apiClient'
            });
        }

        this.#apiClient = config.apiClient;
        this.#Suppression = config.Suppression || models.Suppression;
    }

    /**
     * Remove an email address from all suppression lists
     *
     * @param {string} email - Email address to remove
     * @returns {Promise<boolean>} True if successfully removed, false otherwise
     */
    async removeEmail(email) {
        try {
            await this.#apiClient.removeBounce(email);
            await this.#apiClient.removeComplaint(email);
            await this.#apiClient.removeUnsubscribe(email);
        } catch (err) {
            logging.error(err);
            return false;
        }

        try {
            await this.#Suppression.destroy({
                destroyBy: {
                    email: email
                }
            });
        } catch (err) {
            logging.error(err);
            return false;
        }

        return true;
    }

    /**
     * Remove an email from the unsubscribe list only
     *
     * @param {string} email - Email address to remove from unsubscribe list
     * @returns {Promise<boolean>} True if successfully removed, false otherwise
     */
    async removeUnsubscribe(email) {
        try {
            await this.#apiClient.removeUnsubscribe(email);
            return true;
        } catch (err) {
            logging.error(err);
            return false;
        }
    }

    /**
     * Get suppression data for a single email address
     *
     * @param {string} email - Email address to check
     * @returns {Promise<EmailSuppressionData>} Suppression status and info
     */
    async getSuppressionData(email) {
        try {
            const model = await this.#Suppression.findOne({
                email: email
            });

            if (!model) {
                return new EmailSuppressionData(false);
            }

            return new EmailSuppressionData(true, {
                timestamp: model.get('created_at'),
                reason: model.get('reason') === 'spam' ? 'spam' : 'fail'
            });
        } catch (err) {
            logging.error(err);
            return new EmailSuppressionData(false);
        }
    }

    /**
     * Get suppression data for multiple email addresses
     *
     * @param {string[]} emails - Array of email addresses to check
     * @returns {Promise<EmailSuppressionData[]>} Array of suppression data in same order as input
     */
    async getBulkSuppressionData(emails) {
        if (emails.length === 0) {
            return [];
        }

        try {
            const collection = await this.#Suppression.findAll({
                filter: `email:[${emails.map(email => `'${email}'`).join(',')}]`
            });

            return emails.map((email) => {
                const model = collection.models.find(m => m.get('email') === email);

                if (!model) {
                    return new EmailSuppressionData(false);
                }

                return new EmailSuppressionData(true, {
                    timestamp: model.get('created_at'),
                    reason: model.get('reason') === 'spam' ? 'spam' : 'fail'
                });
            });
        } catch (err) {
            logging.error(err);
            return emails.map(() => new EmailSuppressionData(false));
        }
    }

    /**
     * Initialize the adapter by subscribing to domain events
     *
     * This method sets up event listeners for bounce and spam complaint events
     * and automatically adds them to the suppression list.
     */
    async init() {
        const handleEvent = reason => async (event) => {
            try {
                if (reason === 'bounce') {
                    if (!Number.isInteger(event.error?.code)) {
                        return;
                    }
                    if (event.error.code !== 607 && event.error.code !== 605) {
                        return;
                    }
                }
                await this.#Suppression.add({
                    email: event.email,
                    email_id: event.emailId,
                    reason: reason,
                    created_at: event.timestamp
                });
                DomainEvents.dispatch(EmailSuppressedEvent.create({
                    emailAddress: event.email,
                    emailId: event.emailId,
                    reason: reason
                }, event.timestamp));
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY') {
                    logging.error(err);
                }
            }
        };
        DomainEvents.subscribe(EmailBouncedEvent, handleEvent('bounce'));
        DomainEvents.subscribe(SpamComplaintEvent, handleEvent('spam'));
    }
}

module.exports = MailgunEmailSuppressionAdapter;
