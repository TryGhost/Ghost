/**
 * @typedef {object} MemberLastSeenAtJobEventData
 * @prop {string} memberId
 * @prop {Date} timestamp
 * @prop {string} timezone
 */

/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberLastSeenAtJobEvent {
    /**
     * @param {MemberLastSeenAtJobEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberLastSeenAtJobEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberLastSeenAtJobEvent(data, timestamp || new Date);
    }
};
