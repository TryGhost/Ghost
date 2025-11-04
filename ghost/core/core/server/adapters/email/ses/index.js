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
     * Build MIME email content for a single recipient
     * @private
     * @param {Object} params - Email parameters
     * @param {string} params.from - From address
     * @param {string} params.to - To address (recipient email)
     * @param {string} params.subject - Email subject
     * @param {string} params.html - HTML content
     * @param {string} params.plaintext - Plain text content
     * @param {string} [params.replyTo] - Reply-to address
     * @returns {string} MIME formatted email
     */
    #buildMIMEEmail({from, to, subject, html, plaintext, replyTo}) {
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        let mime = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`
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
            'Content-Transfer-Encoding: 7bit',
            '',
            plaintext || '',
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            html || '',
            '',
            `--${boundary}--`
        ]);

        return mime.join('\r\n');
    }

    /**
     * Process replacement tokens in content
     * @private
     * @param {string} content - Content with %%{...}%% tokens
     * @param {Array} replacements - Array of {id, token, value} objects
     * @returns {string} Content with tokens replaced
     */
    #processReplacements(content, replacements) {
        if (!content || !replacements || replacements.length === 0) {
            return content;
        }

        let processedContent = content;

        for (const replacement of replacements) {
            if (!replacement.token) {
                continue;
            }

            // Get value, defaulting to empty string if null/undefined
            const value = replacement.value !== null && replacement.value !== undefined
                ? String(replacement.value)
                : '';

            // Replace all occurrences of this token
            processedContent = processedContent.replace(replacement.token, value);
        }

        return processedContent;
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
        debug(`sending message to ${recipients.length} recipients with ${replacementDefinitions.length} replacements`);

        try {
            const {SendRawEmailCommand} = require('@aws-sdk/client-ses');

            // Process recipients with personalization
            // Each recipient gets a personalized email with their specific replacement values
            const batchSize = 10; // Process 10 recipients in parallel
            const chunks = this.#chunkArray(recipients, batchSize);
            const results = [];

            for (const chunk of chunks) {
                // Send emails in parallel for this batch
                const batchPromises = chunk.map(async (recipient) => {
                    // Process replacements for this recipient
                    const personalizedHtml = this.#processReplacements(html, recipient.replacements);
                    const personalizedPlaintext = this.#processReplacements(plaintext, recipient.replacements);

                    // Build personalized MIME email
                    const rawMessage = this.#buildMIMEEmail({
                        from: from || this.#config.fromEmail,
                        to: recipient.email,
                        subject,
                        html: personalizedHtml,
                        plaintext: personalizedPlaintext,
                        replyTo
                    });

                    // Build SendRawEmail command
                    const command = new SendRawEmailCommand({
                        Source: from || this.#config.fromEmail,
                        Destinations: [recipient.email],
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
                    return response.MessageId;
                });

                // Wait for all emails in this batch to be sent
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.filter(Boolean));
            }

            const duration = Date.now() - startTime;
            const throughput = recipients.length / (duration / 1000);
            debug(`sent ${recipients.length} personalized messages in ${duration}ms (${throughput.toFixed(2)} emails/sec)`);

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
        // With personalization, we send individual emails in parallel batches
        // Return a reasonable batch size for per-recipient processing
        return 100;
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
