/**
 * @typedef {object} TierCreatedEventData
 * @prop {import('./tier')} tier
 */

class TierCreatedEvent {
    /** @type {TierCreatedEventData} */
    data;
    /** @type {Date} */
    timestamp;

    /**
     * @param {TierCreatedEvent} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {TierCreatedEvent} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp = new Date()) {
        return new TierCreatedEvent(data, timestamp);
    }
}

module.exports = TierCreatedEvent;
