const errors = require('@tryghost/errors');

/**
 * Base class for email provider adapters
 *
 * Email provider adapters handle sending bulk emails through various email service providers.
 * All email provider adapters must extend this base class and implement the required methods.
 *
 * @abstract
 */
class EmailProviderBase {
    /**
     * @param {Object} config - Provider-specific configuration
     */
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['send'],
            writable: false
        });

        /**
         * Provider configuration
         * @type {Object}
         */
        this.config = config || {};
    }

    /**
     * Send an email
     *
     * @abstract
     * @param {Object} data - Email data
     * @param {string} data.subject - Email subject
     * @param {string} data.html - Email HTML content
     * @param {string} data.plaintext - Email plain text content
     * @param {Object[]} data.recipients - Array of recipient objects
     * @param {string} data.recipients[].email - Recipient email address
     * @param {Object} [options] - Send options
     * @param {boolean} [options.clickTrackingEnabled] - Enable click tracking
     * @param {boolean} [options.openTrackingEnabled] - Enable open tracking
     * @returns {Promise<{id: string}>} Object containing the provider's message ID
     */
    async send(data, options) {
        throw new errors.IncorrectUsageError({
            message: 'send() must be implemented by email provider adapter'
        });
    }
}

module.exports = EmailProviderBase;
