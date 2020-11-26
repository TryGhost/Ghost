const _ = require('lodash');

class EventProcessingResult {
    constructor(result = {}) {
        // counts
        this.delivered = 0;
        this.opened = 0;
        this.failed = 0;
        this.unsubscribed = 0;
        this.complained = 0;
        this.unhandled = 0;
        this.unprocessable = 0;

        // ids seen whilst processing ready for passing to the stats aggregator
        this.emailIds = [];
        this.memberIds = [];

        this.merge(result);
    }

    get totalEvents() {
        return this.delivered
            + this.opened
            + this.failed
            + this.unsubscribed
            + this.complained
            + this.unhandled
            + this.unprocessable;
    }

    merge(other = {}) {
        this.delivered += other.delivered || 0;
        this.opened += other.opened || 0;
        this.failed += other.failed || 0;
        this.unsubscribed += other.unsubscribed || 0;
        this.complained += other.complained || 0;
        this.unhandled += other.unhandled || 0;
        this.unprocessable += other.unprocessable || 0;

        this.emailIds = _.compact(_.union(this.emailIds, other.emailIds || []));
        this.memberIds = _.compact(_.union(this.memberIds, other.memberIds || []));
    }
}

module.exports = EventProcessingResult;
