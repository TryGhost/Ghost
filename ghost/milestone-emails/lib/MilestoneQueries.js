const MIN_DAYS_SINCE_IMPORTED = 7;

module.exports = class MilestoneQueries {
    #db;

    constructor(deps) {
        this.#db = deps.db;
    }

    /**
     * @returns {Promise<number>}
     */
    async getMembersCount() {
        const [membersCount] = await this.#db.knex('members_subscribe_events').count('id as count');

        return membersCount?.count || 0;
    }

    /**
     * @returns {Promise<Array>}
     */
    async getARR() {
        const currentARR = await this.#db.knex('members_paid_subscription_events as stripe')
            .select(this.#db.knex.raw('ROUND(SUM(stripe.mrr_delta) * 12) / 100 AS arr, stripe.currency as currency'))
            .groupBy('stripe.currency');

        return currentARR;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async hasImportedMembersInPeriod() {
        const [hasImportedMembers] = await this.#db.knex('members_subscribe_events')
            .count('id as count')
            .where('source', '=', 'import')
            .where('created_at', '>=', MIN_DAYS_SINCE_IMPORTED);

        return hasImportedMembers?.count > 0;
    }
};
