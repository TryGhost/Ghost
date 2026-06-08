/**
 * @typedef {object} MemberPageViewEventData
 * @prop {string} memberId
 * @prop {string} memberLastSeenAt
 * @prop {string} url
 */

/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberPageViewEvent {
    /**
     * @param {MemberPageViewEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberPageViewEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberPageViewEvent(data, timestamp || new Date);
    }
};
