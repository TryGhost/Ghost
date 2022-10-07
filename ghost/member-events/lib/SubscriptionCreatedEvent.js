/**
 * @typedef {object} SubscriptionCreatedEventData
 * @prop {string} source
 * @prop {string} memberId
 * @prop {string} tierId
 * @prop {string} subscriptionId
 * @prop {string} offerId
 * @prop {import('@tryghost/member-attribution/lib/attribution').Attribution} [attribution]
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
