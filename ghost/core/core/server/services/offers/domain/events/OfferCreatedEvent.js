/** @typedef {import('../models/Offer')} Offer */

/**
 * @typedef {object} OfferCreatedEventData
 * @prop {Offer} offer
 */

module.exports = class OfferCreatedEvent {
    /**
     * @param {OfferCreatedEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {OfferCreatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new OfferCreatedEvent(data, timestamp || new Date);
    }
};
