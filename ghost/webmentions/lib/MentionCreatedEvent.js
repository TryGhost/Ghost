/**
 * @typedef {object} MentionCreatedEventData
 */

module.exports = class MentionCreatedEvent {
    /**
     * @param {MentionCreatedEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MentionCreatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MentionCreatedEvent(data, timestamp ?? new Date);
    }
};
