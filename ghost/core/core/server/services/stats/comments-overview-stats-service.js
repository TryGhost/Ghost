const {
  getDateBoundaries,
  getPreviousDateBoundaries,
  applyDateFilter,
  validateDateRangeOptions,
} = require('./utils/date-utils');
const {
  resolveSeriesAggregation,
  getFixedOffsetMinutes,
  getSeriesBucket,
  formatBucketDate,
  fillSeries,
} = require('./utils/series-utils');

const VISIBLE_STATUSES = ['published', 'hidden'];

class CommentsOverviewStatsService {
  /**
   * @param {object} deps
   * @param {import('knex').Knex} deps.knex
   */
  constructor({ knex }) {
    this.knex = knex;
  }

  /**
   * Aggregate comment analytics for the moderation dashboard.
   * @param {CommentsOverviewOptions} options
   * @returns {Promise<CommentsOverview>}
   */
  async getOverview(options) {
    const timezone = options.timezone || 'UTC';
    const dateOptions = {
      date_from: options.date_from,
      date_to: options.date_to,
      timezone,
    };
    validateDateRangeOptions(dateOptions);

    const knex = this.knex;
    const range = getDateBoundaries(dateOptions);
    const previousRange = getPreviousDateBoundaries(dateOptions);
    const seriesAggregation = resolveSeriesAggregation(range);

    const [totals, previousTotals, series, topPosts, topMembers] = await Promise.all([
      this._getTotals(knex, range),
      previousRange ? this._getTotals(knex, previousRange) : Promise.resolve(null),
      this._getSeries(knex, range, timezone, seriesAggregation),
      this._getTopPosts(knex, range),
      this._getTopMembers(knex, range),
    ]);

    return {
      totals,
      previous_totals: previousTotals,
      series,
      series_aggregation: seriesAggregation,
      top_posts: topPosts,
      top_members: topMembers,
    };
  }

  /**
   * @param {import('knex').Knex.QueryBuilder} query
   * @param {string} column
   * @param {{dateFrom: string|null, dateTo: string|null}} range
   */
  _applyRange(query, column, { dateFrom, dateTo }) {
    applyDateFilter(query, dateFrom, dateTo, column);
    return query;
  }

  /**
   * @param {import('knex').Knex} knex
   */
  _hasReport(knex) {
    return function () {
      this.select(knex.raw('1'))
        .from('comment_reports')
        .whereRaw('comment_reports.comment_id = comments.id');
    };
  }

  /**
   * @param {import('knex').Knex} knex
   * @param {{dateFrom: string|null, dateTo: string|null}} range
   * @returns {Promise<CommentsOverviewTotals>}
   */
  async _getTotals(knex, range) {
    const commentsQuery = knex('comments')
      .whereIn('status', VISIBLE_STATUSES)
      .count({ count: '*' })
      .countDistinct({ commenters: 'member_id' });
    this._applyRange(commentsQuery, 'comments.created_at', range);

    const reportedQuery = knex('comments')
      .whereIn('status', VISIBLE_STATUSES)
      .whereExists(this._hasReport(knex))
      .countDistinct({ reported: 'id' });
    this._applyRange(reportedQuery, 'comments.created_at', range);

    const [[commentsRow], [reportedRow]] = await Promise.all([commentsQuery, reportedQuery]);

    return {
      comments: Number(commentsRow.count) || 0,
      commenters: Number(commentsRow.commenters) || 0,
      reported: Number(reportedRow.reported) || 0,
    };
  }

  /**
   * @param {import('knex').Knex} knex
   * @param {{dateFrom: string|null, dateTo: string|null}} range
   * @param {string} timezone
   * @param {'day'|'week'|'month'} aggregation
   * @returns {Promise<CommentsOverviewSeriesItem[]>}
   */
  async _getSeries(knex, range, timezone, aggregation) {
    const offsetMinutes = getFixedOffsetMinutes(timezone);
    const bucket = getSeriesBucket(knex, 'comments.created_at', offsetMinutes, aggregation);

    const commentsQuery = knex('comments')
      .whereIn('status', VISIBLE_STATUSES)
      .select(bucket.select)
      .count({ count: '*' })
      .countDistinct({ commenters: 'member_id' })
      .groupByRaw(bucket.group)
      .orderByRaw('date ASC');
    this._applyRange(commentsQuery, 'comments.created_at', range);

    const reportedQuery = knex('comments')
      .whereIn('status', VISIBLE_STATUSES)
      .whereExists(this._hasReport(knex))
      .select(bucket.select)
      .countDistinct({ reported: 'id' })
      .groupByRaw(bucket.group)
      .orderByRaw('date ASC');
    this._applyRange(reportedQuery, 'comments.created_at', range);

    const [commentsRows, reportedRows] = await Promise.all([commentsQuery, reportedQuery]);

    const byDate = new Map();
    for (const row of commentsRows) {
      const date = formatBucketDate(row.date);
      byDate.set(date, {
        date,
        count: Number(row.count) || 0,
        commenters: Number(row.commenters) || 0,
        reported: 0,
      });
    }
    for (const row of reportedRows) {
      const date = formatBucketDate(row.date);
      const existing = byDate.get(date) || { date, count: 0, commenters: 0, reported: 0 };
      existing.reported = Number(row.reported) || 0;
      byDate.set(date, existing);
    }

    return fillSeries([...byDate.values()], range, offsetMinutes, aggregation, (date) => ({
      date,
      count: 0,
      commenters: 0,
      reported: 0,
    }));
  }

  /**
   * @param {import('knex').Knex} knex
   * @param {{dateFrom: string|null, dateTo: string|null}} range
   * @param {number} [limit]
   * @returns {Promise<CommentsOverviewTopPost[]>}
   */
  async _getTopPosts(knex, range, limit = 25) {
    const query = knex('comments')
      .join('posts', 'posts.id', 'comments.post_id')
      .whereIn('comments.status', VISIBLE_STATUSES)
      .select('posts.id as id', 'posts.title as title', 'posts.slug as slug')
      .count({ count: 'comments.id' })
      .groupBy('posts.id', 'posts.title', 'posts.slug')
      .orderBy('count', 'desc')
      .orderBy('posts.id', 'asc')
      .limit(limit);
    this._applyRange(query, 'comments.created_at', range);

    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      count: Number(row.count) || 0,
    }));
  }

  /**
   * Member email is deliberately not selected here. The response is surfaced
   * as aggregate analytics, and the id is enough for the UI to drill through
   * to the member record, which enforces its own permissions.
   * @param {import('knex').Knex} knex
   * @param {{dateFrom: string|null, dateTo: string|null}} range
   * @param {number} [limit]
   * @returns {Promise<CommentsOverviewTopMember[]>}
   */
  async _getTopMembers(knex, range, limit = 25) {
    const query = knex('comments')
      .join('members', 'members.id', 'comments.member_id')
      .whereIn('comments.status', VISIBLE_STATUSES)
      .whereNotNull('comments.member_id')
      .select('members.id as id', 'members.name as name')
      .count({ count: 'comments.id' })
      .groupBy('members.id', 'members.name')
      .orderBy('count', 'desc')
      .orderBy('members.id', 'asc')
      .limit(limit);
    this._applyRange(query, 'comments.created_at', range);

    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      count: Number(row.count) || 0,
    }));
  }
}

module.exports = CommentsOverviewStatsService;

/**
 * @typedef {Object} CommentsOverviewTotals
 * @property {number} comments
 * @property {number} commenters
 * @property {number} reported
 */

/**
 * @typedef {Object} CommentsOverviewSeriesItem
 * @property {string} date
 * @property {number} count
 * @property {number} commenters
 * @property {number} reported
 */

/**
 * @typedef {Object} CommentsOverviewTopPost
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {number} count
 */

/**
 * @typedef {Object} CommentsOverviewTopMember
 * @property {string} id
 * @property {string|null} name
 * @property {number} count
 */

/**
 * @typedef {Object} CommentsOverview
 * @property {CommentsOverviewTotals} totals
 * @property {CommentsOverviewTotals|null} previous_totals
 * @property {CommentsOverviewSeriesItem[]} series
 * @property {'day'|'week'|'month'} series_aggregation
 * @property {CommentsOverviewTopPost[]} top_posts
 * @property {CommentsOverviewTopMember[]} top_members
 */

/**
 * @typedef {Object} CommentsOverviewOptions
 * @property {string} date_from
 * @property {string} date_to
 * @property {string} [timezone]
 */
