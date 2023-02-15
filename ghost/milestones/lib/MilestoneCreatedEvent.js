/**
 * @typedef {object} MilestoneCreatedEventData
 */

module.exports = class MilestoneCreatedEvent {
    /**
     * @param {MilestoneCreatedEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MilestoneCreatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MilestoneCreatedEvent(data, timestamp ?? new Date);
    }
};
