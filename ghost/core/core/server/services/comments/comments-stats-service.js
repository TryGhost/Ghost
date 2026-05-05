const moment = require('moment-timezone');
const {getDateBoundaries, applyDateFilter} = require('../stats/utils/date-utils');

module.exports = class CommentsStatsService {
    constructor(deps) {
        this.db = deps.db;
    }

    /**
     * @param {string[]} ids - List of post ids to fetch counts for
     * @returns {Promise<Object<string, number>>}
     */
    async getCountsByPost(ids) {
        const results = await this.db.knex('comments')
            .select(this.db.knex.raw(`COUNT(*) AS count, post_id`))
            .groupBy('post_id')
            .where('status', 'published')
            .whereIn('post_id', ids);

        const counts = ids.reduce((memo, id) => {
            const result = results.find(x => x.post_id === id);
            return {
                ...memo,
                [id]: result?.count || 0
            };
        }, {});

        return counts;
    }

    /**
     * @returns {Promise<Object<string, number>>}
     */
    async getAllCounts() {
        const results = await this.db.knex('comments')
            .select(this.db.knex.raw(`COUNT(*) AS count, post_id`))
            .where('status', 'published')
            .groupBy('post_id');

        /** @type Object<string, number> */
        let counts = {};

        for (const row of results) {
            counts[row.post_id] = row.count;
        }

        return counts;
    }

    /**
     * Aggregate comment analytics for the moderation dashboard.
     *
     * @param {object} options
     * @param {string} [options.dateFrom] - Inclusive lower bound (YYYY-MM-DD), interpreted in `timezone`
     * @param {string} [options.dateTo] - Inclusive upper bound (YYYY-MM-DD), interpreted in `timezone`
     * @param {string} [options.timezone='UTC'] - IANA timezone the bounds are expressed in
     * @returns {Promise<{totals: object, previousTotals: object|null, series: Array, topPosts: Array, topMembers: Array}>}
     */
    async getOverview({dateFrom, dateTo, timezone} = {}) {
        const knex = this.db.knex;
        const range = this._resolveRange(dateFrom, dateTo, timezone);
        const previousRange = this._resolvePreviousRange(dateFrom, dateTo, timezone);

        const [totals, previousTotals, series, topPosts, topMembers] = await Promise.all([
            this._getTotals(knex, range),
            previousRange ? this._getTotals(knex, previousRange) : Promise.resolve(null),
            this._getSeries(knex, range),
            this._getTopPosts(knex, range),
            this._getTopMembers(knex, range)
        ]);

        return {totals, previousTotals, series, topPosts, topMembers};
    }

    _resolveRange(dateFrom, dateTo, timezone) {
        return getDateBoundaries({date_from: dateFrom, date_to: dateTo, timezone});
    }

    _resolvePreviousRange(dateFrom, dateTo, timezone) {
        // Length-matched window immediately preceding the current range. Used
        // for period-over-period trend comparisons. Skipped when either bound
        // is missing (e.g. unbounded "all time" requests), since "previous"
        // is undefined without a known length.
        if (!dateFrom || !dateTo) {
            return null;
        }
        const tz = timezone || 'UTC';
        const startOfFrom = moment.tz(dateFrom, tz).startOf('day');
        const startOfTo = moment.tz(dateTo, tz).startOf('day');
        const lengthDays = startOfTo.diff(startOfFrom, 'days') + 1;
        if (lengthDays <= 0) {
            return null;
        }
        const prevDateTo = startOfFrom.clone().subtract(1, 'day').format('YYYY-MM-DD');
        const prevDateFrom = startOfFrom.clone().subtract(lengthDays, 'days').format('YYYY-MM-DD');
        return getDateBoundaries({date_from: prevDateFrom, date_to: prevDateTo, timezone: tz});
    }

    _applyRange(query, column, {dateFrom, dateTo}) {
        applyDateFilter(query, dateFrom, dateTo, column);
        return query;
    }

    async _getTotals(knex, range) {
        const commentsQuery = knex('comments')
            .where('status', 'published')
            .count({count: '*'})
            .countDistinct({commenters: 'member_id'});
        this._applyRange(commentsQuery, 'comments.created_at', range);

        const reportedQuery = knex('comment_reports')
            .countDistinct({reported: 'comment_id'});
        this._applyRange(reportedQuery, 'comment_reports.created_at', range);

        const [commentsRow] = await commentsQuery;
        const [reportedRow] = await reportedQuery;

        return {
            comments: Number(commentsRow.count) || 0,
            commenters: Number(commentsRow.commenters) || 0,
            reported: Number(reportedRow.reported) || 0
        };
    }

    async _getSeries(knex, range) {
        const commentsQuery = knex('comments')
            .where('status', 'published')
            .select(knex.raw('DATE(created_at) as date'))
            .count({count: '*'})
            .countDistinct({commenters: 'member_id'})
            .groupByRaw('DATE(created_at)')
            .orderByRaw('DATE(created_at) ASC');
        this._applyRange(commentsQuery, 'comments.created_at', range);

        const reportsQuery = knex('comment_reports')
            .select(knex.raw('DATE(created_at) as date'))
            .countDistinct({reported: 'comment_id'})
            .groupByRaw('DATE(created_at)')
            .orderByRaw('DATE(created_at) ASC');
        this._applyRange(reportsQuery, 'comment_reports.created_at', range);

        const [commentsRows, reportsRows] = await Promise.all([commentsQuery, reportsQuery]);

        const byDate = new Map();
        for (const row of commentsRows) {
            const date = typeof row.date === 'string' ? row.date : this._formatDate(row.date);
            byDate.set(date, {
                date,
                count: Number(row.count) || 0,
                commenters: Number(row.commenters) || 0,
                reported: 0
            });
        }
        for (const row of reportsRows) {
            const date = typeof row.date === 'string' ? row.date : this._formatDate(row.date);
            const existing = byDate.get(date) || {date, count: 0, commenters: 0, reported: 0};
            existing.reported = Number(row.reported) || 0;
            byDate.set(date, existing);
        }

        return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    }

    _formatDate(value) {
        if (!(value instanceof Date)) {
            return String(value);
        }
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        const day = String(value.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async _getTopPosts(knex, range, limit = 25) {
        const query = knex('comments')
            .join('posts', 'posts.id', 'comments.post_id')
            .where('comments.status', 'published')
            .select('posts.id as id', 'posts.title as title', 'posts.slug as slug')
            .count({count: 'comments.id'})
            .groupBy('posts.id', 'posts.title', 'posts.slug')
            .orderBy('count', 'desc')
            .orderBy('posts.id', 'asc')
            .limit(limit);
        this._applyRange(query, 'comments.created_at', range);

        const rows = await query;
        return rows.map(row => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            count: Number(row.count) || 0
        }));
    }

    async _getTopMembers(knex, range, limit = 25) {
        const query = knex('comments')
            .join('members', 'members.id', 'comments.member_id')
            .where('comments.status', 'published')
            .whereNotNull('comments.member_id')
            .select('members.id as id', 'members.name as name', 'members.email as email')
            .count({count: 'comments.id'})
            .groupBy('members.id', 'members.name', 'members.email')
            .orderBy('count', 'desc')
            .orderBy('members.id', 'asc')
            .limit(limit);
        this._applyRange(query, 'comments.created_at', range);

        const rows = await query;
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            count: Number(row.count) || 0
        }));
    }
};
