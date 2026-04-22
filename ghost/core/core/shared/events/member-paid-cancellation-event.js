/**
 * @typedef {object} MemberPaidCancellationEventData
 * @prop {string} memberId
 * @prop {string} memberStatus
 * @prop {string} subscriptionId
 * @prop {string} entryId
 * @prop {string} sourceUrl
 */

module.exports = class MemberPaidCancellationEvent {
    /**
     * @param {MemberPaidCancellationEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberPaidCancellationEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberPaidCancellationEvent(data, timestamp || new Date);
    }
};
