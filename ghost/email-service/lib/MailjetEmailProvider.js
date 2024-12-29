const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:mailjet-provider-service');
const Mailjet = require('node-mailjet');
        
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
 * @prop {Date} deliveryTime
 */

/**
 * @typedef {object} EmailProviderSuccessResponse
 * @prop {string} id
 */

class MailjetEmailProvider {
    #settings;
    #errorHandler;

    /**
     * @param {object} dependencies
     * @param {object} dependencies 
     * @param {Function} [dependencies.errorHandler] - custom error handler for logging exceptions
     */
    constructor({ settings, errorHandler }) {
        logging.error(`settings ${settings}`);
        this.#settings = settings;
        this.#errorHandler = errorHandler;
    }

    #createRecipientVariables(replacements) {
        return replacements.reduce((acc, replacement) => {
            acc[replacement.id] = replacement.value;
            return acc;
        }, {});
    }

    #updateRecipientVariables(data, replacementDefinitions) {
        for (const def of replacementDefinitions) {
            data = data.replace(def.token, `{{var:${def.id}}}`);
        }
        return data;
    }

    /**
     * Create Mailjet error message for storing in the database
     * @param {string} error
     * @returns {string}
     */
    #createMailjetErrorMessage(error) {
        return error;
        /*
        const message = (error?.message || 'Mailjet Error') + (error?.details ? (': ' + error.details) : '');
        return message.slice(0, 2000);
        */
    }

    /**
     * Send an email using the Mailjet API
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

        const mailjetClient = new Mailjet.Client({
            apiKey: this.#settings.get('mailjet_api_key'),
            apiSecret: this.#settings.get('mailjet_secret_key')
        });
        logging.error(`Sending with mailjetClient ${mailjetClient}`); 
        logging.info(`Sending email to ${recipients.length} recipients, from ${from}`);
        const startTime = Date.now();
        debug(`sending message to ${recipients.length} recipients, from ${from}`);

        try {
            // Prepare recipient-specific data
            const messages = recipients.map((recipient) => ({
                From: {
                    Email: from,
                },
                To: [
                    {
                        Email: recipient.email,
                    },
                ],
                Subject: subject,
                HTMLPart: this.#updateRecipientVariables(html, replacementDefinitions),
                TextPart: this.#updateRecipientVariables(plaintext, replacementDefinitions),
                CustomID: emailId,
                /*
                ReplyTo: replyTo ? { Email: replyTo } : undefined,
                TrackOpens: options.openTrackingEnabled ? 1 : 0,
                TrackClicks: options.clickTrackingEnabled ? 1 : 0,
                */
                SendingStartAt: options.deliveryTime ? options.deliveryTime.toISOString() : undefined,
                
            }));

            debug(`send messages (${messages})`);
            
            // Send email using Mailjet
            const response = await mailjetClient.post('send', { version: 'v3.1' }).request({
                Messages: messages,
            });

            debug(`sent message (${Date.now() - startTime}ms)`);
            logging.info(`Sent message (${Date.now() - startTime}ms)`);

            // Return Mailjet provider id
            return {
                id: '42', // Assuming single batch
            };
        } catch (e) {
            let ghostError;
            logging.error(`sent message: ${e.toString()}`);
            
            if (e.response) {
                const { response } = e;

                ghostError = new errors.EmailError({
                    statusCode: response.status,
                    message: this.#createMailjetErrorMessage(response.body),
                    errorDetails: JSON.stringify(response.body),
                    context: `Mailjet Error ${response.status}: ${response.body}`,
                    help: `https://www.mailjet.com/docs/`,
                    code: 'BULK_EMAIL_SEND_FAILED',
                });
            } else {
                ghostError = new errors.EmailError({
                    statusCode: undefined,
                    message: this.#createMailjetErrorMessage(e),
                    errorDetails: undefined,
                    context: e.context || 'Mailjet Error',
                    code: 'BULK_EMAIL_SEND_FAILED',
                });
            }

            debug(`failed to send message (${Date.now() - startTime}ms)`);
            debug(JSON.stringify(e.response.body));
            throw ghostError;
        }
    }

    getMaximumRecipients() {
        // Define a static limit as Mailjet's API supports 50 recipients per message.
        return 50;
    }

    /**
     * Returns the configured delay between batches in milliseconds
     * 
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        // Mailjet doesn't impose strict batching delays; use a configurable default.
        return 0;
    }
}

module.exports = MailjetEmailProvider;
