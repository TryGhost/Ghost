/**
 * @typedef {object} MemberUnsubscribeEventData
 * @prop {string} memberId
 * @prop {string} memberStatus
 * @prop {string} entryId
 * @prop {string} sourceUrl
 */

module.exports = class MemberUnsubscribeEvent {
    /**
     * @param {MemberUnsubscribeEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberUnsubscribeEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberUnsubscribeEvent(data, timestamp || new Date);
    }
};
