const _ = require('lodash');
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

        // three separate queries is much faster than using max/greatest (with coalesce to handle nulls) across columns
        const {maxDeliveredAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(delivered_at) as maxDeliveredAt')).first() || {};
        const {maxOpenedAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(opened_at) as maxOpenedAt')).first() || {};
        const {maxFailedAt} = await db.knex('email_recipients').select(db.knex.raw('MAX(failed_at) as maxFailedAt')).first() || {};

        const lastSeenEventTimestamp = _.max([maxDeliveredAt, maxOpenedAt, maxFailedAt]);
        debug(`getLastSeenEventTimestamp: finished in ${Date.now() - startDate}ms`);

        return lastSeenEventTimestamp;
    },

    async aggregateEmailStats(emailId) {
        await db.knex('emails').update({
            delivered_count: db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND delivered_at IS NOT NULL)`, [emailId]),
            opened_count: db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND opened_at IS NOT NULL)`, [emailId]),
            failed_count: db.knex.raw(`(SELECT COUNT(id) FROM email_recipients WHERE email_id = ? AND failed_at IS NOT NULL)`, [emailId])
        }).where('id', emailId);
    },

    async aggregateMemberStats(memberId) {
        const {trackedEmailCount} = await db.knex('email_recipients')
            .select(db.knex.raw('COUNT(email_recipients.id) as trackedEmailCount'))
            .leftJoin('emails', 'email_recipients.email_id', 'emails.id')
            .where('email_recipients.member_id', memberId)
            .where('emails.track_opens', true)
            .first() || {};

        const updateQuery = {
            email_count: db.knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE member_id = ?)', [memberId]),
            email_opened_count: db.knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE member_id = ? AND opened_at IS NOT NULL)', [memberId])
        };

        if (trackedEmailCount >= MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
            updateQuery.email_open_rate = db.knex.raw(`
                ROUND(((SELECT COUNT(id) FROM email_recipients WHERE member_id = ? AND opened_at IS NOT NULL) * 1.0 / ? * 100), 0)
            `, [memberId, trackedEmailCount]);
        }

        await db.knex('members')
            .update(updateQuery)
            .where('id', memberId);
    }
};
