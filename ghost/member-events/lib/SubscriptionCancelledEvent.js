/**
 * @typedef {object} SubscriptionCancelledEventData
 * @prop {string} source
 * @prop {string} memberId
 * @prop {string} tierId
 * @prop {string} subscriptionId
 */

module.exports = class SubscriptionCancelledEvent {
    /**
     * @param {SubscriptionCancelledEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {SubscriptionCancelledEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new SubscriptionCancelledEvent(data, timestamp || new Date);
    }
};
