// TODO: should this be a config value?
const MIN_DAYS_SINCE_IMPORTED = 7;

module.exports = class MilestoneQueries {
    #db;

    #milestonesConfig;

    constructor(deps) {
        this.#db = deps.db;
        this.#milestonesConfig = deps.milestonesConfig;
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
        const [hasImportedMembers] = await this.#db.knex('members_subscribe_events')
            .count('id as count')
            .where('source', '=', 'import')
            .where('created_at', '>=', MIN_DAYS_SINCE_IMPORTED);

        return hasImportedMembers?.count > 0;
    }

    /**
     * @returns {Promise<string>}
     */
    async getDefaultCurrency() {
        const currentARR = await this.getARR();
        const arrMilestoneSettings = this.#milestonesConfig.arr;
        const supportedCurrencies = arrMilestoneSettings.map(setting => setting.currency);

        if (currentARR.length > 1) {
            const highestValues = currentARR.sort((a, b) => b.arr - a.arr);
            // If none of the currencies are supported, use the highest one
            const defaultCurrency = highestValues.find(value => supportedCurrencies.includes(value.currency)) && highestValues[0];
            return defaultCurrency.currency;
        } else {
            return currentARR[0].currency;
        }
    }
};
