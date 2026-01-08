module.exports = class MilestoneQueries {
    #db;

    /** @type {number} */
    #minDaysSinceImported;

    constructor(deps) {
        this.#db = deps.db;
        this.#minDaysSinceImported = deps.minDaysSinceImported;
    }

    /**
     * @returns {Promise<number>}
     */
    async getMembersCount() {
        const [membersCount] = await this.#db.knex('members').count('id as count');

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
        const importedThreshold = new Date();
        importedThreshold.setDate(importedThreshold.getDate() - this.#minDaysSinceImported);

        const [hasImportedMembers] = await this.#db.knex('members_subscribe_events')
            .count('id as count')
            .where('source', '=', 'import')
            .where('created_at', '>=', importedThreshold);

        return hasImportedMembers?.count > 0;
    }

    /**
     * @returns {Promise<string>}
     */
    async getDefaultCurrency() {
        const currentARR = await this.getARR();

        // Set the default currency as the one with the highest value
        if (currentARR.length > 1) {
            const highestValues = currentARR.sort((a, b) => b.arr - a.arr);
            return highestValues?.[0]?.currency;
        } else if (currentARR?.[0]?.currency) {
            return currentARR[0].currency;
        } else {
            return 'usd';
        }
    }
};
