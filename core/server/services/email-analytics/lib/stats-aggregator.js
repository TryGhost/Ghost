class EmailAnalyticsStatsAggregator {
    constructor({options, logging, db}) {
        this.options = Object.assign({openRateEmailThreshold: 5}, options);
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

    async aggregateMember(memberId) {
        const {trackedEmailCount} = await this.db.knex('email_recipients')
            .select(this.db.knex.raw('COUNT(email_recipients.id) as trackedEmailCount'))
            .leftJoin('emails', 'email_recipients.email_id', 'emails.id')
            .where('email_recipients.member_id', memberId)
            .where('emails.track_opens', true)
            .first() || {};

        const updateQuery = {
            email_count: this.db.knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE member_id = ?)', [memberId]),
            email_opened_count: this.db.knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE member_id = ? AND opened_at IS NOT NULL)', [memberId])
        };

        if (trackedEmailCount >= this.options.openRateEmailThreshold) {
            updateQuery.email_open_rate = this.db.knex.raw(`
                ROUND(((SELECT COUNT(id) FROM email_recipients WHERE member_id = ? AND opened_at IS NOT NULL) * 1.0 / ? * 100), 0)
            `, [memberId, trackedEmailCount]);
        }

        await this.db.knex('members')
            .update(updateQuery)
            .where('id', memberId);
    }
}

module.exports = EmailAnalyticsStatsAggregator;
