/**
 * @typedef {object} RedirectEventData
 * @prop {URL} url
 * @prop {import('./LinkRedirect')} link
 */

module.exports = class RedirectEvent {
    /**
     * @param {RedirectEventData} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {RedirectEventData} data
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new RedirectEvent(data, timestamp ?? new Date);
    }
};
