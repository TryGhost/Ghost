module.exports = class StartGiftReminderFlushEvent {
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
        return new StartGiftReminderFlushEvent(data, timestamp ?? new Date());
    }
};
