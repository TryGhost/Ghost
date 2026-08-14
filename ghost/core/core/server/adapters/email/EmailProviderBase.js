const errors = require('@tryghost/errors');

/**
 * Base class for email provider adapters
 *
 * All email providers must implement the required methods defined below.
 * This ensures consistent interface across different email providers (Mailgun, SendGrid, AWS SES, etc.)
 *
 * This base class handles both email sending and analytics fetching in a unified interface.
 */
class EmailProviderBase {
    /**
     * Required methods that all email providers must implement
     */
    static requiredFns = ['send', 'getMaximumRecipients', 'getTargetDeliveryWindow', 'fetchLatest'];

    constructor(config) {
        this.config = config;
    }

    /**
     * Send an email
     *
     * @param {Object} data - Email data
     * @param {string} data.subject - Email subject
     * @param {string} data.html - HTML content
     * @param {string} data.plaintext - Plain text content
     * @param {string} data.from - Sender email address
     * @param {string} data.emailId - Email ID for tracking
     * @param {string} [data.replyTo] - Reply-to address
     * @param {string} [data.domainOverride] - Override domain
     * @param {Array<Object>} data.recipients - Array of recipients
     * @param {Array<Object>} data.replacementDefinitions - Replacement variable definitions
     *
     * @param {Object} options - Sending options
     * @param {boolean} options.clickTrackingEnabled - Enable click tracking
     * @param {boolean} options.openTrackingEnabled - Enable open tracking
     * @param {Date} [options.deliveryTime] - Scheduled delivery time
     *
     * @returns {Promise<{id: string}>} Provider message ID
     */
    async send() {
        throw new errors.IncorrectUsageError({
            message: 'EmailProviderBase.send must be implemented by the email adapter'
        });
    }

    /**
     * Get maximum number of recipients per batch
     *
     * @returns {number} Maximum recipients
     */
    getMaximumRecipients() {
        throw new errors.IncorrectUsageError({
            message: 'EmailProviderBase.getMaximumRecipients must be implemented by the email adapter'
        });
    }

    /**
     * Get target delivery window in milliseconds
     *
     * @returns {number} Delivery window in milliseconds
     */
    getTargetDeliveryWindow() {
        throw new errors.IncorrectUsageError({
            message: 'EmailProviderBase.getTargetDeliveryWindow must be implemented by the email adapter'
        });
    }

    /**
     * Fetch latest email events for analytics
     *
     * @param {Function} batchHandler - Handler for processing event batches
     * @param {Object} [options] - Fetch options
     * @param {number} [options.maxEvents] - Maximum events to fetch (not strict)
     * @param {Date} [options.begin] - Start date for events
     * @param {Date} [options.end] - End date for events
     * @param {String[]} [options.events] - Event types to fetch
     * @returns {Promise<void>}
     */
    async fetchLatest() {
        throw new errors.IncorrectUsageError({
            message: 'EmailProviderBase.fetchLatest must be implemented by the email adapter'
        });
    }
}

module.exports = EmailProviderBase;
