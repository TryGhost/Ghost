module.exports = class StartGiftReminderFlushEvent {
    /**
     * @param {Date} timestamp
     */
    constructor(timestamp) {
        this.data = null;
        this.timestamp = timestamp;
    }

    /**
     * @returns {StartGiftReminderFlushEvent}
     */
    static create() {
        return new StartGiftReminderFlushEvent(new Date());
    }
};
