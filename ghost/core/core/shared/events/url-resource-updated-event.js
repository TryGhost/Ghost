module.exports = class URLResourceUpdatedEvent {
    /**
     * @readonly
     * @type {Object}
     */
    data;

    /**
     * @readonly
     * @type {Date}
     */
    timestamp;

    /**
     * @private
     */
    constructor({timestamp, ...data}) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     *
     * @param {Object} data URL Resource
     * @returns
     */
    static create(data) {
        return new URLResourceUpdatedEvent({
            ...data,
            timestamp: data.timestamp || new Date
        });
    }
};
