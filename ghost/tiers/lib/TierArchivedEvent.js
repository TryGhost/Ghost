/**
 * @typedef {object} TierArchivedEventData
 * @prop {Tier} tier
 */

class TierArchivedEvent {
    /** @type {TierArchivedEventData} */
    data;
    /** @type {Date} */
    timestamp;

    /**
     * @param {TierArchivedEvent} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {TierArchivedEvent} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp = new Date()) {
        return new TierArchivedEvent(data, timestamp);
    }
}

module.exports = TierArchivedEvent;
