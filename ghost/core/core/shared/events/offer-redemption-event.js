/**
 * @typedef {object} OfferRedemptionEventData
 * @prop {string} memberId
 * @prop {string} offerId
 * @prop {string} subscriptionId
 */

/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class OfferRedemptionEvent {
    /**
     * @param {OfferRedemptionEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {OfferRedemptionEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new OfferRedemptionEvent(data, timestamp || new Date);
    }
};
