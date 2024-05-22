/** @typedef {import('../models/OfferCode')} OfferCode */

/**
 * @typedef {object} OfferCodeChangeEventData
 * @prop {string} offerId
 * @prop {OfferCode} previousCode
 * @prop {OfferCode} currentCode
 */

module.exports = class OfferCodeChangeEvent {
    /**
     * @param {OfferCodeChangeEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {OfferCodeChangeEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new OfferCodeChangeEvent(data, timestamp || new Date);
    }
};
