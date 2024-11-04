class EventProcessingResult {
    /**
     * @param {object} result
     * @param {number} [result.delivered]
     * @param {number} [result.opened]
     * @param {number} [result.temporaryFailed]
     * @param {number} [result.permanentFailed]
     * @param {number} [result.unsubscribed]
     * @param {number} [result.complained]
     * @param {number} [result.unhandled]
     * @param {number} [result.unprocessable]
     * @param {number} [result.processingFailures]
     * @param {string[]} [result.emailIds]
     * @param {string[]} [result.memberIds]
     */
    constructor(result = {}) {
        // counts
        this.delivered = 0;
        this.opened = 0;
        this.temporaryFailed = 0;
        this.permanentFailed = 0;
        this.unsubscribed = 0;
        this.complained = 0;
        this.unhandled = 0;
        this.unprocessable = 0;

        // processing failures are counted separately in addition to event type counts
        this.processingFailures = 0;

        // ids seen whilst processing ready for passing to the stats aggregator
        this.emailIds = [];
        this.memberIds = [];

        this.merge(result);
    }

    get totalEvents() {
        return this.delivered
            + this.opened
            + this.temporaryFailed
            + this.permanentFailed
            + this.unsubscribed
            + this.complained
            + this.unhandled
            + this.unprocessable;
    }

    merge(other = {}) {
        this.delivered += other.delivered || 0;
        this.opened += other.opened || 0;
        this.temporaryFailed += other.temporaryFailed || 0;
        this.permanentFailed += other.permanentFailed || 0;
        this.unsubscribed += other.unsubscribed || 0;
        this.complained += other.complained || 0;
        this.unhandled += other.unhandled || 0;
        this.unprocessable += other.unprocessable || 0;

        this.processingFailures += other.processingFailures || 0;

        // TODO: come up with a cleaner way to merge these without churning through Array and Set
        this.emailIds = Array.from(new Set([...this.emailIds, ...(other.emailIds || [])])).filter(Boolean);
        this.memberIds = Array.from(new Set([...this.memberIds, ...(other.memberIds || [])])).filter(Boolean);
    }
}

module.exports = EventProcessingResult;
