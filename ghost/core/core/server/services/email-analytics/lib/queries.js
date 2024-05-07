const debug = require('@tryghost/debug')('services:email-analytics');
const db = require('../../../data/db');

const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

module.exports = {
    async shouldFetchStats() {
        // don't fetch stats from Mailgun if we haven't sent any emails
        const [emailCount] = await db.knex('emails').count('id as count');
        return emailCount && emailCount.count > 0;
    },

    async getLastSeenEventTimestamp() {
        const startDate = new Date();

        // First, try to fetch the max latest_event_timestamp
        let {maxTimestamp} = await db.knex('emails').select(db.knex.raw('MAX(latest_event_timestamp) as maxTimestamp')).first() || {};

        if (maxTimestamp) {
            if (!(maxTimestamp instanceof Date)) {
                // SQLite returns a string instead of a Date
                maxTimestamp = new Date(maxTimestamp);
            }
        } else {
            // Legacy fallback for installations that don't have the latest_event_timestamp column nor have it populated, could potentially remove this in a few weeks.
            let {maxDeliveredAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(delivered_at) as maxDeliveredAt')).first() || {};
            let {maxOpenedAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(opened_at) as maxOpenedAt')).first() || {};
            let {maxFailedAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(failed_at) as maxFailedAt')).first() || {};

            if (maxDeliveredAt && !(maxDeliveredAt instanceof Date)) {
                // SQLite returns a string instead of a Date
                maxDeliveredAt = new Date(maxDeliveredAt);
            }

            if (maxOpenedAt && !(maxOpenedAt instanceof Date)) {
                // SQLite returns a string instead of a Date
                maxOpenedAt = new Date(maxOpenedAt);
            }

            if (maxFailedAt && !(maxFailedAt instanceof Date)) {
                // SQLite returns a string instead of a Date
                maxFailedAt = new Date(maxFailedAt);
            }
        }

        debug(`getLastSeenEventTimestamp: finished in ${Date.now() - startDate}ms`);
        return maxTimestamp;
    },

    async aggregateEmailStats(emailId) {
        const {totalCount} = await db.knex('emails').select(db.knex.raw('email_count as totalCount')).where('id', emailId).first() || {totalCount: 0};
        // use IS NULL here because that will typically match far fewer rows than IS NOT NULL making the query faster
        const [undeliveredCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND delivered_at IS NULL', [emailId]);
        const [openedCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND opened_at IS NOT NULL', [emailId]);
        const [failedCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND failed_at IS NOT NULL', [emailId]);

        await db.knex('emails').update({
            delivered_count: totalCount - undeliveredCount.count,
            opened_count: openedCount.count,
            failed_count: failedCount.count
        }).where('id', emailId);
    },

    async aggregateMemberStats(memberId) {
        const {trackedEmailCount} = await db.knex('email_recipients')
            .select(db.knex.raw('COUNT(email_recipients.id) as trackedEmailCount'))
            .leftJoin('emails', 'email_recipients.email_id', 'emails.id')
            .where('email_recipients.member_id', memberId)
            .where('emails.track_opens', true)
            .first() || {};

        const [emailCount] = await db.knex('email_recipients').count('id as count').whereRaw('member_id = ?', [memberId]);
        const [emailOpenedCount] = await db.knex('email_recipients').count('id as count').whereRaw('member_id = ? AND opened_at IS NOT NULL', [memberId]);

        const updateQuery = {
            email_count: emailCount.count,
            email_opened_count: emailOpenedCount.count
        };

        if (trackedEmailCount >= MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
            updateQuery.email_open_rate = Math.round(emailOpenedCount.count / trackedEmailCount * 100);
        }

        await db.knex('members')
            .update(updateQuery)
            .where('id', memberId);
    }
};
