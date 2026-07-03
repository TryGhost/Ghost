/**
 * This event lets the job manager ask the main thread to start the automation email analytics pipeline.
 */
module.exports = class StartAutomationEmailAnalyticsJobEvent {
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
        return new StartAutomationEmailAnalyticsJobEvent(data, timestamp ?? new Date);
    }
};
