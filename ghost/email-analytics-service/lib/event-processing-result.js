const _ = require('lodash');

class EventProcessingResult {
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

        this.emailIds = _.compact(_.union(this.emailIds, other.emailIds || []));
        this.memberIds = _.compact(_.union(this.memberIds, other.memberIds || []));
    }
}

module.exports = EventProcessingResult;
