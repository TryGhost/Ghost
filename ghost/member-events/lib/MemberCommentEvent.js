/**
 * @typedef {object} MemberCommentEventData
 * @prop {string} memberId
 * @prop {string} commentId
 * @prop {string} postId
 */

/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class MemberCommentEvent {
    /**
     * @param {MemberCommentEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberCommentEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberCommentEvent(data, timestamp || new Date);
    }
};
