/**
 * @typedef {object} MemberCreatedEventData
 * @prop {string} memberId
 * @prop {string} batchId
 * @prop {'import' | 'system' | 'api' | 'admin' | 'member'} source
 * @prop {string} [tierId]
 * @prop {import('@tryghost/member-attribution/lib/Attribution').Attribution} [attribution] Attribution
 * @prop {{id?: string, durationMonths?: number}} [gift]
 */

module.exports = class MemberCreatedEvent {
    /**
     * @param {MemberCreatedEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {MemberCreatedEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new MemberCreatedEvent(data, timestamp ?? new Date);
    }
};
