const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:mailgun-provider-service');

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

class MailgunEmailProvider {
    #mailgunClient;
    #errorHandler;

    /**
     * @param {object} dependencies
     * @param {import('@tryghost/mailgun-client/lib/MailgunClient')} dependencies.mailgunClient - mailgun client to send emails
     * @param {Function} [dependencies.errorHandler] - custom error handler for logging exceptions
     */
    constructor({
        mailgunClient,
        errorHandler
    }) {
        this.#mailgunClient = mailgunClient;
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
            domainOverride,
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
                domainOverride,
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

                // Check for rate limit errors (429 or specific Mailgun rate limit messages)
                const isRateLimitError = error.status === 429 ||
                    (error.details && (
                        error.details.includes('rate limit') ||
                        error.details.includes('too many requests') ||
                        error.details.includes('quota exceeded')
                    ));

                if (isRateLimitError) {
                    // Parse retry-after header or estimate based on error message
                    let retryAfterSeconds = null;
                    let limitType = null;

                    // Try to extract retry-after from error response
                    if (error.headers && error.headers['retry-after']) {
                        retryAfterSeconds = parseInt(error.headers['retry-after'], 10);
                    } else if (error.headers && error.headers['x-ratelimit-reset']) {
                        // Calculate seconds until reset time
                        const resetTime = parseInt(error.headers['x-ratelimit-reset'], 10);
                        retryAfterSeconds = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
                    }

                    // Try to determine limit type from error message
                    if (error.details) {
                        if (error.details.includes('daily')) {
                            limitType = 'day';
                        } else if (error.details.includes('hourly') || error.details.includes('hour')) {
                            limitType = 'hour';
                        } else if (error.details.includes('minute')) {
                            limitType = 'minute';
                        }
                    }

                    debug(`rate limit hit: ${error.details}, retry after ${retryAfterSeconds}s, type: ${limitType}`);

                    // Throw a specific RateLimitError that BatchSendingService can catch
                    ghostError = new errors.EmailError({
                        statusCode: error.status,
                        message: this.#createMailgunErrorMessage(error),
                        errorDetails: JSON.stringify({
                            error,
                            messageData,
                            rateLimitInfo: {
                                retryAfterSeconds,
                                limitType,
                                isRateLimit: true
                            }
                        }),
                        context: `Mailgun Rate Limit ${error.status}: ${error.details}`,
                        help: `https://ghost.org/docs/newsletters/#bulk-email-configuration`,
                        code: 'BULK_EMAIL_RATE_LIMIT'
                    });

                    // Add rate limit specific properties
                    ghostError.retryAfterSeconds = retryAfterSeconds;
                    ghostError.limitType = limitType;
                    ghostError.isRateLimit = true;
                } else {
                    // REF: possible mailgun errors https://documentation.mailgun.com/en/latest/api-intro.html#status-codes
                    ghostError = new errors.EmailError({
                        statusCode: error.status,
                        message: this.#createMailgunErrorMessage(error),
                        errorDetails: JSON.stringify({error, messageData}),
                        context: `Mailgun Error ${error.status}: ${error.details}`,
                        help: `https://ghost.org/docs/newsletters/#bulk-email-configuration`,
                        code: 'BULK_EMAIL_SEND_FAILED'
                    });
                }
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

            throw ghostError;
        }
    }

    getMaximumRecipients() {
        return this.#mailgunClient.getBatchSize();
    }

    /**
     * Returns the configured delay between batches in milliseconds
     *
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        return this.#mailgunClient.getTargetDeliveryWindow();
    }
}

module.exports = MailgunEmailProvider;
