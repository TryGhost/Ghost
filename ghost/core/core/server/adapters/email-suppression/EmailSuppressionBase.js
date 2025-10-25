const errors = require('@tryghost/errors');

/**
 * Base class for email suppression list adapters
 *
 * All email suppression adapters must extend this class and implement the required methods.
 * Used by AdapterManager to validate adapter contracts.
 *
 * Email suppression adapters manage bounce and spam complaint lists, preventing emails
 * from being sent to suppressed addresses.
 */
class EmailSuppressionBase {
    /**
     * @param {Object} [config] - Adapter configuration
     */
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['getSuppressionData', 'getBulkSuppressionData', 'removeEmail'],
            writable: false
        });
        this.config = config || {};
    }

    /**
     * Get suppression data for a single email address
     *
     * @param {string} email - Email address to check
     * @returns {Promise<EmailSuppressionData>} Suppression status and info
     *
     * @example
     * const data = await adapter.getSuppressionData('user@example.com');
     * if (data.suppressed) {
     *     console.log(`Suppressed due to ${data.info.reason} at ${data.info.timestamp}`);
     * }
     */
    async getSuppressionData() {
        throw new errors.IncorrectUsageError({
            message: 'getSuppressionData() must be implemented by email suppression adapter'
        });
    }

    /**
     * Get suppression data for multiple email addresses
     *
     * @param {string[]} emails - Array of email addresses to check
     * @returns {Promise<EmailSuppressionData[]>} Array of suppression data in same order as input
     *
     * @example
     * const results = await adapter.getBulkSuppressionData(['a@example.com', 'b@example.com']);
     * results.forEach((data, index) => {
     *     if (data.suppressed) {
     *         console.log(`${emails[index]} is suppressed`);
     *     }
     * });
     */
    async getBulkSuppressionData() {
        throw new errors.IncorrectUsageError({
            message: 'getBulkSuppressionData() must be implemented by email suppression adapter'
        });
    }

    /**
     * Remove an email address from the suppression list
     *
     * @param {string} email - Email address to remove
     * @returns {Promise<boolean>} True if successfully removed, false otherwise
     *
     * @example
     * const success = await adapter.removeEmail('user@example.com');
     * if (success) {
     *     console.log('Email removed from suppression list');
     * }
     */
    async removeEmail() {
        throw new errors.IncorrectUsageError({
            message: 'removeEmail() must be implemented by email suppression adapter'
        });
    }
}

module.exports = EmailSuppressionBase;
