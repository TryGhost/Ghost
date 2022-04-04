const {DateTime} = require('luxon');

class MrrStatsService {
    constructor({db}) {
        this.db = db;
    }

    /**
     * Get the current total MRR, grouped by currency (ascending order)
     * @returns {Promise<MrrByCurrency[]>}
     */
    async getCurrentMrr() {
        const knex = this.db.knex;
        const rows = await knex('members_stripe_customers_subscriptions')
            .select(knex.raw(`plan_currency as currency`))
            .select(knex.raw(`SUM(
                CASE WHEN plan_interval = 'year' THEN
                    plan_amount / 12
                ELSE 
                    plan_amount
                END
            ) AS mrr`))
            .whereIn('status', ['active', 'unpaid', 'past_due'])
            .where('cancel_at_period_end', 0)
            .groupBy('plan_currency')
            .orderBy('currency');

        if (rows.length === 0) {
            // Add a USD placeholder to always have at least one currency
            rows.push({
                currency: 'usd',
                mrr: 0
            });
        }

        return rows;
    }

    /**
     * Get the MRR deltas for all days (from old to new), grouped by currency (ascending alphabetically)
     * @returns {Promise<MrrDelta[]>} The deltas sorted from new to old
     */
    async fetchAllDeltas() {
        const knex = this.db.knex;
        const rows = await knex('members_paid_subscription_events')
            .select('currency')
            .select(knex.raw('DATE(created_at) as date'))
            .select(knex.raw(`SUM(mrr_delta) as delta`))
            .groupByRaw('DATE(created_at), currency')
            .orderByRaw('DATE(created_at), currency');
        return rows;
    }

    /**
     * Returns a list of the MRR history for each day and currency, including the current MRR per currency as meta data. 
     * The respons is in ascending date order, and currencies for the same date are always in ascending order.
     * @returns {Promise<MrrHistory>}
     */
    async getHistory() {
        // Fetch current total amounts and start counting from there
        const totals = await this.getCurrentMrr();

        const rows = await this.fetchAllDeltas();

        // Get today in UTC (default timezone for Luxon)
        const today = DateTime.local().toISODate();

        const results = [];

        // Create a map of the totals by currency for fast lookup and editing
        const currentTotals = {};
        for (const total of totals) {
            currentTotals[total.currency] = total.mrr;
        }

        // Loop in reverse order (needed to have correct sorted result)
        for (let i = rows.length - 1; i >= 0; i -= 1) {
            const row = rows[i];

            if (currentTotals[row.currency] === undefined) {
                // Skip unexpected currencies that are not in the totals
                continue;
            }

            // Convert JSDates to YYYY-MM-DD (in UTC)
            const date = DateTime.fromJSDate(row.date).toISODate();
            
            if (date > today) {
                // Skip results that are in the future for some reason
                continue;
            }

            results.unshift({
                date,
                mrr: Math.max(0, currentTotals[row.currency]),
                currency: row.currency
            });

            currentTotals[row.currency] -= row.delta;
        }

        // Now also add the oldest days we have left over and do not have deltas
        const oldestDate = rows.length > 0 ? DateTime.fromJSDate(rows[0].date).plus({days: -1}).toISODate() : today;
        
        // Note that we also need to loop the totals in reverse order because we need to unshift
        for (let i = totals.length - 1; i >= 0; i -= 1) {
            const total = totals[i];
            results.unshift({
                date: oldestDate,
                mrr: Math.max(0, currentTotals[total.currency]),
                currency: total.currency
            });
        }
        
        return {
            data: results,
            meta: {
                totals
            }
        };
    }
}

module.exports = MrrStatsService;

/**
 * @typedef MrrByCurrency
 * @type {Object}
 * @property {number} mrr
 * @property {string} currency
 */

/**
 * @typedef MrrDelta
 * @type {Object}
 * @property {Date} date
 * @property {string} currency
 * @property {number} delta MRR change on this day
 */

/**
 * @typedef {Object} MrrRecord
 * @property {string} date In YYYY-MM-DD format
 * @property {string} currency
 * @property {number} mrr MRR on this day
 */

/**
 * @typedef {Object} MrrHistory
 * @property {MrrRecord[]} data List of the total members by status for each day, including the paid deltas paid_subscribed and paid_canceled
 * @property {Object} meta
 */
