/**
 * @typedef {object} TierActivatedEventData
 * @prop {Tier} tier
 */

class TierActivatedEvent {
    /** @type {TierActivatedEventData} */
    data;
    /** @type {Date} */
    timestamp;

    /**
     * @param {TierActivatedEvent} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {TierActivatedEvent} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp = new Date()) {
        return new TierActivatedEvent(data, timestamp);
    }
}

module.exports = TierActivatedEvent;
