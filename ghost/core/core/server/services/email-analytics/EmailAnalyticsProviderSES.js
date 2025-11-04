const fs = require('fs').promises;
const path = require('path');
const debug = require('@tryghost/debug')('email-analytics:ses');
const logging = require('@tryghost/logging');

/**
 * Email Analytics Provider for Amazon SES
 *
 * Fetches email events from SES and normalizes them to Ghost's format.
 *
 * MVP Implementation: Reads events from a JSON file
 * Future: Will read from SNS webhook endpoint or CloudWatch Logs
 */
class EmailAnalyticsProviderSES {
    #config;
    #eventsFilePath;
    #lastFetchedEventId;

    constructor({config, contentPath}) {
        this.#config = config;

        // For MVP, store events in a file in Ghost's content directory
        // contentPath already points to the data directory
        this.#eventsFilePath = contentPath
            ? path.join(contentPath, 'ses-events.json')
            : path.join(__dirname, '../../../../../../content/data/ses-events.json');

        this.#lastFetchedEventId = null;

        debug('Initialized SES analytics provider');
        debug(`Events file path: ${this.#eventsFilePath}`);
    }

    /**
     * Fetches the latest events from SES
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

        try {
            // Read events from file
            const events = await this.#readEventsFromFile();

            if (!events || events.length === 0) {
                debug('No events found');
                return;
            }

            // Filter events based on options
            let filteredEvents = this.#filterEvents(events, options);

            // Normalize events to Ghost format
            const normalizedEvents = filteredEvents
                .map(event => this.#normalizeEvent(event))
                .filter(event => event !== null);

            debug(`Fetched ${normalizedEvents.length} events`);

            // Process events in batches
            if (normalizedEvents.length > 0) {
                await batchHandler(normalizedEvents);

                // Remember the last event ID we processed
                if (normalizedEvents.length > 0) {
                    this.#lastFetchedEventId = normalizedEvents[normalizedEvents.length - 1].id;
                }
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                debug('Events file does not exist yet');
                logging.info('[SES Analytics] No events file found. Waiting for events...');
            } else {
                logging.error('[SES Analytics] Error fetching events:', error);
                throw error;
            }
        }
    }

    /**
     * Read events from the JSON file
     * @private
     */
    async #readEventsFromFile() {
        try {
            const fileContent = await fs.readFile(this.#eventsFilePath, 'utf8');
            const data = JSON.parse(fileContent);
            return Array.isArray(data) ? data : (data.events || []);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logging.error('[SES Analytics] Error reading events file:', error);
            }
            return [];
        }
    }

    /**
     * Filter events based on timestamp and type
     * @private
     */
    #filterEvents(events, options) {
        let filtered = events;

        // Filter by timestamp range
        if (options.begin) {
            filtered = filtered.filter(event => {
                const eventTime = new Date(event.timestamp || event.mail?.timestamp);
                return eventTime >= options.begin;
            });
        }

        if (options.end) {
            filtered = filtered.filter(event => {
                const eventTime = new Date(event.timestamp || event.mail?.timestamp);
                return eventTime <= options.end;
            });
        }

        // Filter by event type
        if (options.events && options.events.length > 0) {
            filtered = filtered.filter(event => {
                const eventType = this.#mapSESEventType(event.eventType);
                return options.events.includes(eventType);
            });
        }

        // Limit number of events
        if (options.maxEvents) {
            filtered = filtered.slice(0, options.maxEvents);
        }

        return filtered;
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
