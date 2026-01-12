/**
 * @typedef {object} MemberPaidConversionEventData
 * @prop {string} memberId
 * @prop {string} memberStatus
 * @prop {string} subscriptionId
 * @prop {string} entryId
 * @prop {string} sourceUrl
 */

module.exports = class MemberPaidConversionEvent {
    /**
     * @param {MemberPaidConversionEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberPaidConversionEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberPaidConversionEvent(data, timestamp || new Date);
    }
};
