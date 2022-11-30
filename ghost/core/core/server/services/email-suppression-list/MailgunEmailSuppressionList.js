const {AbstractEmailSuppressionList, EmailSuppressionData} = require('@tryghost/email-suppression-list');
const {SpamComplaintEvent, EmailBouncedEvent} = require('@tryghost/email-events');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');

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
                    email_address: email
                }
            });
        } catch (err) {
            logging.error(err);
            return false;
        }

        return true;
    }

    async getSuppressionData(email) {
        try {
            const model = await this.Suppression.findOne({
                email_address: email
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
                filter: `email_address:[${emails.join(',')}]`
            });

            return emails.map((email) => {
                const model = collection.models.find(m => m.get('email_address') === email);

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
        const handleEvent = async (event) => {
            try {
                await this.Suppression.add({
                    email_address: event.email,
                    email_id: event.emailId,
                    reason: 'bounce',
                    created_at: event.timestamp
                });
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY') {
                    logging.error(err);
                }
            }
        };
        DomainEvents.subscribe(EmailBouncedEvent, handleEvent);
        DomainEvents.subscribe(SpamComplaintEvent, handleEvent);
    }
}

module.exports = MailgunEmailSuppressionList;
