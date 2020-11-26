class EmailAnalyticsStatsAggregator {
    constructor({logging, db}) {
        this.logging = logging || console;
        this.db = db;
    }

    async aggregateEmail(emailId) {
        await this.db.knex('emails').update({
            delivered_count: this.db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND delivered_at IS NOT NULL)`, [emailId]),
            opened_count: this.db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND opened_at IS NOT NULL)`, [emailId]),
            failed_count: this.db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND failed_at IS NOT NULL)`, [emailId])
        }).where('id', emailId);
    }

    async aggregateMember(/*memberId*/) {
        // TODO: decide on aggregation algorithm when only certain emails have open tracking
    }
}

module.exports = EmailAnalyticsStatsAggregator;
