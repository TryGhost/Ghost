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
     * @param {string} [dateFrom] - Start date to fetch deltas from
     * @returns {Promise<MrrDelta[]>} The deltas sorted from new to old
     */
    async fetchAllDeltas(dateFrom) {
        const knex = this.knex;
        const startDate = dateFrom
            ? moment.utc(dateFrom).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
            : moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const rows = await knex('members_paid_subscription_events')
            .select('currency')
            // In SQLite, DATE(created_at) would map to a string value, while DATE(created_at) would map to a JSDate object in MySQL
            // That is why we need the cast here (to have some consistency)
            .select(knex.raw('CAST(DATE(created_at) as CHAR) as date'))
            .select(knex.raw(`SUM(mrr_delta) as delta`))
            .where('created_at', '>=', startDate)
            .groupByRaw('CAST(DATE(created_at) as CHAR), currency');
        return rows;
    }

    /**
     * Returns a list of the MRR history for each day and currency, including the current MRR per currency as meta data.
     * The response is in ascending date order, and currencies for the same date are always in ascending order.
     * All dates in the requested range are included with forward-filled MRR values.
     * @param {Object} [options]
     * @param {string} [options.dateFrom] - Start date to fetch history from (defaults to 90 days ago)
     * @returns {Promise<MrrHistory>}
     */
    async getHistory(options = {}) {
        // Fetch current total amounts and start counting from there
        const totals = await this.getCurrentMrr();

        const rows = await this.fetchAllDeltas(options.dateFrom);

        // Get today in UTC (default timezone)
        const today = moment().format('YYYY-MM-DD');

        // Calculate start date - use provided dateFrom or default to 90 days ago
        const startDate = options.dateFrom
            ? options.dateFrom
            : moment.utc().subtract(90, 'days').format('YYYY-MM-DD');

        const startDateMoment = moment.utc(startDate).startOf('day');
        const endDateMoment = moment.utc(today).startOf('day');

        // Create a map of the totals by currency for fast lookup
        /** @type {Object.<string, number>}*/
        const currentTotals = {};
        for (const total of totals) {
            currentTotals[total.currency] = total.mrr;
        }

        // Get sorted list of currencies
        const currencies = totals.map(t => t.currency).sort();

        // Create a map of deltas by date and currency for fast lookup
        /** @type {Object.<string, Object.<string, number>>}*/
        const deltasMap = {};
        for (const row of rows) {
            const date = moment(row.date).format('YYYY-MM-DD');
            if (date > today) {
                continue; // Skip future dates
            }
            if (currentTotals[row.currency] === undefined) {
                continue; // Skip unexpected currencies
            }
            if (!deltasMap[date]) {
                deltasMap[date] = {};
            }
            deltasMap[date][row.currency] = row.delta;
        }

        // Work backwards from current totals to build historical MRR for event dates
        const runningTotals = {...currentTotals};

        /** @type {Object.<string, Object.<string, number>>}*/
        const historicalMrrMap = {};

        // Get all dates with deltas, sorted descending (newest first)
        const datesWithDeltas = Object.keys(deltasMap).sort().reverse();

        for (const date of datesWithDeltas) {
            // Store the MRR for this date (before subtracting the delta)
            historicalMrrMap[date] = {};
            for (const currency of currencies) {
                historicalMrrMap[date][currency] = Math.max(0, runningTotals[currency]);
            }

            // Subtract the deltas for this date to get the MRR for the previous period
            const deltas = deltasMap[date];
            for (const currency of Object.keys(deltas)) {
                runningTotals[currency] -= deltas[currency];
            }
        }

        // runningTotals now contains the MRR before the first delta (the baseline)
        const baselineMrr = {...runningTotals};

        // Generate complete date range from startDate to today
        const results = [];
        const currentDate = moment(startDateMoment);

        // Track the last known MRR for each currency (for forward-filling)
        const lastKnownMrr = {...baselineMrr};

        while (currentDate.isSameOrBefore(endDateMoment)) {
            const dateStr = currentDate.format('YYYY-MM-DD');

            if (historicalMrrMap[dateStr]) {
                // Use actual event data and update our last known MRR
                for (const currency of currencies) {
                    lastKnownMrr[currency] = historicalMrrMap[dateStr][currency];
                }
            }

            // Add entry for each currency on this date
            for (const currency of currencies) {
                results.push({
                    date: dateStr,
                    mrr: Math.max(0, lastKnownMrr[currency] || 0),
                    currency
                });
            }

            currentDate.add(1, 'day');
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
