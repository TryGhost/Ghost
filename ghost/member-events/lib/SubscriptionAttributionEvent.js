/**
 * Fired when we receive attribution data for a subscription
 *
 * @typedef {object} SubscriptionAttributionEventData
 * @prop {string} subscriptionId
 * @prop {import('@tryghost/member-attribution/lib/Attribution').Attribution} attribution
 */

module.exports = class SubscriptionAttributionEvent {
    /**
     * @param {SubscriptionAttributionEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {SubscriptionCreatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new SubscriptionAttributionEvent(data, timestamp ?? new Date);
    }
};
