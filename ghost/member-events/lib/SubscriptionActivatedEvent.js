/**
 * Fired when a subscription becomes active.
 *
 * @typedef {object} SubscriptionActivatedEventData
 * @prop {string} source
 * @prop {string} memberId
 * @prop {string} batchId
 * @prop {string} tierId
 * @prop {string} subscriptionId
 * @prop {string} offerId
 */

module.exports = class SubscriptionActivatedEvent {
    /**
     * @param {SubscriptionActivatedEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {SubscriptionActivatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new SubscriptionActivatedEvent(data, timestamp ?? new Date);
    }
};
