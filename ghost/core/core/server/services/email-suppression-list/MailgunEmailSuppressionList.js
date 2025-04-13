const {AbstractEmailSuppressionList, EmailSuppressionData, EmailSuppressedEvent} = require('@tryghost/email-suppression-list');
const {SpamComplaintEvent, EmailBouncedEvent} = require('@tryghost/email-service');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const models = require('../../models');

/**
 * @typedef {object} IMailgunAPIClient
 * @prop {(email: string) => Promise<any>} removeBounce
 * @prop {(email: string) => Promise<any>} removeComplaint
 * @prop {(email: string) => Promise<any>} removeUnsubscribe
 */

class MailgunEmailSuppressionList extends AbstractEmailSuppressionList {
    /**
     * @param {object} deps
     * @param {import('bookshelf').Model} deps.Suppression
     * @param {IMailgunAPIClient} deps.apiClient
     */
    constructor(deps) {
        super();
        this.Suppression = deps.Suppression;
        this.apiClient = deps.apiClient;
    }

    async removeEmail(email) {
        try {
            await this.apiClient.removeBounce(email);
            await this.apiClient.removeComplaint(email);
            await this.apiClient.removeUnsubscribe(email);
        } catch (err) {
            logging.error(err);
            return false;
        }

        try {
            await this.Suppression.destroy({
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

    async removeUnsubscribe(email) {
        try {
            await this.apiClient.removeUnsubscribe(email);
        } catch (err) {
            logging.error(err);
            return false;
        }
    }

    async getSuppressionData(email) {
        try {
            const model = await this.Suppression.findOne({
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

    async getBulkSuppressionData(emails) {
        if (emails.length === 0) {
            return [];
        }

        try {
            const collection = await this.Suppression.findAll({
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

    async init() {
        this.Suppression = models.Suppression;
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
                await this.Suppression.add({
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

module.exports = MailgunEmailSuppressionList;
