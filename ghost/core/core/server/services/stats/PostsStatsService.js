const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {Object} TopPostsOptions
 * @property {string} [order='free_members desc'] - field to order by (free_members, paid_members, or mrr) and direction
 * @property {number} [limit=20] - maximum number of results to return
 * @property {string} [date_from] - optional start date filter (YYYY-MM-DD)
 * @property {string} [date_to] - optional end date filter (YYYY-MM-DD)
 * @property {string} [timezone='UTC'] - optional timezone for date interpretation
 */

/**
 * @typedef {Object} TopPostResult
 * @property {string} post_id - The ID of the post
 * @property {string} title - The title of the post
 * @property {number} free_members - Count of members who signed up on this post but paid elsewhere/never
 * @property {number} paid_members - Count of members whose paid conversion event was attributed to this post
 * @property {number} mrr - Total MRR from paid conversions attributed to this post
 */

class PostsStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex - Database client
     */
    constructor(deps) {
        this.knex = deps.knex;
    }

    /**
     * Get top posts by attribution metrics (free_members, paid_members, or mrr)
     *
     * @param {TopPostsOptions} options
     * @returns {Promise<{data: TopPostResult[]}>} The top posts based on the requested attribution metric
     */
    async getTopPosts(options = {}) {
        logging.info('TopPostsStatsService.getTopPosts called with options:', options);
        try {
            const order = options.order || 'free_members desc';
            const limitRaw = Number.parseInt(options.limit, 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20;
            const [orderField, orderDirection = 'desc'] = order.split(' ');

            if (!['free_members', 'paid_members', 'mrr'].includes(orderField)) {
                throw new errors.BadRequestError({
                    message: `Invalid order field: ${orderField}. Must be one of: free_members, paid_members, mrr`
                });
            }
            if (!['asc', 'desc'].includes(orderDirection.toLowerCase())) {
                throw new errors.BadRequestError({
                    message: `Invalid order direction: ${orderDirection}`
                });
            }

            // Build the main query using CTEs for clarity with the new logic
            const freeMembersCTE = this._buildFreeMembersSubquery(options);
            const paidMembersCTE = this._buildPaidMembersSubquery(options);
            const mrrCTE = this._buildMrrSubquery(options);

            let query = this.knex
                .with('free', freeMembersCTE)
                .with('paid', paidMembersCTE)
                .with('mrr', mrrCTE)
                .select(
                    'p.id as post_id',
                    'p.title',
                    this.knex.raw('COALESCE(free.free_members, 0) as free_members'),
                    this.knex.raw('COALESCE(paid.paid_members, 0) as paid_members'),
                    this.knex.raw('COALESCE(mrr.mrr, 0) as mrr')
                )
                .from('posts as p')
                .leftJoin('free', 'p.id', 'free.post_id')
                .leftJoin('paid', 'p.id', 'paid.post_id')
                .leftJoin('mrr', 'p.id', 'mrr.post_id');

            // Apply final ordering and limiting (Removed the WHERE clause filtering for activity)
            const results = await query
                .orderBy(orderField, orderDirection)
                .limit(limit);

            return {data: results};
        } catch (error) {
            logging.error('Error fetching top posts by attribution:', error);
            return {data: []};
        }
    }

    /**
     * Build a subquery/CTE for free_members count
     * (Signed up on Post, Paid Elsewhere/Never)
     * @private
     * @param {TopPostsOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildFreeMembersSubquery(options) {
        const knex = this.knex;
        // Find members who signed up via this post (mce.attribution_id)
        // but did NOT have a paid conversion via the SAME post (msce.attribution_id)
        let subquery = knex('members_created_events as mce')
            .select('mce.attribution_id as post_id')
            .countDistinct('mce.member_id as free_members')
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    .andOn('mce.attribution_id', '=', 'msce.attribution_id') // Important: check paid conversion attributed to SAME post
                    .andOnVal('msce.attribution_type', '=', 'post');
            })
            .where('mce.attribution_type', 'post')
            .whereNull('msce.id') // Keep only those where the left join found no matching paid conversion on the same post
            .groupBy('mce.attribution_id');

        // Apply date filter to the signup event
        this._applyDateFilter(subquery, options, 'mce.created_at');

        return subquery;
    }

    /**
     * Build a subquery/CTE for paid_members count
     * (Paid conversion attributed to this post)
     * @private
     * @param {TopPostsOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildPaidMembersSubquery(options) {
        const knex = this.knex;
        // Count distinct members for whom a paid conversion event (subscription creation)
        // was attributed to this post_id.
        let subquery = knex('members_subscription_created_events as msce')
            .select('msce.attribution_id as post_id')
            .countDistinct('msce.member_id as paid_members')
            .where('msce.attribution_type', 'post')
            .groupBy('msce.attribution_id');

        // Apply date filter to the paid conversion event timestamp
        this._applyDateFilter(subquery, options, 'msce.created_at');

        return subquery;
    }

    /**
     * Build a subquery/CTE for mrr sum
     * (Paid Conversions Attributed to Post)
     * @private
     * @param {TopPostsOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildMrrSubquery(options) {
        // Logic remains the same: Sum MRR for all paid conversions attributed to the post
        let subquery = this.knex('members_subscription_created_events as msce')
            .select('msce.attribution_id as post_id')
            .sum('mpse.mrr_delta as mrr')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                this.andOn('mpse.member_id', '=', 'msce.member_id');
            })
            .where('msce.attribution_type', 'post')
            .groupBy('msce.attribution_id');

        // Apply date filter to the paid conversion event timestamp
        this._applyDateFilter(subquery, options, 'msce.created_at');

        return subquery;
    }

    /**
     * Apply date filters to a query builder instance
     * @private
     * @param {import('knex').Knex.QueryBuilder} query
     * @param {TopPostsOptions} options
     * @param {string} [dateColumn='created_at'] - The date column to filter on
     */
    _applyDateFilter(query, options, dateColumn = 'created_at') {
        // Note: Timezone handling might require converting dates before querying,
        // depending on how created_at is stored (UTC assumed here).
        if (options.date_from) {
            query.where(dateColumn, '>=', options.date_from);
        }
        if (options.date_to) {
            query.where(dateColumn, '<=', options.date_to + ' 23:59:59');
        }
    }
}

module.exports = PostsStatsService;
