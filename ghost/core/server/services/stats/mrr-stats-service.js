const moment = require('moment');
const {
  buildHourlyTotals,
  dayStartUtc,
  dayEndUtc,
  hasDayEnded,
  utcBucketExpression,
  sumByLocalDay,
  todayIn,
  isKnownTimezone,
} = require('./utils/hourly-history');

class MrrStatsService {
  /**
   * @param {object} deps
   * @param {import('knex').Knex} deps.knex
   **/
  constructor({ knex }) {
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
        mrr: 0,
      });
    }

    return rows;
  }

  /**
   * Get the MRR deltas for all days (from old to new), grouped by currency (ascending alphabetically)
   * @param {string} [dateFrom] - Start date to fetch deltas from
   * @param {string} [timezone] - Days in this timezone rather than UTC
   * @returns {Promise<MrrDelta[]>} The deltas sorted from new to old
   */
  async fetchAllDeltas(dateFrom, timezone) {
    const knex = this.knex;
    if (isKnownTimezone(timezone)) {
      // Local days are added up from UTC hours, which every timezone's days are made of
      const start = dateFrom ?? moment.utc().subtract(90, 'days').format('YYYY-MM-DD');
      const hour = utcBucketExpression(knex, 'created_at', timezone);
      const rows = await knex('members_paid_subscription_events')
        .select('currency')
        .select(knex.raw(`${hour} as hour`))
        .select(knex.raw(`SUM(mrr_delta) as delta`))
        .where('created_at', '>=', dayStartUtc(start, timezone))
        .groupByRaw(`${hour}, currency`);
      return sumByLocalDay(rows, timezone, ['delta'], ['currency']);
    }

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
   * Returns the MRR per currency for each hour of a single day, so a day
   * charts with the same hours as its visitors
   * @param {Object} options
   * @param {string} options.date - The day, YYYY-MM-DD in `timezone`
   * @param {string} [options.timezone] - IANA timezone, defaults to UTC
   */
  async getHourlyHistory({ date, timezone }) {
    const knex = this.knex;
    const dayEnd = dayEndUtc(date, timezone);
    // Only the day's own changes are loaded; everything since the day ended is
    // added up by the database and taken off the current MRR
    const [totals, events, later] = await Promise.all([
      this.getCurrentMrr(),
      knex('members_paid_subscription_events')
        .select('created_at', 'currency', 'mrr_delta')
        .where('created_at', '>=', dayStartUtc(date, timezone))
        .where('created_at', '<', dayEnd),
      hasDayEnded(date, timezone)
        ? knex('members_paid_subscription_events')
            .select('currency')
            .select(knex.raw('SUM(mrr_delta) as delta'))
            .where('created_at', '>=', dayEnd)
            .groupBy('currency')
        : [],
    ]);

    /** @type {Object.<string, number>} */
    const current = {};
    for (const total of totals) {
      current[total.currency] = total.mrr;
    }
    for (const row of later) {
      if (current[row.currency] !== undefined) {
        current[row.currency] -= Number(row.delta) || 0;
      }
    }

    const apply = (mrr, event, direction) => {
      if (mrr[event.currency] === undefined) {
        // Skip unexpected currencies that are not in the totals
        return mrr;
      }
      return { ...mrr, [event.currency]: mrr[event.currency] + direction * event.mrr_delta };
    };

    const { hours, start } = buildHourlyTotals({ date, timezone, current, events, apply });

    return {
      data: hours.flatMap(({ date: hour, totals: mrr }) =>
        totals.map(({ currency }) => ({
          date: hour,
          mrr: Math.max(0, mrr[currency]),
          currency,
        })),
      ),
      meta: {
        totals,
        interval: 'hour',
        // MRR per currency where the day started: each hour holds the MRR at
        // its end, so the day's change is measured from here
        start: totals.map(({ currency }) => ({ currency, mrr: Math.max(0, start[currency]) })),
      },
    };
  }

  /**
   * Returns a list of the MRR history for each day and currency, including the current MRR per currency as meta data.
   * The respons is in ascending date order, and currencies for the same date are always in ascending order.
   * @param {Object} [options]
   * @param {string} [options.dateFrom] - Start date to fetch history from
   * @param {string} [options.timezone] - Days in this timezone rather than UTC
   * @returns {Promise<MrrHistory>}
   */
  async getHistory(options = {}) {
    // Fetch current total amounts and start counting from there
    const totals = await this.getCurrentMrr();

    const rows = await this.fetchAllDeltas(options.dateFrom, options.timezone);

    rows.sort((rowA, rowB) => {
      const dateA = new Date(rowA.date);
      const dateB = new Date(rowB.date);

      return dateA - dateB || rowA.currency.localeCompare(rowB.currency);
    });

    // Today in the viewer's timezone when asked for, UTC otherwise
    const today = todayIn(options.timezone);

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
        currency: row.currency,
      });

      currentTotals[row.currency] -= row.delta;
    }

    // Now also add the oldest days we have left over and do not have deltas
    const oldestDate =
      rows.length > 0 ? moment(rows[0].date).add(-1, 'days').format('YYYY-MM-DD') : today;

    // Note that we also need to loop the totals in reverse order because we need to unshift
    for (let i = totals.length - 1; i >= 0; i -= 1) {
      const total = totals[i];
      results.unshift({
        date: oldestDate,
        mrr: Math.max(0, currentTotals[total.currency]),
        currency: total.currency,
      });
    }

    return {
      data: results,
      meta: {
        totals,
      },
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
