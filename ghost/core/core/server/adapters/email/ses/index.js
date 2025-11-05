const EmailProviderBase = require('../EmailProviderBase');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('email-service:ses-adapter');

/**
 * Amazon SES Email Provider Adapter
 *
 * Sends emails through Amazon SES bulk email API.
 * Extends EmailProviderBase to work with Ghost's AdapterManager.
 */
class SESEmailProvider extends EmailProviderBase {
    #sesClient;
    #config;
    #errorHandler;

    /**
     * @param {Object} config - Adapter configuration
     * @param {Object} config.ses - SES client configuration
     * @param {string} config.ses.region - AWS region (e.g., 'us-west-1')
     * @param {string} [config.ses.accessKeyId] - AWS access key ID (optional if using IAM role)
     * @param {string} [config.ses.secretAccessKey] - AWS secret access key
     * @param {string} config.ses.fromEmail - Verified sender email address
     * @param {string} [config.ses.configurationSet] - SES configuration set name
     * @param {Function} [config.errorHandler] - Error handler for logging exceptions
     */
    constructor(config) {
        super(config);

        // Config can be passed in two ways:
        // 1. Direct config from adapter manager: { region, accessKeyId, ... }
        // 2. Wrapped config: { ses: { region, accessKeyId, ... } }
        const sesConfig = config.ses || config;

        // Validate required configuration
        if (!sesConfig.region) {
            throw new errors.IncorrectUsageError({
                message: 'SES adapter requires region in configuration'
            });
        }

        if (!sesConfig.fromEmail) {
            throw new errors.IncorrectUsageError({
                message: 'SES adapter requires fromEmail in configuration'
            });
        }

        // Dynamically load AWS SDK (optional dependency)
        try {
            const {SESClient, SendBulkEmailCommand} = require('@aws-sdk/client-ses');

            // Store config
            this.#config = sesConfig;
            this.#errorHandler = config.errorHandler;

            // Create SES client
            const clientConfig = {
                region: sesConfig.region
            };

            // Add credentials if provided (otherwise uses IAM role)
            if (sesConfig.accessKeyId && sesConfig.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: sesConfig.accessKeyId,
                    secretAccessKey: sesConfig.secretAccessKey
                };
            }

            this.#sesClient = new SESClient(clientConfig);
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                throw new errors.IncorrectUsageError({
                    message: 'AWS SDK not installed. Install with: yarn add @aws-sdk/client-ses',
                    help: 'SES email provider requires @aws-sdk/client-ses as an optional dependency'
                });
            }
            throw err;
        }
    }

    /**
     * Chunk array into smaller arrays
     * @private
     * @param {Array} array - Array to chunk
     * @param {number} size - Chunk size
     * @returns {Array} Array of chunks
     */
    #chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Build MIME email content
     * @private
     * @param {Object} params - Email parameters
     * @param {string} params.from - From address
     * @param {string} params.subject - Email subject
     * @param {string} params.html - HTML content
     * @param {string} params.plaintext - Plain text content
     * @param {string} [params.replyTo] - Reply-to address
     * @returns {string} MIME formatted email
     */
    #buildMIMEEmail({from, subject, html, plaintext, replyTo}) {
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Extract domain from 'from' address for Message-ID
        const domain = from.match(/@([^>]+)/)?.[1] || 'localhost';
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;

        let mime = [
            `From: ${from}`,
            `Subject: ${subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: ${messageId}`
        ];

        if (replyTo) {
            mime.push(`Reply-To: ${replyTo}`);
        }

        mime = mime.concat([
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            plaintext || '',
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            html || '',
            '',
            `--${boundary}--`
        ]);

        return mime.join('\r\n');
    }

    /**
     * Create AWS SES error message for storing in the database
     * @private
     * @param {Object} error - AWS error object
     * @returns {string} Error message (max 2000 chars)
     */
    #createSESErrorMessage(error) {
        const message = (error?.message || 'SES Error') + (error?.$metadata?.httpStatusCode ? ` (${error.$metadata.httpStatusCode})` : '');
        return message.slice(0, 2000);
    }

    /**
     * Send an email using the Amazon SES API
     * @param {Object} data - Email data
     * @param {string} data.subject - Email subject
     * @param {string} data.html - Email HTML content
     * @param {string} data.plaintext - Email plain text content
     * @param {string} data.from - From address
     * @param {string} data.replyTo - Reply-to address
     * @param {string} data.emailId - Email ID
     * @param {Array} data.recipients - Array of recipients with {email, replacements}
     * @param {Array} data.replacementDefinitions - Replacement definitions
     * @param {Object} options - Send options
     * @param {boolean} options.openTrackingEnabled - Enable open tracking
     * @param {boolean} options.clickTrackingEnabled - Enable click tracking
     * @returns {Promise<{id: string}>} Provider message ID
     */
    async send(data, options = {}) {
        const {
            subject,
            html,
            plaintext,
            from,
            replyTo,
            emailId,
            recipients = [],
            replacementDefinitions = []
        } = data;

        const startTime = Date.now();
        debug(`sending message to ${recipients.length} recipients`);

        try {
            const {SendRawEmailCommand} = require('@aws-sdk/client-ses');

            // Build MIME email (raw format for SES)
            // V1: Simple implementation without per-recipient personalization
            // V2 (future): Add template support for personalization
            const rawMessage = this.#buildMIMEEmail({
                from: from || this.#config.fromEmail,
                subject,
                html,
                plaintext,
                replyTo
            });

            // SES has a 50 recipient limit per bulk send
            const chunks = this.#chunkArray(recipients, 50);
            const results = [];

            for (const chunk of chunks) {
                // Extract email addresses
                const toAddresses = chunk.map(recipient => recipient.email);

                // Build SendRawEmail command for bulk sending
                const command = new SendRawEmailCommand({
                    Source: from || this.#config.fromEmail,
                    Destinations: toAddresses,
                    RawMessage: {
                        Data: Buffer.from(rawMessage)
                    },
                    ConfigurationSetName: this.#config.configurationSet,
                    Tags: [
                        {
                            Name: 'email-id',
                            Value: emailId || 'unknown'
                        }
                    ]
                });

                // Send via SES
                const response = await this.#sesClient.send(command);

                // Store message ID from response
                if (response.MessageId) {
                    results.push(response.MessageId);
                }
            }

            debug(`sent message to ${recipients.length} recipients (${Date.now() - startTime}ms)`);

            // Return first message ID as provider reference
            return {
                id: results[0] || 'unknown'
            };
        } catch (e) {
            let ghostError;

            // Redact PII from error details
            const redactedError = {
                name: e.name,
                message: e.message,
                code: e.code,
                statusCode: e.$metadata?.httpStatusCode
            };

            const errorDetails = JSON.stringify({
                error: redactedError,
                recipientCount: recipients.length
            }).slice(0, 2000);

            ghostError = new errors.EmailError({
                statusCode: e.$metadata?.httpStatusCode || 500,
                message: this.#createSESErrorMessage(e),
                errorDetails,
                context: `Amazon SES Error: ${e.message}`,
                help: 'https://ghost.org/docs/newsletters/#bulk-email-configuration',
                code: 'BULK_EMAIL_SEND_FAILED',
                err: e
            });

            // Log to Sentry if error handler provided
            if (this.#errorHandler) {
                try {
                    // Promise resolution is fire-and-forget, catch to prevent unhandled rejection
                    Promise.resolve(this.#errorHandler(ghostError)).catch(() => {});
                } catch (handlerError) {
                    // Ignore handler errors - we still want to throw the original error
                }
            }

            throw ghostError;
        }
    }

    /**
     * Get maximum recipients per batch
     * @returns {number} Maximum number of recipients
     */
    getMaximumRecipients() {
        return 50; // SES bulk send limit
    }

    /**
     * Get target delivery window in seconds
     * @returns {number} Delivery window in seconds
     */
    getTargetDeliveryWindow() {
        // SES doesn't have specific delivery windows like Mailgun
        // Return a reasonable value for batch processing
        return 3600; // 1 hour
    }
}

module.exports = SESEmailProvider;
