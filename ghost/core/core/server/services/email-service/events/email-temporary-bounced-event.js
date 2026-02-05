module.exports = class EmailTemporaryBouncedEvent {
    /**
     * @readonly
     * @type {string}
     */
    id;

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
     * @type {{message: string, code: number, enhancedCode: string | null}|null}
     */
    error;

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
    constructor({id, email, memberId, emailId, emailRecipientId, error, timestamp}) {
        this.id = id;
        this.memberId = memberId;
        this.emailId = emailId;
        this.email = email;
        this.error = error;
        this.emailRecipientId = emailRecipientId;
        this.timestamp = timestamp;
    }

    static create(data) {
        return new EmailTemporaryBouncedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
