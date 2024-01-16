const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:mailgun-provider-service');

/**
 * @typedef {object} MailClient
 * @prop {(emailData: EmailData, options: EmailSendingOptions) => Promise<EmailProviderSuccessResponse>} send
 * @prop {() => number} getMaximumRecipients
 */

/**
 * @typedef {object} Recipient
 * @prop {string} email
 * @prop {Replacement[]} replacements
 */

/**
 * @typedef {object} Replacement
 * @prop {string} token
 * @prop {string} value
 * @prop {string} id
 */

/**
 * @typedef {object} EmailSendingOptions
 * @prop {boolean} clickTrackingEnabled
 * @prop {boolean} openTrackingEnabled
 */

/**
 * @typedef {object} EmailProviderSuccessResponse
 * @prop {string} id
 */

class BulkEmailProvider {
    #mailClient;
    #errorHandler;

    /**
     * @param {object} dependencies
     * @param {import('@tryghost/mailgun-client/lib/MailgunClient')|import('@tryghost/postmark-client/lib/PostmarkClient')} [dependencies.mailClient] - mailgun client to send emails
     * @param {Function} [dependencies.errorHandler] - custom error handler for logging exceptions
     */
    constructor({
        mailClient,
        errorHandler
    }) {
        this.#mailClient = mailClient;
        this.#errorHandler = errorHandler;
    }

    #createRecipientData(replacements) {
        let recipientData = {};

        recipientData = replacements.reduce((acc, replacement) => {
            const {id, value} = replacement;
            acc[id] = value;
            return acc;
        }, {});

        return recipientData;
    }

    #updateRecipientVariables(data, replacementDefinitions) {
        for (const def of replacementDefinitions) {
            data = data.replace(
                def.token,
                `%recipient.${def.id}%`
            );
        }
        return data;
    }

    /**
     * Create mailgun error message for storing in the database
     * @param {Object} error
     * @param {string} error.message
     * @param {string} error.details
     * @returns {string}
    */
    #createMailgunErrorMessage(error) {
        const message = (error?.message || 'Mailgun Error') + (error?.details ? (': ' + error.details) : '');
        return message.slice(0, 2000);
    }

    /**
     * Send an email using the Mailgun API
     * @param {import('./SendingService').EmailData} data
     * @param {EmailSendingOptions} options
     * @returns {Promise<EmailProviderSuccessResponse>}
    */
    async send(data, options) {
        const {
            subject,
            html,
            plaintext,
            from,
            replyTo,
            emailId,
            recipients,
            replacementDefinitions
        } = data;

        logging.info(`Sending email to ${recipients.length} recipients`);
        const startTime = Date.now();
        debug(`sending message to ${recipients.length} recipients`);

        try {
            const messageData = {
                subject,
                html,
                plaintext,
                from,
                replyTo,
                id: emailId,
                track_opens: !!options.openTrackingEnabled,
                track_clicks: !!options.clickTrackingEnabled
            };

            // create recipient data for Mailgun using replacement definitions
            const recipientData = recipients.reduce((acc, recipient) => {
                acc[recipient.email] = this.#createRecipientData(recipient.replacements);
                return acc;
            }, {});

            // update content to use Mailgun variable syntax for all replacements
            ['html', 'plaintext'].forEach((key) => {
                if (messageData[key]) {
                    messageData[key] = this.#updateRecipientVariables(messageData[key], replacementDefinitions);
                }
            });

            // send the email using Mailgun
            // uses empty replacements array as we've already replaced all tokens with Mailgun variables
            const response = await this.#mailClient.send(
                messageData,
                recipientData,
                []
            );

            debug(`sent message (${Date.now() - startTime}ms)`);
            logging.info(`Sent message (${Date.now() - startTime}ms)`);

            // Return mailgun provider id, trim <> from response
            return {
                id: response.id.trim().replace(/^<|>$/g, '')
            };
        } catch (e) {
            let ghostError;

            if (this.#mailClient.constructor.name === 'MailgunClient') {
                if (e.error && e.messageData) {
                    const {error, messageData} = e;

                    // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#status-codes
                    ghostError = new errors.EmailError({
                        statusCode: error.status,
                        message: this.#createMailgunErrorMessage(error),
                        errorDetails: JSON.stringify({error, messageData}),
                        context: `Mailgun Error ${error.status}: ${error.details}`,
                        help: `https://ghost.org/docs/newsletters/#bulk-email-configuration`,
                        code: 'BULK_EMAIL_SEND_FAILED'
                    });
                } else {
                    ghostError = new errors.EmailError({
                        statusCode: undefined,
                        message: this.#createMailgunErrorMessage(e),
                        errorDetails: undefined,
                        context: e.context || 'Mailgun Error',
                        code: 'BULK_EMAIL_SEND_FAILED'
                    });
                }
            } else if (this.#mailClient.constructor.name === 'PostmarkClient') {
                // @TODO: handle postmark errors
            } else {
                if (e.error && e.messageData) {
                    const {error, messageData} = e;

                    ghostError = new errors.EmailError({
                        statusCode: e.error.status,
                        message: this.#createMailgunErrorMessage(error),
                        errorDetails: JSON.stringify({error, messageData}),
                        context: e.context || 'Bulk mail Error',
                        code: 'BULK_EMAIL_SEND_FAILED'
                    });
                } else {
                    ghostError = new errors.EmailError({
                        statusCode: undefined,
                        message: this.#createMailgunErrorMessage(e),
                        errorDetails: undefined,
                        context: e.context || 'Bulk mail Error',
                        code: 'BULK_EMAIL_SEND_FAILED'
                    });
                }
            }

            debug(`failed to send message (${Date.now() - startTime}ms)`);
            throw ghostError;
        }
    }

    getMaximumRecipients() {
        return this.#mailClient.getBatchSize();
    }
}

module.exports = BulkEmailProvider;
