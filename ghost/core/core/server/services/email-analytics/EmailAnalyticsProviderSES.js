const debug = require('@tryghost/debug')('email-analytics:ses');
const logging = require('@tryghost/logging');

/**
 * Email Analytics Provider for Amazon SES
 *
 * Fetches email events from SES via SQS queue and normalizes them to Ghost's format.
 *
 * Event Flow: SES → SNS → SQS → Ghost
 */
class EmailAnalyticsProviderSES {
    #config;
    #sqsClient;
    #lastFetchedEventId;
    #processedMessageIds;

    constructor({config, contentPath}) {
        this.#config = config;
        this.#lastFetchedEventId = null;
        this.#processedMessageIds = new Set(); // Track processed messages to avoid duplicates

        // Initialize SQS client if configuration is provided
        if (config?.queueUrl) {
            try {
                const {SQSClient} = require('@aws-sdk/client-sqs');

                const clientConfig = {
                    region: config.region || 'us-west-1'
                };

                // Add credentials if provided (otherwise uses IAM role)
                if (config.accessKeyId && config.secretAccessKey) {
                    clientConfig.credentials = {
                        accessKeyId: config.accessKeyId,
                        secretAccessKey: config.secretAccessKey
                    };
                }

                this.#sqsClient = new SQSClient(clientConfig);
                debug('Initialized SES analytics provider with SQS client');
                debug(`Queue URL: ${config.queueUrl}`);
            } catch (err) {
                if (err.code === 'MODULE_NOT_FOUND') {
                    logging.error('[SES Analytics] AWS SQS SDK not installed. Install with: yarn add @aws-sdk/client-sqs');
                }
                throw err;
            }
        } else {
            logging.warn('[SES Analytics] No SQS configuration provided. Analytics will not be available.');
        }
    }

    /**
     * Fetches the latest events from SES via SQS
     *
     * @param {Function} batchHandler - Function to call with batches of events
     * @param {Object} [options] - Fetch options
     * @param {Number} [options.maxEvents] - Maximum number of events to fetch
     * @param {Date} [options.begin] - Start timestamp
     * @param {Date} [options.end] - End timestamp
     * @param {String[]} [options.events] - Event types to fetch
     */
    async fetchLatest(batchHandler, options = {}) {
        debug('fetchLatest called with options:', options);

        if (!this.#sqsClient) {
            debug('SQS client not initialized, skipping fetch');
            return;
        }

        try {
            // Poll SQS queue continuously until empty or maxEvents reached
            // SQS returns max 10 per call, so we loop
            const allMessages = [];
            let hasMore = true;
            const maxIterations = 1000; // Safety limit: 10,000 messages max (1000 * 10)
            let iterations = 0;
            const maxEvents = options.maxEvents || Infinity;

            while (hasMore && iterations < maxIterations && allMessages.length < maxEvents) {
                // Calculate how many more messages we can fetch
                const remaining = maxEvents - allMessages.length;
                const fetchSize = Math.min(10, remaining);

                const messages = await this.#pollSQSQueue(fetchSize);

                if (!messages || messages.length === 0) {
                    hasMore = false;
                } else {
                    allMessages.push(...messages);
                    debug(`Batch ${iterations + 1}: Received ${messages.length} messages (total: ${allMessages.length})`);

                    // If we got fewer than requested, the queue is likely empty
                    if (messages.length < fetchSize) {
                        hasMore = false;
                    }

                    // Stop if we've reached maxEvents
                    if (allMessages.length >= maxEvents) {
                        debug(`Reached maxEvents limit of ${maxEvents}`);
                        hasMore = false;
                    }
                }

                iterations++;
            }

            if (allMessages.length === 0) {
                debug('No messages in queue');
                return;
            }

            debug(`Received ${allMessages.length} messages from SQS`);

            // Extract and normalize events from SQS messages
            const events = [];
            const messagesToDelete = [];

            for (const message of allMessages) {
                try {
                    // Skip if already processed (deduplication)
                    if (this.#processedMessageIds.has(message.MessageId)) {
                        debug(`Skipping duplicate message: ${message.MessageId}`);
                        messagesToDelete.push(message);
                        continue;
                    }

                    // Parse SNS message wrapper
                    const snsMessage = JSON.parse(message.Body);

                    // Parse SES event from SNS message
                    const sesEvent = JSON.parse(snsMessage.Message);

                    // Normalize to Ghost format
                    const normalizedEvent = this.#normalizeEvent(sesEvent);

                    if (normalizedEvent) {
                        // Apply filters
                        if (this.#shouldIncludeEvent(normalizedEvent, options)) {
                            events.push(normalizedEvent);
                        }

                        // Mark for deletion (successfully processed)
                        messagesToDelete.push(message);
                        this.#processedMessageIds.add(message.MessageId);
                    }
                } catch (error) {
                    logging.error('[SES Analytics] Error processing SQS message:', error);
                    // Don't delete messages that failed to process
                }
            }

            debug(`Normalized ${events.length} events`);

            // Process events in batches
            if (events.length > 0) {
                await batchHandler(events);

                // Remember the last event ID we processed
                this.#lastFetchedEventId = events[events.length - 1].id;
            }

            // Delete successfully processed messages from queue
            if (messagesToDelete.length > 0) {
                await this.#deleteMessages(messagesToDelete);
            }

        } catch (error) {
            logging.error('[SES Analytics] Error fetching events from SQS:', error);
            throw error;
        }
    }

    /**
     * Poll SQS queue for messages
     * @private
     * @param {number} maxMessages - Maximum number of messages to receive (1-10)
     * @returns {Promise<Array>} Array of SQS messages
     */
    async #pollSQSQueue(maxMessages = 10) {
        try {
            const {ReceiveMessageCommand} = require('@aws-sdk/client-sqs');

            const command = new ReceiveMessageCommand({
                QueueUrl: this.#config.queueUrl,
                MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS max is 10
                WaitTimeSeconds: 5, // Long polling
                VisibilityTimeout: 30 // 30 seconds to process before message becomes visible again
            });

            const response = await this.#sqsClient.send(command);
            return response.Messages || [];
        } catch (error) {
            logging.error('[SES Analytics] Error polling SQS queue:', error);
            throw error;
        }
    }

    /**
     * Delete messages from SQS queue after successful processing
     * @private
     * @param {Array} messages - Array of SQS messages to delete
     */
    async #deleteMessages(messages) {
        try {
            const {DeleteMessageCommand} = require('@aws-sdk/client-sqs');

            // Delete messages in parallel
            const deletePromises = messages.map(message =>
                this.#sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: this.#config.queueUrl,
                    ReceiptHandle: message.ReceiptHandle
                }))
            );

            await Promise.all(deletePromises);
            debug(`Deleted ${messages.length} messages from queue`);
        } catch (error) {
            logging.error('[SES Analytics] Error deleting messages from queue:', error);
            // Don't throw - we don't want to fail the entire fetch if deletion fails
            // Messages will be reprocessed due to deduplication check
        }
    }

    /**
     * Check if event should be included based on filters
     * @private
     * @param {Object} event - Normalized event
     * @param {Object} options - Filter options
     * @returns {boolean}
     */
    #shouldIncludeEvent(event, options) {
        // Filter by timestamp range
        if (options.begin && event.timestamp < options.begin) {
            return false;
        }

        if (options.end && event.timestamp > options.end) {
            return false;
        }

        // Filter by event type
        if (options.events && options.events.length > 0) {
            if (!options.events.includes(event.type)) {
                return false;
            }
        }

        return true;
    }


    /**
     * Normalize SES event to Ghost format
     * @private
     */
    #normalizeEvent(sesEvent) {
        try {
            // SES events come in different formats depending on the source
            // Handle both SNS notification format and raw event format
            const event = sesEvent.Message ? JSON.parse(sesEvent.Message) : sesEvent;

            const eventType = event.eventType || event.notificationType;
            const mail = event.mail || {};
            const messageId = mail.messageId || sesEvent.messageId;

            if (!messageId) {
                debug('Skipping event without message ID');
                return null;
            }

            // Extract email ID from message tags (set during send)
            const emailId = this.#extractEmailId(mail.tags, mail.headers);

            // Get recipient email
            const recipientEmail = this.#getRecipientEmail(event);

            if (!recipientEmail) {
                debug('Skipping event without recipient email');
                return null;
            }

            // Map SES event type to Ghost event type
            const ghostEventType = this.#mapSESEventType(eventType);

            if (!ghostEventType) {
                debug(`Skipping unsupported event type: ${eventType}`);
                return null;
            }

            // Build normalized event
            const normalizedEvent = {
                id: `${messageId}-${eventType}-${Date.now()}`,
                type: ghostEventType,
                recipientEmail: recipientEmail,
                emailId: emailId,
                providerId: messageId,
                timestamp: new Date(event.timestamp || mail.timestamp),
            };

            // Add severity and error info for bounces
            if (eventType === 'Bounce') {
                const bounce = event.bounce || {};
                normalizedEvent.severity = bounce.bounceType === 'Permanent' ? 'permanent' : 'temporary';

                if (bounce.bouncedRecipients && bounce.bouncedRecipients[0]) {
                    normalizedEvent.error = {
                        code: bounce.bouncedRecipients[0].status || 550,
                        message: bounce.bouncedRecipients[0].diagnosticCode || 'Email bounced'
                    };
                }
            }

            // Add severity for complaints
            if (eventType === 'Complaint') {
                normalizedEvent.severity = 'permanent';
            }

            debug(`Normalized event: ${ghostEventType} for ${recipientEmail}`);
            return normalizedEvent;

        } catch (error) {
            logging.error('[SES Analytics] Error normalizing event:', error);
            return null;
        }
    }

    /**
     * Map SES event type to Ghost event type
     * @private
     */
    #mapSESEventType(sesEventType) {
        const mapping = {
            'Send': 'delivered',
            'Delivery': 'delivered',
            'Open': 'opened',
            'Bounce': 'failed',
            'Complaint': 'complained',
            'Reject': 'failed'
        };

        return mapping[sesEventType] || null;
    }

    /**
     * Extract Ghost email ID from message tags or headers
     * @private
     */
    #extractEmailId(tags, headers) {
        // Check tags first (preferred method)
        if (tags && typeof tags === 'object') {
            if (tags['email-id']) {
                // Handle both array and string formats
                const emailId = tags['email-id'];
                return Array.isArray(emailId) ? emailId[0] : emailId;
            }
            // Handle tags as array of {name, value} objects
            if (Array.isArray(tags)) {
                const emailIdTag = tags.find(tag => tag.Name === 'email-id');
                if (emailIdTag) {
                    return emailIdTag.Value;
                }
            }
        }

        // Fallback to headers
        if (headers && Array.isArray(headers)) {
            const emailIdHeader = headers.find(h => h.name === 'X-Ghost-Email-Id');
            if (emailIdHeader) {
                return emailIdHeader.value;
            }
        }

        return null;
    }

    /**
     * Get recipient email from SES event
     * @private
     */
    #getRecipientEmail(event) {
        // Try different locations where recipient might be
        if (event.mail && event.mail.destination && event.mail.destination[0]) {
            return event.mail.destination[0];
        }

        if (event.bounce && event.bounce.bouncedRecipients && event.bounce.bouncedRecipients[0]) {
            return event.bounce.bouncedRecipients[0].emailAddress;
        }

        if (event.complaint && event.complaint.complainedRecipients && event.complaint.complainedRecipients[0]) {
            return event.complaint.complainedRecipients[0].emailAddress;
        }

        if (event.delivery && event.delivery.recipients && event.delivery.recipients[0]) {
            return event.delivery.recipients[0];
        }

        return null;
    }
}

module.exports = EmailAnalyticsProviderSES;
