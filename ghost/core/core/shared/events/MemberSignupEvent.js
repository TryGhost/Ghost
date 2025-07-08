/**
 * @typedef {object} MemberSignupEventData
 * @prop {string} memberId
 * @prop {string} entryId
 * @prop {string} sourceUrl
 */

module.exports = class MemberSignupEvent {
    /**
     * @param {MemberSignupEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberSignupEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberSignupEvent(data, timestamp || new Date);
    }
};

