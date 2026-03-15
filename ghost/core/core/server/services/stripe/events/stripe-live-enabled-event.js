/**
 * @typedef {object} StripeLiveEnabledEventData
 * @prop {string} message
 */

module.exports = class StripeLiveEnabledEvent {
    /**
     * @param {StripeLiveEnabledEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {StripeLiveEnabledEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new StripeLiveEnabledEvent(data, timestamp || new Date);
    }
};
