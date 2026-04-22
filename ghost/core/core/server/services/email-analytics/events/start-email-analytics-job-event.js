/**
 * This is an event that is used to circumvent the job manager that currently isn't able to run scheduled jobs on the main thread (not offloaded).
 * We simply emit this event in the job manager and listen for it on the main thread.
 */
module.exports = class StartEmailAnalyticsJobEvent {
    /**
     * @param {any} data
     * @param {Date} timestamp
     */
    constructor(data, timestamp) {
        this.data = data;
        this.timestamp = timestamp;
    }

    /**
     * @param {any} [data]
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new StartEmailAnalyticsJobEvent(data, timestamp ?? new Date);
    }
};
