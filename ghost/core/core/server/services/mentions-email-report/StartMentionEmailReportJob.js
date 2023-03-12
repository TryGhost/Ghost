module.exports = class StartMentionEmailReportJob {
    /**
     * @param {Date} timestamp
     */
    constructor(timestamp) {
        this.data = null;
        this.timestamp = timestamp;
    }

    /**
     * @param {Date} [timestamp]
     */
    static create(data, timestamp) {
        return new StartMentionEmailReportJob(timestamp ?? new Date);
    }
};
