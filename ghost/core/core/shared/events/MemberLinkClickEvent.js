/**
 * @typedef {object} MemberLinkClickEventData
 * @prop {string} memberId
 * @prop {string} memberLastSeenAt
 * @prop {string} linkId
 */

/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberLinkClickEvent {
    /**
     * @param {MemberLinkClickEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberLinkClickEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberLinkClickEvent(data, timestamp || new Date);
    }
};
