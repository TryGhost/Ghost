/**
 * @typedef {object} TierPriceChangeEventData
 * @prop {import('./tier')} tier
 */

class TierPriceChangeEvent {
    /** @type {TierPriceChangeEventData} */
    data;
    /** @type {Date} */
    timestamp;

    /**
     * @param {TierPriceChangeEvent} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {TierPriceChangeEvent} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp = new Date()) {
        return new TierPriceChangeEvent(data, timestamp);
    }
}

module.exports = TierPriceChangeEvent;
