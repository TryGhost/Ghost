/**
 * Fired when a subscription is created. This can also happen when inactive subscriptions are created (incomplete, canceled...).
 *
 * @typedef {object} SubscriptionCreatedEventData
 * @prop {string} source
 * @prop {string} memberId
 * @prop {string} batchId
 * @prop {string} tierId
 * @prop {string} subscriptionId
 * @prop {string} offerId
 * @prop {import('@tryghost/member-attribution/lib/Attribution').Attribution} [attribution]
 */

module.exports = class SubscriptionCreatedEvent {
    /**
     * @param {SubscriptionCreatedEventData} data
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
        return new SubscriptionCreatedEvent(data, timestamp ?? new Date);
    }
};
