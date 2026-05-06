/**
 * Fired when a subscription becomes active.
 *
 * @typedef {object} SubscriptionActivatedEventData
 * @prop {string} source
 * @prop {string} memberId
 * @prop {string} batchId
 * @prop {string} tierId
 * @prop {string} subscriptionId
 * @prop {string} attribution
 * @prop {string} offerId
 * @prop {string} [previousStatus] The member's status immediately before activation (e.g. 'free', 'paid', 'gift'). Used by subscribers to suppress duplicate notifications — e.g. staff was already notified at gift redemption.
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
