/**
 * @typedef {object} MemberEntryViewEventData
 * @prop {string} memberId
 * @prop {string} memberStatus
 * @prop {string} entryId
 * @prop {string} entryUrl
 */

module.exports = class MemberEntryViewEvent {
    /**
     * @param {MemberEntryViewEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberEntryViewEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberEntryViewEvent(data, timestamp || new Date);
    }
};
