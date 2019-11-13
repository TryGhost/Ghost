const {URL} = require('url');
const _ = require('lodash');
const mailgun = require('mailgun-js');
const configService = require('../../config');
const common = require('../../lib/common');
let mailgunInstance;

function createMailgun(config) {
    const baseUrl = new URL(config.baseUrl);

    return mailgun({
        apiKey: config.apiKey,
        domain: config.domain,
        protocol: baseUrl.protocol,
        host: baseUrl.host,
        port: baseUrl.port,
        endpoint: baseUrl.pathname
    });
}

const config = configService.get('bulkEmail');

if (!config || !config.mailgun) {
    common.logging.warn(`Bulk email service is not configured`);
} else {
    try {
        mailgunInstance = createMailgun(config.mailgun);
    } catch (err) {
        common.logging.warn(`Bulk email service is not configured`);
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
    /**
     * @param {Email} message - The message to send
     * @param {[EmailAddress]} recipients - the recipients to send the email to
     * @param {[object]} recipientData - list of data keyed by email to inject into the email
     * @returns {Promise<Array<object>>} An array of promises representing the success of the batch email sending
     */
    async send(message, recipients, recipientData) {
        let BATCH_SIZE = 1000;

        if (!mailgunInstance) {
            return;
        }
        let fromAddress = message.from;
        if (/@localhost$/.test(message.from) || /@ghost.local$/.test(message.from)) {
            fromAddress = 'localhost@example.com';
            common.logging.warn(`Rewriting bulk email from address ${message.from} to ${fromAddress}`);

            BATCH_SIZE = 2;
        }
        try {
            const chunkedRecipients = _.chunk(recipients, BATCH_SIZE);

            return Promise.map(chunkedRecipients, (toAddresses) => {
                const recipientVariables = {};
                toAddresses.forEach((email) => {
                    recipientVariables[email] = recipientData[email];
                });

                const messageData = Object.assign({}, message, {
                    to: toAddresses,
                    from: fromAddress,
                    'recipient-variables': recipientVariables
                });

                if (config.mailgun.tag) {
                    Object.assign(messageData, {
                        'o:tag': config.mailgun.tag
                    });
                }

                return mailgunInstance.messages().send(messageData);
            });
        } catch (err) {
            common.logging.error({err});
        }
    },

    async getStats(messageId) {
        try {
            let filter = {
                'message-id': messageId
            };

            return await mailgunInstance.events().get(filter);
        } catch (err) {
            common.logging.error({err});
        }
    }
};
