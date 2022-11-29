module.exports = class EmailDeliveredEvent {
    /**
     * @readonly
     * @type {string}
     */
    email;

    /**
     * @readonly
     * @type {string}
     */
    memberId;

    /**
     * @readonly
     * @type {string}
     */
    emailId;

    /**
     * @readonly
     * @type {string}
     */
    emailRecipientId;

    /**
     * @readonly
     * @type {Date}
     */
    timestamp;

    /**
     * @private
     */
    constructor({email, memberId, emailId, emailRecipientId, timestamp}) {
        this.email = email;
        this.memberId = memberId;
        this.emailId = emailId;
        this.emailRecipientId = emailRecipientId;
        this.timestamp = timestamp;
    }

    static create(data) {
        return new EmailDeliveredEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
