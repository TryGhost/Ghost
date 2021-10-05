/**
 * @typedef {object} OfferCodeChangeEventData
 * @prop {string} offerId
 * @prop {string[]} previousCodes
 * @prop {string} currentCode
 */

class OfferCodeChangeEvent {
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
}

module.exports = OfferCodeChangeEvent;
