/**
 * @typedef {import('bson-objectid').default} ObjectID
 */

module.exports = class EmailBouncedEvent {
    /**
     * @readonly
     * @type {string}
     */
    email;

    /**
     * @readonly
     * @type {ObjectID}
     */
    memberId;

    /**
     * @readonly
     * @type {ObjectID}
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
        this.email = email;
        this.memberId = memberId;
        this.emailId = emailId;
        this.timestamp = timestamp;
    }

    static create(data) {
        return new EmailBouncedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
