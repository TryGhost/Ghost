const _ = require('lodash');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const mailgunProvider = require('./mailgun');
const configService = require('../../../shared/config');
const settingsCache = require('../settings/cache');
const sentry = require('../../../shared/sentry');

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
        error.originalMessage = error.message;

        if (error.statusCode >= 500) {
            error.message = 'Email service is currently unavailable - please try again';
        } else if (error.statusCode === 401) {
            error.message = 'Email failed to send - please verify your credentials';
        } else if (error.message && error.message.toLowerCase().includes('dmarc')) {
            error.message = 'Unable to send email from domains implementing strict DMARC policies';
        } else if (error.message.includes(`'to' parameter is not a valid address`)) {
            error.message = 'Recipient is not a valid address';
        } else {
            error.message = 'Email failed to send - please verify your email settings';
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
            logging.warn(`Rewriting bulk email from address ${message.from} to ${fromAddress}`);

            BATCH_SIZE = 2;
        }

        const blogTitle = settingsCache.get('title') ? settingsCache.get('title').replace(/"/g, '\\"') : '';
        fromAddress = blogTitle ? `"${blogTitle}"<${fromAddress}>` : fromAddress;

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

            if (bulkEmailConfig && bulkEmailConfig.mailgun && bulkEmailConfig.mailgun.testmode) {
                Object.assign(batchData, {
                    'o:testmode': true
                });
            }

            const messageData = Object.assign({}, message, batchData);

            // Rename plaintext field to text for Mailgun
            messageData.text = messageData.plaintext;
            delete messageData.plaintext;

            return new Promise((resolve) => {
                mailgunInstance.messages().send(messageData, (error, body) => {
                    if (error) {
                        // NOTE: logging an error here only but actual handling should happen in more sophisticated batch retry handler
                        // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#errors
                        let ghostError = new errors.EmailError({
                            err: error,
                            context: i18n.t('errors.services.mega.requestFailed.error')
                        });

                        sentry.captureException(ghostError);
                        logging.warn(ghostError);

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
