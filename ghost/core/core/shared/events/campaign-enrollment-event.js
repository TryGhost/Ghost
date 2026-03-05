/**
 * @typedef {object} CampaignEnrollmentEventData
 * @prop {string} memberId
 * @prop {string} memberEmail
 * @prop {string} memberName
 * @prop {string} memberUuid
 * @prop {string} campaignType - 'free_signup' | 'paid_signup' | 'paid_conversion'
 * @prop {string} source
 */

module.exports = class CampaignEnrollmentEvent {
    /**
     * @param {CampaignEnrollmentEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {CampaignEnrollmentEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new CampaignEnrollmentEvent(data, timestamp ?? new Date());
    }
};
