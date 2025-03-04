const moment = require('moment');

class MrrStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     **/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     * Get the current total MRR, grouped by currency (ascending order)
     * @returns {Promise<MrrByCurrency[]>}
     */
    async getCurrentMrr() {
        const knex = this.knex;
        const rows = await knex('members_stripe_customers_subscriptions')
            .select(knex.raw(`plan_currency as currency`))
            .select(knex.raw(`SUM(mrr) AS mrr`))
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
        const knex = this.knex;
        const ninetyDaysAgo = moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const rows = await knex('members_paid_subscription_events')
            .select('currency')
            // In SQLite, DATE(created_at) would map to a string value, while DATE(created_at) would map to a JSDate object in MySQL
            // That is why we need the cast here (to have some consistency)
            .select(knex.raw('CAST(DATE(created_at) as CHAR) as date'))
            .select(knex.raw(`SUM(mrr_delta) as delta`))
            .where('created_at', '>=', ninetyDaysAgo)
            .groupByRaw('CAST(DATE(created_at) as CHAR), currency');
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

        rows.sort((rowA, rowB) => {
            const dateA = new Date(rowA.date);
            const dateB = new Date(rowB.date);
        
            return dateA - dateB || rowA.currency.localeCompare(rowB.currency);
        });

        // Get today in UTC (default timezone)
        const today = moment().format('YYYY-MM-DD');

        const results = [];

        // Create a map of the totals by currency for fast lookup and editing

        /** @type {Object.<string, number>}*/
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
            const date = moment(row.date).format('YYYY-MM-DD');

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
        const oldestDate = rows.length > 0 ? moment(rows[0].date).add(-1, 'days').format('YYYY-MM-DD') : today;

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
 * @property {MrrByCurrency[]} meta.totals
 */
