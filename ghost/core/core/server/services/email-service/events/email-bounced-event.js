module.exports = class EmailBouncedEvent {
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
     * True when this bounce was reported by an adapter's webhook (see
     * EmailAnalyticsWebhookController), as opposed to the Mailgun poll loop. The
     * suppression-list subscriber uses this to trust the bounce directly instead of
     * checking for a Mailgun-shaped error code, without changing Mailgun's own gate.
     * @readonly
     * @type {boolean}
     */
    isWebhookSourced;

    /**
     * @private
     */
    constructor({id, email, memberId, emailId, error, emailRecipientId, timestamp, isWebhookSourced}) {
        this.id = id;
        this.memberId = memberId;
        this.emailId = emailId;
        this.email = email;
        this.error = error;
        this.emailRecipientId = emailRecipientId;
        this.timestamp = timestamp;
        this.isWebhookSourced = Boolean(isWebhookSourced);
    }

    static create(data) {
        return new EmailBouncedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
