/**
 * @typedef {object} MemberSubscribeEventData
 * @prop {string} memberId
 * @prop {string} source
 */

module.exports = class MemberSubscribeEvent {
    /**
     * @param {MemberSubscribeEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberSubscribeEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberSubscribeEvent(data, timestamp || new Date);
    }
};
