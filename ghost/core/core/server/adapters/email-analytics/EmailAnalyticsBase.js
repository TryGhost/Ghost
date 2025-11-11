const errors = require('@tryghost/errors');

/**
 * Base class for email analytics provider adapters
 *
 * All email analytics adapters must extend this class and implement the fetchLatest() method.
 * Used by AdapterManager to validate adapter contracts.
 *
 * Email analytics adapters fetch email events (delivered, opened, failed, unsubscribed, complained)
 * from email service providers and process them to update member and email statistics.
 */
class EmailAnalyticsBase {
    /**
     * @param {Object} [config] - Adapter configuration
     */
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['fetchLatest'],
            writable: false
        });
        this.config = config || {};
    }

    /**
     * Fetch latest email events from the provider
     *
     * @param {Function} batchHandler - Called with array of events for each batch
     * @param {Object} options - Fetch options
     * @param {Date} options.begin - Start timestamp (inclusive)
     * @param {Date} options.end - End timestamp (exclusive)
     * @param {number} [options.maxEvents] - Maximum events to fetch
     * @param {string[]} [options.events] - Event types to fetch (delivered, opened, failed, unsubscribed, complained)
     * @returns {Promise<void>}
     *
     * @example
     * await provider.fetchLatest((events) => {
     *     // Process batch of events
     *     events.forEach(event => {
     *         console.log(event.type, event.recipientEmail);
     *     });
     * }, {
     *     begin: new Date('2025-01-01'),
     *     end: new Date('2025-01-02'),
     *     maxEvents: 1000,
     *     events: ['opened', 'delivered']
     * });
     */
    async fetchLatest() {
        throw new errors.IncorrectUsageError({
            message: 'fetchLatest() must be implemented by email analytics provider adapter'
        });
    }
}

module.exports = EmailAnalyticsBase;
