const moment = require('moment');
const {
  buildHourlyTotals,
  dayStartUtc,
  dayEndUtc,
  utcBucketExpression,
  sumByLocalDay,
  todayIn,
  isKnownTimezone,
} = require('./utils/hourly-history');

class MembersStatsService {
  /**
   * @param {object} deps
   * @param {import('knex').Knex} deps.knex*/
  constructor({ knex }) {
    this.knex = knex;
  }

  /**
   * Get the current total members grouped by status
   * @returns {Promise<TotalMembersByStatus>}
   */
  async getCount() {
    const knex = this.knex;
    const rows = await knex('members')
      .select('status')
      .select(knex.raw('COUNT(id) AS total'))
      .groupBy('status');

    const paidEvent = rows.find((c) => c.status === 'paid');
    const freeEvent = rows.find((c) => c.status === 'free');
    const compedEvent = rows.find((c) => c.status === 'comped');
    const giftEvent = rows.find((c) => c.status === 'gift');

    return {
      paid: paidEvent ? paidEvent.total : 0,
      free: freeEvent ? freeEvent.total : 0,
      comped: compedEvent ? compedEvent.total : 0,
      gift: giftEvent ? giftEvent.total : 0,
    };
  }

  /**
   * Get the member deltas by status for all days, sorted ascending
   * @param {Object} options
   * @param {string|Date} [options.startDate] - Start date for fetching deltas (ISO format or Date object, defaults to 91 days ago)
   * @param {string} [options.timezone] - Days in this timezone rather than UTC
   * @returns {Promise<MemberStatusDelta[]>} The deltas of paid, free, comped and gift users per day, sorted ascending
   */
  async fetchAllStatusDeltas(options = {}) {
    const knex = this.knex;
    const local = isKnownTimezone(options.timezone);
    const startDate = options.startDate
      ? moment.utc(options.startDate).startOf('day')
      : moment.utc().subtract(91, 'days').startOf('day');

    const formattedStartDate = local
      ? dayStartUtc(startDate.format('YYYY-MM-DD'), options.timezone)
      : startDate.format('YYYY-MM-DD HH:mm:ss');
    // Local days are added up from UTC hours, which every timezone's days are made of
    const bucket = local
      ? utcBucketExpression(knex, 'created_at', options.timezone)
      : 'DATE(created_at)';
    const rows = await knex('members_status_events')
      .select(knex.raw(`${bucket} as ${local ? 'hour' : 'date'}`))
      .select(
        knex.raw(`SUM(
                CASE WHEN to_status='paid' THEN 1
                ELSE 0 END
            ) as paid_subscribed`),
      )
      .select(
        knex.raw(`SUM(
                CASE WHEN from_status='paid' THEN 1
                ELSE 0 END
            ) as paid_canceled`),
      )
      .select(
        knex.raw(`SUM(
                CASE WHEN to_status='comped' THEN 1
                WHEN from_status='comped' THEN -1
                ELSE 0 END
            ) as comped_delta`),
      )
      .select(
        knex.raw(`SUM(
                CASE WHEN to_status='free' THEN 1
                WHEN from_status='free' THEN -1
                ELSE 0 END
            ) as free_delta`),
      )
      .select(
        knex.raw(`SUM(
                CASE WHEN to_status='gift' THEN 1
                WHEN from_status='gift' THEN -1
                ELSE 0 END
            ) as gift_delta`),
      )
      .where('created_at', '>=', formattedStartDate)
      .groupByRaw(bucket);
    if (local) {
      return /** @type {MemberStatusDelta[]} */ (
        /** @type {unknown} */ (
          sumByLocalDay(rows, options.timezone, [
            'paid_subscribed',
            'paid_canceled',
            'comped_delta',
            'free_delta',
            'gift_delta',
          ])
        )
      );
    }
    return /** @type {MemberStatusDelta[]} */ (/** @type {unknown} */ (rows));
  }

  /**
   * Returns the total members by status for each hour of a single day, so a
   * day charts with the same hours as its visitors
   * @param {Object} options
   * @param {string} options.date - The day, YYYY-MM-DD in `timezone`
   * @param {string} [options.timezone] - IANA timezone, defaults to UTC
   */
  async getHourlyCountHistory({ date, timezone }) {
    const knex = this.knex;
    const dayEnd = dayEndUtc(date, timezone);
    // Only the day's own changes are loaded; everything since the day ended is
    // added up by the database and taken off the current totals
    const [now, events, [later]] = await Promise.all([
      this.getCount(),
      knex('members_status_events')
        .select('created_at', 'from_status', 'to_status')
        .where('created_at', '>=', dayStartUtc(date, timezone))
        .where('created_at', '<', dayEnd),
      knex('members_status_events')
        .select(
          ...['paid', 'free', 'comped', 'gift'].map((status) =>
            knex.raw(
              `SUM(CASE WHEN to_status='${status}' THEN 1 WHEN from_status='${status}' THEN -1 ELSE 0 END) as ${status}`,
            ),
          ),
        )
        .where('created_at', '>=', dayEnd),
    ]);

    const apply = (totals, event, direction) => {
      const next = { ...totals };
      for (const status of ['paid', 'free', 'comped', 'gift']) {
        if (event.to_status === status) {
          next[status] += direction;
        }
        if (event.from_status === status) {
          next[status] -= direction;
        }
      }
      return next;
    };

    const current = {
      paid: now.paid - (Number(later?.paid) || 0),
      free: now.free - (Number(later?.free) || 0),
      comped: now.comped - (Number(later?.comped) || 0),
      gift: now.gift - (Number(later?.gift) || 0),
    };
    const { hours, start } = buildHourlyTotals({ date, timezone, current, events, apply });

    return {
      data: hours.map(({ date: hour, totals, events: inHour }) => ({
        date: hour,
        ...totals,
        paid_subscribed: inHour.filter((event) => event.to_status === 'paid').length,
        paid_canceled: inHour.filter((event) => event.from_status === 'paid').length,
      })),
      meta: {
        totals: now,
        interval: 'hour',
        // Where the day started: each hour holds the totals at its end, so
        // the day's change is measured from here, not from the first hour
        start,
      },
    };
  }

  /**
   * Returns a list of the total members by status for each day, including the paid deltas paid_subscribed and paid_canceled
   * @param {Object} options
   * @param {string|Date} [options.startDate] - Start date for fetching history (ISO format or Date object, defaults to 91 days ago). Note: result always includes one day before the startDate as a baseline.
   * @returns {Promise<CountHistory>}
   */
  async getCountHistory(options = {}) {
    const rows = await this.fetchAllStatusDeltas(options);

    // Fetch current total amounts and start counting from there
    const totals = await this.getCount();

    // Today in the viewer's timezone when asked for, UTC otherwise
    const today = todayIn(options.timezone);

    // When startDate is provided, always return complete range
    if (options.startDate) {
      return this._generateCompleteRange(rows, totals, options.startDate, today);
    }

    // Use original sparse logic only for default case (no startDate)
    return this._generateSparseRange(rows, totals, today);
  }

  /**
   * Generate complete date range with forward-filling for frontend
   * @param {Array} rows - Event data from database
   * @param {Object} totals - Current member totals
   * @param {string|Date} startDate - Start date for range
   * @param {string} today - Today's date in YYYY-MM-DD format
   * @returns {Object} Complete date range data
   */
  _generateCompleteRange(rows, totals, startDate, today) {
    const startDateMoment = moment.utc(startDate).startOf('day');
    const endDateMoment = moment.utc(today).startOf('day');

    // Sort rows chronologically to calculate historical totals
    rows.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());

    // Work backwards from current totals to build historical data for event dates
    let runningPaid = totals.paid;
    let runningFree = totals.free;
    let runningComped = totals.comped;
    let runningGift = totals.gift;

    const historicalTotalsMap = new Map();

    // Calculate totals for each event date by working backwards
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      const date = moment(row.date).format('YYYY-MM-DD');

      if (date > today) {
        continue; // Skip future dates
      }

      // Store the totals for this date
      historicalTotalsMap.set(date, {
        paid: Math.max(0, runningPaid),
        free: Math.max(0, runningFree),
        comped: Math.max(0, runningComped),
        gift: Math.max(0, runningGift),
        paid_subscribed: row.paid_subscribed,
        paid_canceled: row.paid_canceled,
      });

      // Update running totals for previous days
      runningPaid -= row.paid_subscribed - row.paid_canceled;
      runningFree -= row.free_delta;
      runningComped -= row.comped_delta;
      runningGift -= row.gift_delta;
    }

    // Generate complete date range from startDate to today
    const results = [];
    const currentDate = moment(startDateMoment);

    // Track the last known values for forward-filling
    let lastKnownTotals = {
      paid: Math.max(0, runningPaid), // Historical baseline before all events
      free: Math.max(0, runningFree),
      comped: Math.max(0, runningComped),
      gift: Math.max(0, runningGift),
    };

    // A range that starts long before the site had members (All time reaches
    // back to 2013) begins the day before its first change instead of
    // returning years of empty days
    const hadNoMembers = Object.values(lastKnownTotals).every((total) => total === 0);
    if (hadNoMembers && rows.length > 0) {
      const firstChange = moment.utc(rows[0].date).subtract(1, 'day');
      if (firstChange.isAfter(currentDate)) {
        currentDate.set({
          year: firstChange.year(),
          month: firstChange.month(),
          date: firstChange.date(),
        });
      }
    }

    while (currentDate.isSameOrBefore(endDateMoment)) {
      const dateStr = currentDate.format('YYYY-MM-DD');

      if (historicalTotalsMap.has(dateStr)) {
        // Use actual event data and update our last known totals
        const eventData = historicalTotalsMap.get(dateStr);
        lastKnownTotals = {
          paid: eventData.paid,
          free: eventData.free,
          comped: eventData.comped,
          gift: eventData.gift,
        };
        results.push({
          date: dateStr,
          paid: eventData.paid,
          free: eventData.free,
          comped: eventData.comped,
          gift: eventData.gift,
          paid_subscribed: eventData.paid_subscribed,
          paid_canceled: eventData.paid_canceled,
        });
      } else {
        // Forward-fill with last known totals (no events on this day)
        results.push({
          date: dateStr,
          paid: lastKnownTotals.paid,
          free: lastKnownTotals.free,
          comped: lastKnownTotals.comped,
          gift: lastKnownTotals.gift,
          paid_subscribed: 0,
          paid_canceled: 0,
        });
      }

      currentDate.add(1, 'day');
    }

    return {
      data: results,
      meta: {
        totals,
      },
    };
  }

  /**
   * Generate sparse date range (original behavior for backward compatibility)
   * @param {Array} rows - Event data from database
   * @param {Object} totals - Current member totals
   * @param {string} today - Today's date in YYYY-MM-DD format
   * @returns {Object} Sparse date range data
   */
  _generateSparseRange(rows, totals, today) {
    let { paid, free, comped, gift } = totals;
    const cumulativeResults = [];

    rows.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());

    // Loop in reverse order (needed to have correct sorted result)
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];

      // Convert JSDates to YYYY-MM-DD (in UTC)
      const date = moment(row.date).format('YYYY-MM-DD');
      if (date > today) {
        // Skip results that are in the future (fix for invalid events)
        continue;
      }
      cumulativeResults.unshift({
        date,
        paid: Math.max(0, paid),
        free: Math.max(0, free),
        comped: Math.max(0, comped),
        gift: Math.max(0, gift),

        // Deltas
        paid_subscribed: row.paid_subscribed,
        paid_canceled: row.paid_canceled,
      });

      // Update current counts
      paid -= row.paid_subscribed - row.paid_canceled;
      free -= row.free_delta;
      comped -= row.comped_delta;
      gift -= row.gift_delta;
    }

    // Now also add the oldest day we have left over (this one will be zero, which is also needed as a data point for graphs)
    const oldestDate =
      rows.length > 0 ? moment(rows[0].date).add(-1, 'days').format('YYYY-MM-DD') : today;

    cumulativeResults.unshift({
      date: oldestDate,
      paid: Math.max(0, paid),
      free: Math.max(0, free),
      comped: Math.max(0, comped),
      gift: Math.max(0, gift),

      // Deltas
      paid_subscribed: 0,
      paid_canceled: 0,
    });

    return {
      data: cumulativeResults,
      meta: {
        totals,
      },
    };
  }
}

module.exports = MembersStatsService;

/**
 * @typedef MemberStatusDelta
 * @type {Object}
 * @property {string|Date} date Date in SQL format or Date object
 * @property {number} paid_subscribed Paid members that subscribed on this day
 * @property {number} paid_canceled Paid members that canceled on this day
 * @property {number} comped_delta Total net comped members on this day
 * @property {number} free_delta Total net members on this day
 * @property {number} gift_delta Total net gift members on this day
 */

/**
 * @typedef TotalMembersByStatus
 * @type {Object}
 * @property {number} paid Total paid members
 * @property {number} free Total free members
 * @property {number} comped Total comped members
 * @property {number} gift Total gift members
 */

/**
 * @typedef {Object} TotalMembersByStatusItem
 * @property {string} date In YYYY-MM-DD format
 * @property {number} paid Total paid members
 * @property {number} free Total free members
 * @property {number} comped Total comped members
 * @property {number} gift Total gift members
 * @property {number} paid_subscribed Paid members that subscribed on this day
 * @property {number} paid_canceled Paid members that canceled on this day
 */

/**
 * @typedef {Object} CountHistory
 * @property {TotalMembersByStatusItem[]} data List of the total members by status for each day, including the paid deltas paid_subscribed and paid_canceled
 * @property {Object} meta
 * @property {TotalMembersByStatus} meta.totals
 */
