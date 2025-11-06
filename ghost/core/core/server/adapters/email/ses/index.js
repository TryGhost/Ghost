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
    #sesConfig;
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
            const {SESClient} = require('@aws-sdk/client-ses');

            // Store full config to preserve root-level fields
            this.#config = config;
            this.#sesConfig = sesConfig;
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
     * Sanitize email header value to prevent header injection attacks
     * @private
     * @param {string} value - Header value to sanitize
     * @returns {string} Sanitized header value
     */
    #sanitizeHeader(value) {
        if (!value) {
            return '';
        }
        // Remove all CR and LF characters to prevent header injection
        return String(value).replace(/[\r\n]/g, '');
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

        // Sanitize all header values to prevent header injection attacks
        const sanitizedFrom = this.#sanitizeHeader(from);
        const sanitizedTo = this.#sanitizeHeader(to);
        const sanitizedSubject = this.#sanitizeHeader(subject);
        const sanitizedReplyTo = this.#sanitizeHeader(replyTo);

        // Extract domain from 'from' address for Message-ID
        const domain = sanitizedFrom.match(/@([^>]+)/)?.[1] || 'localhost';
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;

        let mime = [
            `From: ${sanitizedFrom}`,
            `To: ${sanitizedTo}`,
            `Subject: ${sanitizedSubject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: ${messageId}`
        ];

        if (sanitizedReplyTo) {
            mime.push(`Reply-To: ${sanitizedReplyTo}`);
        }

        // Encode content as quoted-printable
        const encodedPlaintext = this.#encodeQuotedPrintable(plaintext || '');
        const encodedHtml = this.#encodeQuotedPrintable(html || '');

        mime = mime.concat([
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            encodedPlaintext,
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            encodedHtml,
            '',
            `--${boundary}--`
        ]);

        return mime.join('\r\n');
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @private
     * @param {string} str - String to escape
     * @returns {string} HTML-escaped string
     */
    #escapeHtml(str) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#x27;',
            '/': '&#x2F;'
        };
        return String(str).replace(/[&<>"'/]/g, char => htmlEscapes[char]);
    }

    /**
     * Encode string as quoted-printable (RFC 2045)
     * Works on UTF-8 bytes, not UTF-16 code units
     * @private
     * @param {string} str - String to encode
     * @returns {string} Quoted-printable encoded string
     */
    #encodeQuotedPrintable(str) {
        if (!str) {
            return '';
        }

        // Convert string to UTF-8 bytes
        const utf8Bytes = Buffer.from(str, 'utf8');

        let encoded = '';
        let lineLength = 0;

        for (let i = 0; i < utf8Bytes.length; i++) {
            const byte = utf8Bytes[i];
            const nextByte = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : null;

            // RFC 2045: Preserve CRLF sequences as literal \r\n (not encoded)
            if (byte === 0x0D && nextByte === 0x0A) {
                // Hard line break - preserve as-is
                encoded += '\r\n';
                lineLength = 0;
                i += 1; // Skip the LF byte (already processed)
                continue;
            }

            // Check if trailing space/tab before line break
            const isTrailingSpace = (byte === 0x20 || byte === 0x09) &&
                                   (nextByte === 0x0D || nextByte === 0x0A || nextByte === null);

            // RFC 2045: Must encode if:
            // - Outside printable ASCII range (33-126, excluding 61)
            // - Equals sign (61 = '=')
            // - Trailing space or tab before line break
            // - Standalone CR or LF (not part of CRLF)
            if (byte < 33 || byte > 126 || byte === 61 || isTrailingSpace) {
                // Encode as =XX
                const hex = byte.toString(16).toUpperCase().padStart(2, '0');
                encoded += '=' + hex;
                lineLength += 3;
            } else {
                // Safe printable character
                encoded += String.fromCharCode(byte);
                lineLength += 1;
            }

            // Soft line break at 75 chars (leave room for =\r\n)
            // Don't break if we're about to hit a hard line break
            if (lineLength >= 75 && i + 1 < utf8Bytes.length) {
                const next = utf8Bytes[i + 1];
                // Check if next is start of CRLF sequence
                const isNextCRLF = next === 0x0D && i + 2 < utf8Bytes.length && utf8Bytes[i + 2] === 0x0A;
                if (!isNextCRLF) {
                    encoded += '=\r\n';
                    lineLength = 0;
                }
            }
        }

        return encoded;
    }

    /**
     * Process replacement tokens in content
     * @private
     * @param {string} content - Content with %%{...}%% tokens
     * @param {Array} replacements - Array of {id, value} objects
     * @param {Array} replacementDefinitions - Array of {id, token} objects defining the tokens
     * @param {boolean} isHtml - Whether content is HTML (requires escaping)
     * @returns {string} Content with tokens replaced
     */
    #processReplacements(content, replacements, replacementDefinitions = [], isHtml = false) {
        if (!content || !replacements || replacements.length === 0) {
            return content;
        }

        let processedContent = content;

        for (const replacement of replacements) {
            // Find the token string from replacementDefinitions using the replacement id
            const token = replacement.token || replacementDefinitions.find(def => def.id === replacement.id)?.token;
            if (!token) {
                continue;
            }

            // Get value, defaulting to empty string if null/undefined
            let value = replacement.value !== null && replacement.value !== undefined
                ? String(replacement.value)
                : '';

            // Escape HTML entities in values when processing HTML content (XSS prevention)
            if (isHtml) {
                value = this.#escapeHtml(value);
            }

            // Replace all occurrences of this token (global replace)
            // Handle both string tokens and RegExp tokens
            let tokenRegex;
            if (token instanceof RegExp) {
                // If already a RegExp, ensure it has global flag
                const flags = token.flags.includes('g') ? token.flags : `${token.flags}g`;
                tokenRegex = new RegExp(token.source, flags);
            } else {
                // If string, escape special chars and create RegExp
                const escapedToken = String(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                tokenRegex = new RegExp(escapedToken, 'g');
            }
            processedContent = processedContent.replace(tokenRegex, value);
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
     * Send bulk email without personalization (efficient for large newsletters)
     * Sends ONE email with up to 50 recipients in BCC per batch
     * @private
     */
    async #sendBulk({subject, html, plaintext, from, replyTo, emailId, recipients, startTime}) {
        const {SendRawEmailCommand} = require('@aws-sdk/client-ses');

        // SES allows up to 50 destinations per SendRawEmail call
        const BATCH_SIZE = 50;
        const batches = this.#chunkArray(recipients, BATCH_SIZE);
        const results = [];

        debug(`sending bulk email to ${recipients.length} recipients in ${batches.length} batches`);

        for (const batch of batches) {
            // Build MIME email with BCC recipients
            const bccList = batch.map(r => r.email).join(', ');

            // Sanitize all header values to prevent header injection attacks
            const sanitizedFrom = this.#sanitizeHeader(from || this.#sesConfig.fromEmail);
            const sanitizedSubject = this.#sanitizeHeader(subject);
            const sanitizedReplyTo = this.#sanitizeHeader(replyTo);

            // Encode content as quoted-printable
            const encodedPlaintext = this.#encodeQuotedPrintable(plaintext || '');
            const encodedHtml = this.#encodeQuotedPrintable(html || '');

            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const domain = sanitizedFrom.match(/@([^>]+)/)?.[1] || 'localhost';
            const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;

            let mime = [
                `From: ${sanitizedFrom}`,
                `To: undisclosed-recipients:;`,
                `Bcc: ${bccList}`,
                `Subject: ${sanitizedSubject}`,
                `Date: ${new Date().toUTCString()}`,
                `Message-ID: ${messageId}`
            ];

            if (sanitizedReplyTo) {
                mime.push(`Reply-To: ${sanitizedReplyTo}`);
            }

            mime = mime.concat([
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: quoted-printable',
                '',
                encodedPlaintext,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: quoted-printable',
                '',
                encodedHtml,
                '',
                `--${boundary}--`
            ]);

            const rawMessage = mime.join('\r\n');

            // Build SendRawEmail command with all batch recipients as Destinations
            const command = new SendRawEmailCommand({
                Source: from || this.#sesConfig.fromEmail,
                Destinations: batch.map(r => r.email),
                RawMessage: {
                    Data: Buffer.from(rawMessage)
                },
                ConfigurationSetName: this.#sesConfig.configurationSet,
                Tags: [
                    {
                        Name: 'email-id',
                        Value: emailId || 'unknown'
                    }
                ]
            });

            // Send via SES
            const response = await this.#sesClient.send(command);
            results.push(response.MessageId);
        }

        const duration = Date.now() - startTime;
        const throughput = recipients.length / (Math.max(duration, 1) / 1000);
        debug(`sent bulk email to ${recipients.length} recipients in ${duration}ms (${throughput.toFixed(2)} emails/sec)`);
        debug(`SES returned ${results.length} batch MessageId(s)`);

        // Return first MessageId (represents the bulk send)
        return {
            id: results[0] || 'unknown'
        };
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
    async send(data) {
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
            // Check if personalization is actually being used
            // Note: Ghost always adds required system tokens (list_unsubscribe, etc) to every recipient
            // We need to check if there are ANY tokens beyond the required ones
            // Required tokens that are always present: list_unsubscribe
            const REQUIRED_TOKEN_IDS = ['list_unsubscribe'];

            const hasPersonalization = recipients.some((r) => {
                if (!r.replacements || r.replacements.length === 0) {
                    return false;
                }
                // Check if there are any replacements beyond required system tokens
                return r.replacements.some(replacement => !REQUIRED_TOKEN_IDS.includes(replacement.id));
            });

            if (!hasPersonalization) {
                // No personalization: send ONE email with all recipients in BCC (efficient for large newsletters)
                return await this.#sendBulk({subject, html, plaintext, from, replyTo, emailId, recipients, startTime});
            }

            // With personalization: send individual emails per recipient
            const {SendRawEmailCommand} = require('@aws-sdk/client-ses');

            // Process recipients with personalization
            // Each recipient gets a personalized email with their specific replacement values
            const batchSize = 10; // Process 10 recipients in parallel
            const chunks = this.#chunkArray(recipients, batchSize);
            const results = [];

            for (const chunk of chunks) {
                // Send emails in parallel for this batch
                const batchPromises = chunk.map(async (recipient) => {
                    // Process replacements for this recipient (escape HTML in values)
                    const personalizedHtml = this.#processReplacements(html, recipient.replacements, replacementDefinitions, true);
                    const personalizedPlaintext = this.#processReplacements(plaintext, recipient.replacements, replacementDefinitions, false);

                    // Build personalized MIME email
                    const rawMessage = this.#buildMIMEEmail({
                        from: from || this.#sesConfig.fromEmail,
                        to: recipient.email,
                        subject,
                        html: personalizedHtml,
                        plaintext: personalizedPlaintext,
                        replyTo
                    });

                    // Build SendRawEmail command
                    const command = new SendRawEmailCommand({
                        Source: from || this.#sesConfig.fromEmail,
                        Destinations: [recipient.email],
                        RawMessage: {
                            Data: Buffer.from(rawMessage)
                        },
                        ConfigurationSetName: this.#sesConfig.configurationSet,
                        Tags: [
                            {
                                Name: 'email-id',
                                Value: emailId || 'unknown'
                            },
                            {
                                Name: 'recipient-email',
                                // SES tags only allow: alphanumeric, '_', '-', '.', '@'
                                // Replace '+' and other invalid characters with '_'
                                Value: recipient.email.replace(/[^a-zA-Z0-9_.\-@]/g, '_')
                            }
                        ]
                    });

                    // Send via SES
                    const response = await this.#sesClient.send(command);
                    return {
                        messageId: response.MessageId,
                        recipient: recipient.email
                    };
                });

                // Wait for all emails in this batch to be sent
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults.filter(Boolean));
            }

            const duration = Date.now() - startTime;
            const throughput = recipients.length / (Math.max(duration, 1) / 1000);
            debug(`sent ${recipients.length} personalized messages in ${duration}ms (${throughput.toFixed(2)} emails/sec)`);
            debug(`SES returned ${results.length} individual MessageIds`);

            // Return first MessageId as provider_id (fits in 255 char column)
            // Analytics reconciliation works via:
            // 1. Each SES event has its own real MessageId (in providerId field)
            // 2. All events grouped by email-id tag (set in SES Tags)
            // 3. Database provider_id is just a reference, not used for matching
            return {
                id: results[0]?.messageId || 'unknown'
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
        // SES bulk send limit is 50 recipients per call
        // This matches AWS SES API limits for batch sending
        return 50;
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
