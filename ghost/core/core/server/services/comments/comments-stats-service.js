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
     * @param {string} [options.dateFrom] - Inclusive lower bound (YYYY-MM-DD)
     * @param {string} [options.dateTo] - Inclusive upper bound (YYYY-MM-DD)
     * @returns {Promise<{totals: object, series: Array, topPosts: Array, topMembers: Array}>}
     */
    async getOverview({dateFrom, dateTo} = {}) {
        const knex = this.db.knex;
        const range = this._resolveRange(dateFrom, dateTo);

        const [totals, series, topPosts, topMembers] = await Promise.all([
            this._getTotals(knex, range),
            this._getSeries(knex, range),
            this._getTopPosts(knex, range),
            this._getTopMembers(knex, range)
        ]);

        return {totals, series, topPosts, topMembers};
    }

    _resolveRange(dateFrom, dateTo) {
        // Bounds are inclusive days. Convert to half-open [from 00:00, toEnd 00:00 next day).
        const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
        const toEnd = dateTo ? new Date(`${dateTo}T00:00:00.000Z`) : null;
        if (toEnd) {
            toEnd.setUTCDate(toEnd.getUTCDate() + 1);
        }
        return {from, toEnd};
    }

    _applyRange(query, column, {from, toEnd}) {
        if (from) {
            query.where(column, '>=', from);
        }
        if (toEnd) {
            query.where(column, '<', toEnd);
        }
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
