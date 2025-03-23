module.exports = class EmailOpenedEvent {
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
        this.memberId = memberId;
        this.emailId = emailId;
        this.emailRecipientId = emailRecipientId;
        this.email = email;
        this.timestamp = timestamp;
    }

    static create(data) {
        return new EmailOpenedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
