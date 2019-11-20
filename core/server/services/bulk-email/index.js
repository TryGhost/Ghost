const _ = require('lodash');
const common = require('../../lib/common');
const mailgunProvider = require('./mailgun');
const configService = require('../../config');
const settingsCache = require('../settings/cache');

/**
 * An object representing batch request result
 * @typedef { Object } BatchResultBase
 * @property { string } data - data that is returned from Mailgun or one which Mailgun was called with
 */
class BatchResultBase {
}

class SuccessfulBatch extends BatchResultBase {
    constructor(data) {
        super();
        this.data = data;
    }
}

class FailedBatch extends BatchResultBase {
    constructor(error, data) {
        super();

        // give a better error message for the invalid credentials state
        if (error.message === 'Forbidden') {
            error.message = 'Invalid Mailgun credentials';
        }

        this.error = error;
        this.data = data;
    }
}

/**
 * An email address
 * @typedef { string } EmailAddress
 */

/**
 * An object representing an email to send
 * @typedef { Object } Email
 * @property { string } html - The html content of the email
 * @property { string } subject - The subject of the email
 */

module.exports = {
    SuccessfulBatch,
    FailedBatch,
    /**
     * @param {Email} message - The message to send
     * @param {[EmailAddress]} recipients - the recipients to send the email to
     * @param {[object]} recipientData - list of data keyed by email to inject into the email
     * @returns {Promise<Array<BatchResultBase>>} An array of promises representing the success of the batch email sending
     */
    async send(message, recipients, recipientData = {}) {
        let BATCH_SIZE = 1000;
        const mailgunInstance = mailgunProvider.getInstance();
        if (!mailgunInstance) {
            return;
        }
        let fromAddress = message.from;
        if (/@localhost$/.test(message.from) || /@ghost.local$/.test(message.from)) {
            fromAddress = 'localhost@example.com';
            common.logging.warn(`Rewriting bulk email from address ${message.from} to ${fromAddress}`);

            BATCH_SIZE = 2;
        }

        const blogTitle = settingsCache.get('title');
        fromAddress = blogTitle ? `${blogTitle}<${fromAddress}>` : fromAddress;

        const chunkedRecipients = _.chunk(recipients, BATCH_SIZE);

        return Promise.mapSeries(chunkedRecipients, (toAddresses) => {
            const recipientVariables = {};
            toAddresses.forEach((email) => {
                recipientVariables[email] = recipientData[email];
            });

            const batchData = {
                to: toAddresses,
                from: fromAddress,
                'recipient-variables': recipientVariables
            };

            const bulkEmailConfig = configService.get('bulkEmail');

            if (bulkEmailConfig && bulkEmailConfig.mailgun && bulkEmailConfig.mailgun.tag) {
                Object.assign(batchData, {
                    'o:tag': [bulkEmailConfig.mailgun.tag, 'bulk-email']
                });
            }

            const messageData = Object.assign({}, message, batchData);

            return new Promise((resolve) => {
                mailgunInstance.messages().send(messageData, (error, body) => {
                    if (error) {
                        // NOTE: logging an error here only but actual handling should happen in more sophisticated batch retry handler
                        // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#errors
                        common.logging.warn(new common.errors.GhostError({
                            err: error,
                            context: common.i18n.t('errors.services.mega.requestFailed.error')
                        }));

                        // NOTE: these are generated variables, so can be regenerated when retry is done
                        const data = _.omit(batchData, ['recipient-variables']);
                        resolve(new FailedBatch(error, data));
                    } else {
                        resolve(new SuccessfulBatch(body));
                    }
                });
            });
        });
    }
};
