/* eslint-disable max-lines */
// Disable max-lines: Email adapter contains cohesive send logic that shouldn't be split
const EmailProviderBase = require('../EmailProviderBase');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:mailgun-adapter');

/**
 * Mailgun Email Provider Adapter
 *
 * Sends emails through Mailgun's bulk email API.
 * Extends EmailProviderBase to work with Ghost's AdapterManager.
 */
class MailgunEmailProvider extends EmailProviderBase {
    #mailgunClient;
    #errorHandler;

    /**
     * @param {Object} config - Adapter configuration
     * @param {Object} config.mailgunClient - Configured Mailgun client instance
     * @param {Function} [config.errorHandler] - Error handler for logging exceptions
     */
    constructor(config) {
        super(config);

        if (!config.mailgunClient) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter requires mailgunClient in config'
            });
        }

        this.#mailgunClient = config.mailgunClient;
        this.#errorHandler = config.errorHandler;
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
     * @param {Object} data - Email data
     * @param {string} data.subject - Email subject
     * @param {string} data.html - Email HTML content
     * @param {string} data.plaintext - Email plain text content
     * @param {string} data.from - From address
     * @param {string} data.replyTo - Reply-to address
     * @param {string} data.emailId - Email ID
     * @param {Array} data.recipients - Array of recipients
     * @param {Array} data.replacementDefinitions - Replacement definitions
     * @param {Object} options - Send options
     * @param {boolean} options.openTrackingEnabled - Enable open tracking
     * @param {boolean} options.clickTrackingEnabled - Enable click tracking
     * @param {Date} [options.deliveryTime] - Scheduled delivery time
     * @returns {Promise<{id: string}>} Provider message ID
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

            if (options.deliveryTime && options.deliveryTime instanceof Date) {
                messageData.deliveryTime = options.deliveryTime;
            }

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
            const response = await this.#mailgunClient.send(
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

            debug(`failed to send message (${Date.now() - startTime}ms)`);

            // Call error handler if provided
            if (this.#errorHandler) {
                this.#errorHandler(ghostError);
            }

            throw ghostError;
        }
    }

    /**
     * Get maximum number of recipients per batch
     * @returns {number}
     */
    getMaximumRecipients() {
        return this.#mailgunClient.getBatchSize();
    }

    /**
     * Returns the configured delay between batches in milliseconds
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        return this.#mailgunClient.getTargetDeliveryWindow();
    }
}

module.exports = MailgunEmailProvider;
