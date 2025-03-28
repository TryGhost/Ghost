/**
 * @typedef {object} TierNameChangeEventData
 * @prop {Tier} tier
 */

class TierNameChangeEvent {
    /** @type {TierNameChangeEventData} */
    data;
    /** @type {Date} */
    timestamp;

    /**
     * @param {TierNameChangeEvent} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {TierNameChangeEvent} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp = new Date()) {
        return new TierNameChangeEvent(data, timestamp);
    }
}

module.exports = TierNameChangeEvent;
