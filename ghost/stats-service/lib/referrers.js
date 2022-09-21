class ReferrersStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     **/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     * Return a list of all the attribution sources for a given post, with their signup and conversion counts
     * @param {string} postId 
     * @returns {Promise<AttributionCountStat[]>}
     */
    async getForPost(postId) {
        const knex = this.knex;
        const signupRows = await knex('members_created_events')
            .select('referrer_source')
            .select(knex.raw('COUNT(id) AS total'))
            .where('attribution_id', postId)
            .where('attribution_type', 'post')
            .groupBy('referrer_source');

        const conversionRows = await knex('members_subscription_created_events')
            .select('referrer_source')
            .select(knex.raw('COUNT(id) AS total'))
            .where('attribution_id', postId)
            .where('attribution_type', 'post')
            .groupBy('referrer_source');

        // Stitch them toghether, grouping them by source

        const map = new Map();
        for (const row of signupRows) {
            map.set(row.referrer_source, {
                source: row.referrer_source,
                signups: row.total,
                paid_conversions: 0
            });
        }

        for (const row of conversionRows) {
            const existing = map.get(row.referrer_source) ?? {
                source: row.referrer_source,
                signups: 0,
                paid_conversions: 0
            };
            existing.paid_conversions = row.total;
            map.set(row.referrer_source, existing);
        }

        return [...map.values()].sort((a, b) => b.paid_conversions - a.paid_conversions);
    }

    /**
     * Return a list of all the attribution sources (with signup and conversion counts) grouped per date
     * @returns {Promise<AttributionCountStatDate[]>}
     */
    async getHistory() {
        // TODO: implement
    }
}

module.exports = ReferrersStatsService;

/**
 * @typedef AttributionCountStat
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paid_conversions Total paid conversions for this source
 */

/**
 * @typedef AttributionCountStatDate
 * @type {AttributionCountStat}
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 */
