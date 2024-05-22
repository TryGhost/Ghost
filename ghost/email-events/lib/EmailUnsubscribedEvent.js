module.exports = class EmailUnsubscribedEvent {
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
     * @type {Date}
     */
    timestamp;

    /**
     * @private
     */
    constructor({email, memberId, emailId, timestamp}) {
        this.memberId = memberId;
        this.emailId = emailId;
        this.email = email;
        this.timestamp = timestamp;
    }

    static create(data) {
        return new EmailUnsubscribedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
