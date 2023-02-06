const db = require('../../../data/db');

const MIN_DAYS_SINCE_IMPORTED = 7;

module.exports = {
    /**
     * @returns {Promise<number>}
     */
    async getMembersCount() {
        const [membersCount] = await db.knex('members_subscribe_events').count('id as count');

        return membersCount?.count || 0;
    },

    /**
     * @returns {Promise<Array>}
     */
    async getARR() {
        const currentARR = await db.knex('members_paid_subscription_events as stripe')
            .select(db.knex.raw('ROUND(SUM(stripe.mrr_delta) * 12) / 100 AS arr, stripe.currency as currency'))
            .groupBy('stripe.currency');

        return currentARR;
    },

    /**
     * @returns {Promise<boolean>}
     */
    async hasImportedMembersInPeriod() {
        const [hasImportedMembers] = await db.knex('members_subscribe_events')
            .count('id as count')
            .where('source', '=', 'import')
            .where('created_at', '>=', MIN_DAYS_SINCE_IMPORTED);

        return hasImportedMembers?.count > 0;
    }
};
