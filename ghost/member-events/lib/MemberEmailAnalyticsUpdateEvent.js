/**
 * @typedef {object} MemberEmailAnalyticsUpdateEventData
 * @prop {string} memberId
 */

module.exports = class MemberEmailAnalyticsUpdateEvent {
    /**
     * @param {MemberEmailAnalyticsUpdateEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberEmailAnalyticsUpdateEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberEmailAnalyticsUpdateEvent(data, timestamp ?? new Date);
    }
};