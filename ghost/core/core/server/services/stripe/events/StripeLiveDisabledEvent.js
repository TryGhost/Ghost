/**
 * @typedef {object} StripeLiveDisabledEventData
 * @prop {string?} message
 */

module.exports = class StripeLiveDisabledEvent {
    /**
     * @param {StripeLiveDisabledEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {StripeLiveDisabledEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new StripeLiveDisabledEvent(data, timestamp || new Date);
    }
};
