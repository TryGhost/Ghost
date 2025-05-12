const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {Object} StatsServiceOptions
 * @property {string} [order='free_members desc'] - field to order by (free_members, paid_members, or mrr) and direction
 * @property {number|string} [limit=20] - maximum number of results to return
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

/**
 * @typedef {Object} NewsletterStatResult
 * @property {string} post_id - The ID of the post
 * @property {string} post_title - The title of the post
 * @property {string} send_date - The date the newsletter was sent
 * @property {number} sent_to - Number of recipients
 * @property {number} total_opens - Number of opens
 * @property {number} open_rate - Open rate (decimal percentage)
 * @property {number} total_clicks - Number of clicks
 * @property {number} click_rate - Click rate (decimal percentage)
 */

/**
 * @typedef {Object} ReferrerStatsResult
 * @property {string} source - The referrer source (e.g., domain)
 * @property {number} free_members - Count of members who signed up via this post/referrer but did not have a paid conversion attributed to the same post/referrer
 * @property {number} paid_members - Count of members whose paid conversion event was attributed to this post/referrer
 * @property {number} mrr - Total MRR from paid conversions attributed to this post/referrer
 */

/**
 * @typedef {Object} NewsletterSubscriberStats
 * @property {number} total - Total current subscriber count 
 * @property {Array<{date: string, value: number}>} deltas - Daily subscription deltas
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
     * @param {StatsServiceOptions} options
     * @returns {Promise<{data: TopPostResult[]}>} The top posts based on the requested attribution metric
     */
    async getTopPosts(options = {}) {
        try {
            const order = options.order || 'free_members desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10); // Ensure options.limit is a string for parseInt
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
                .leftJoin('mrr', 'p.id', 'mrr.post_id')
                .where('p.status', 'published');

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
     * Get referrers for a specific post by attribution metrics
     * @param {string} postId
     * @param {StatsServiceOptions} options
     * @returns {Promise<{data: ReferrerStatsResult[]}>} The referrers for the post, ranked by the specified metric
     */
    async getReferrersForPost(postId, options = {}) {
        try {
            const order = options.order || 'free_members desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10);
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

            const freeReferrersCTE = this._buildFreeReferrersSubquery(postId, options);
            const paidReferrersCTE = this._buildPaidReferrersSubquery(postId, options);
            const mrrReferrersCTE = this._buildMrrReferrersSubquery(postId, options);

            // Base query to get all referrer sources and URLs for the post
            const baseReferrersQuery = this.knex('members_created_events as mce')
                .select('mce.referrer_source as source', 'mce.referrer_url')
                .where('mce.attribution_id', postId)
                .where('mce.attribution_type', 'post')
                .union((qb) => {
                    qb.select('msce.referrer_source as source', 'msce.referrer_url')
                        .from('members_subscription_created_events as msce')
                        .where('msce.attribution_id', postId)
                        .where('msce.attribution_type', 'post');
                });

            // Use knex.raw for GROUP BY to accommodate SQLite in tests
            let query = this.knex
                .with('free_referrers', freeReferrersCTE)
                .with('paid_referrers', paidReferrersCTE)
                .with('mrr_referrers', mrrReferrersCTE)
                .with('all_referrers', baseReferrersQuery)
                .select(
                    'ar.source',
                    'ar.referrer_url',
                    this.knex.raw('COALESCE(fr.free_members, 0) as free_members'),
                    this.knex.raw('COALESCE(pr.paid_members, 0) as paid_members'),
                    this.knex.raw('COALESCE(mr.mrr, 0) as mrr')
                )
                .from('all_referrers as ar')
                .leftJoin('free_referrers as fr', 'ar.source', 'fr.source')
                .leftJoin('paid_referrers as pr', 'ar.source', 'pr.source')
                .leftJoin('mrr_referrers as mr', 'ar.source', 'mr.source')
                .whereNotNull('ar.source')
                .groupBy('ar.source');

            const results = await query
                .orderBy(orderField, orderDirection)
                .limit(limit);

            return {data: results};
        } catch (error) {
            logging.error(`Error fetching referrers for post ${postId}:`, error);
            return {data: []};
        }
    }

    async getGrowthStatsForPost(postId) {
        try {
            const freeMembers = await this.knex('members_created_events as mce')
                .countDistinct('mce.member_id as free_members')
                .leftJoin('members_subscription_created_events as msce', function () {
                    this.on('mce.member_id', '=', 'msce.member_id')
                        .andOn('mce.attribution_id', '=', 'msce.attribution_id');
                })
                .where('mce.attribution_id', postId)
                .where('mce.attribution_type', 'post')
                .where('msce.id', null);

            const paidMembers = await this.knex('members_subscription_created_events as msce')
                .countDistinct('msce.member_id as paid_members')
                .where('msce.attribution_id', postId)
                .where('msce.attribution_type', 'post');

            const mrr = await this.knex('members_subscription_created_events as msce')
                .sum('mpse.mrr_delta as mrr')
                .join('members_paid_subscription_events as mpse', function () {
                    this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                    this.andOn('mpse.member_id', '=', 'msce.member_id');
                })
                .where('msce.attribution_id', postId)
                .where('msce.attribution_type', 'post');

            return {
                data: [
                    {
                        post_id: postId,
                        free_members: freeMembers[0].free_members || 0,
                        paid_members: paidMembers[0].paid_members || 0,
                        mrr: mrr[0].mrr || 0
                    }
                ]
            };
        } catch (error) {
            logging.error(`Error fetching growth stats for post ${postId}:`, error);
            return {data: []};
        }
    }

    /**
     * Build a subquery/CTE for free_members count (Post-level)
     * (Signed up on Post, Paid Elsewhere/Never)
     * @private
     * @param {StatsServiceOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildFreeMembersSubquery(options) {
        const knex = this.knex;
        let subquery = knex('members_created_events as mce')
            .select('mce.attribution_id as post_id')
            .countDistinct('mce.member_id as free_members')
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    .andOn('mce.attribution_id', '=', 'msce.attribution_id')
                    .andOnVal('msce.attribution_type', '=', 'post');
            })
            .where('mce.attribution_type', 'post')
            .whereNull('msce.id')
            .groupBy('mce.attribution_id');

        this._applyDateFilter(subquery, options, 'mce.created_at');
        return subquery;
    }

    /**
     * Build a subquery/CTE for paid_members count (Post-level)
     * (Paid conversion attributed to this post)
     * @private
     * @param {StatsServiceOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildPaidMembersSubquery(options) {
        const knex = this.knex;
        let subquery = knex('members_subscription_created_events as msce')
            .select('msce.attribution_id as post_id')
            .countDistinct('msce.member_id as paid_members')
            .where('msce.attribution_type', 'post')
            .groupBy('msce.attribution_id');

        this._applyDateFilter(subquery, options, 'msce.created_at');
        return subquery;
    }

    /**
     * Build a subquery/CTE for mrr sum (Post-level)
     * (Paid Conversions Attributed to Post)
     * @private
     * @param {StatsServiceOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildMrrSubquery(options) {
        let subquery = this.knex('members_subscription_created_events as msce')
            .select('msce.attribution_id as post_id')
            .sum('mpse.mrr_delta as mrr')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                this.andOn('mpse.member_id', '=', 'msce.member_id');
            })
            .where('msce.attribution_type', 'post')
            .groupBy('msce.attribution_id');

        this._applyDateFilter(subquery, options, 'msce.created_at');
        return subquery;
    }

    // --- Subqueries for getReferrersForPost ---

    /**
     * Build subquery for free members count per referrer for a specific post.
     * (Signed up via Post/Referrer, Did NOT convert via SAME Post/Referrer)
     * @private
     * @param {string} postId
     * @param {StatsServiceOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildFreeReferrersSubquery(postId, options) {
        const knex = this.knex;

        // Simpler approach mirroring _buildFreeMembersSubquery
        let subquery = knex('members_created_events as mce')
            .select('mce.referrer_source as source')
            .countDistinct('mce.member_id as free_members')
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    .andOn('mce.attribution_id', '=', 'msce.attribution_id') // Conversion must be for the SAME post
                    .andOn('mce.referrer_source', '=', 'msce.referrer_source') // And the SAME referrer
                    .andOnVal('msce.attribution_type', '=', 'post');
            })
            .where('mce.attribution_id', postId)
            .where('mce.attribution_type', 'post')
            .whereNull('msce.id') // Keep only signups where no matching paid conversion (same post/referrer) exists
            .groupBy('mce.referrer_source');

        this._applyDateFilter(subquery, options, 'mce.created_at'); // Filter based on signup time
        return subquery;
    }

    /**
    * Build subquery for paid members count per referrer for a specific post.
    * (Paid conversion attributed to this Post/Referrer)
    * @private
    * @param {string} postId
    * @param {StatsServiceOptions} options
    * @returns {import('knex').Knex.QueryBuilder}
    */
    _buildPaidReferrersSubquery(postId, options) {
        const knex = this.knex;
        let subquery = knex('members_subscription_created_events as msce')
            .select('msce.referrer_source as source')
            .countDistinct('msce.member_id as paid_members')
            .where('msce.attribution_id', postId)
            .where('msce.attribution_type', 'post')
            .groupBy('msce.referrer_source');

        // Apply date filter to the paid conversion event timestamp
        this._applyDateFilter(subquery, options, 'msce.created_at');
        return subquery;
    }

    /**
     * Build subquery for MRR sum per referrer for a specific post.
     * (MRR from paid conversions attributed to this Post/Referrer)
     * @private
     * @param {string} postId
     * @param {StatsServiceOptions} options
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildMrrReferrersSubquery(postId, options) {
        const knex = this.knex;
        let subquery = knex('members_subscription_created_events as msce')
            .select('msce.referrer_source as source')
            .sum('mpse.mrr_delta as mrr')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                // Ensure we join on member_id as well for accuracy if subscription_id isn't unique across members? (Safeguard)
                this.andOn('mpse.member_id', '=', 'msce.member_id');
            })
            .where('msce.attribution_id', postId)
            .where('msce.attribution_type', 'post')
            .groupBy('msce.referrer_source');

        // Apply date filter to the paid conversion event timestamp
        this._applyDateFilter(subquery, options, 'msce.created_at');
        return subquery;
    }

    /**
     * Apply date filters to a query builder instance
     * @private
     * @param {import('knex').Knex.QueryBuilder} query
     * @param {StatsServiceOptions} options
     * @param {string} dateColumn - The date column to filter on
     */
    _applyDateFilter(query, options, dateColumn) {
        // Note: Timezone handling might require converting dates before querying,
        // depending on how created_at is stored (UTC assumed here).
        if (options.date_from) {
            try {
                // Attempt to parse and validate the date
                const fromDate = new Date(options.date_from);
                if (!isNaN(fromDate.getTime())) {
                    query.where(dateColumn, '>=', options.date_from);
                } else {
                    logging.warn(`Invalid date_from format: ${options.date_from}. Skipping filter.`);
                }
            } catch (e) {
                logging.warn(`Error parsing date_from: ${options.date_from}. Skipping filter.`);
            }
        }
        if (options.date_to) {
            try {
                const toDate = new Date(options.date_to);
                if (!isNaN(toDate.getTime())) {
                    // Include the whole day for the 'to' date
                    query.where(dateColumn, '<=', options.date_to + ' 23:59:59');
                } else {
                    logging.warn(`Invalid date_to format: ${options.date_to}. Skipping filter.`);
                }
            } catch (e) {
                logging.warn(`Error parsing date_to: ${options.date_to}. Skipping filter.`);
            }
        }
    }

    /**
     * Get newsletter stats for sent or published posts with a newsletter_id
     *
     * @param {Object} options - Query options
     * @param {string} [options.order='date desc'] - Field to order by ('date', 'open_rate', or 'click_rate') and direction
     * @param {number|string} [options.limit=20] - Maximum number of results to return
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: NewsletterStatResult[]}>} The newsletter stats for sent/published posts with a newsletter_id
     */
    async getNewsletterStats(options = {}) {
        try {
            const order = options.order || 'date desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20;
            
            // Parse order field and direction
            let [orderField, orderDirection = 'desc'] = order.split(' ');
            
            // Map frontend order fields to database fields (simplified for ORDER BY)
            const orderFieldMap = {
                date: 'send_date',
                open_rate: 'open_rate',
                click_rate: 'click_rate'
            };
            
            // Validate order field
            if (!Object.keys(orderFieldMap).includes(orderField)) {
                throw new errors.BadRequestError({
                    message: `Invalid order field: ${orderField}. Must be one of: date, open_rate, click_rate`
                });
            }
            
            // Validate order direction
            if (!['asc', 'desc'].includes(orderDirection.toLowerCase())) {
                throw new errors.BadRequestError({
                    message: `Invalid order direction: ${orderDirection}`
                });
            }
            
            // Build date filters if provided
            let dateFilter = this.knex.raw('1=1');
            if (options.date_from) {
                dateFilter = this.knex.raw(`p.published_at >= ?`, [options.date_from]);
            }
            if (options.date_to) {
                dateFilter = options.date_from
                    ? this.knex.raw(`p.published_at >= ? AND p.published_at <= ?`, [options.date_from, options.date_to])
                    : this.knex.raw(`p.published_at <= ?`, [options.date_to]);
            }
            
            // Subquery to count clicks from members_click_events
            const clicksSubquery = this.knex
                .select('r.post_id')
                .countDistinct('mce.member_id as click_count')
                .from('redirects as r')
                .leftJoin('members_click_events as mce', 'r.id', 'mce.redirect_id')
                .whereNotNull('r.post_id')
                .groupBy('r.post_id')
                .as('clicks');
            
            // Build the query to get newsletter stats
            const query = this.knex
                .select(
                    'p.id as post_id',
                    'p.title as post_title',
                    'p.published_at as send_date',
                    this.knex.raw('COALESCE(e.email_count, 0) as sent_to'),
                    this.knex.raw('COALESCE(e.opened_count, 0) as total_opens'),
                    this.knex.raw('CASE WHEN COALESCE(e.email_count, 0) > 0 THEN COALESCE(e.opened_count, 0) / COALESCE(e.email_count, 0) ELSE 0 END as open_rate'),
                    this.knex.raw('COALESCE(clicks.click_count, 0) as total_clicks'),
                    this.knex.raw('CASE WHEN COALESCE(e.email_count, 0) > 0 THEN COALESCE(clicks.click_count, 0) / COALESCE(e.email_count, 0) ELSE 0 END as click_rate')
                )
                .from('posts as p')
                .leftJoin('emails as e', 'p.id', 'e.post_id')
                .leftJoin(clicksSubquery, 'p.id', 'clicks.post_id')
                .whereNotNull('p.newsletter_id')
                .whereIn('p.status', ['sent', 'published'])
                .whereNotNull('e.id') // Ensure there is an associated email record
                .whereRaw(dateFilter)
                .orderBy(orderFieldMap[orderField], orderDirection)
                .limit(limit);
            
            const results = await query;
            
            return {data: results};
        } catch (error) {
            logging.error('Error fetching newsletter stats:', error);
            return {data: []};
        }
    }

    /**
     * Get newsletter subscriber statistics including total count and daily deltas
     * 
     * @param {Object} options - Query options
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: Array<{total: number, deltas: Array<{date: string, value: number}>}>}>} The newsletter subscriber stats
     */
    async getNewsletterSubscriberStats(options = {}) {
        try {
            // Get total subscriber count from members_newsletters table
            const totalResult = await this.knex('members_newsletters')
                .countDistinct('member_id as total');

            const totalValue = totalResult[0] ? totalResult[0].total : 0;
            const total = parseInt(String(totalValue), 10);

            // Get daily deltas within date range
            let deltasQuery = this.knex('members_subscribe_events as mse')
                .select(
                    this.knex.raw(`DATE(mse.created_at) as date`),
                    this.knex.raw(`SUM(CASE WHEN mse.subscribed = 1 THEN 1 ELSE -1 END) as value`)
                )
                .groupByRaw('DATE(mse.created_at)')
                .orderBy('date', 'asc');

            // Apply date filters
            if (options.date_from) {
                deltasQuery.where('mse.created_at', '>=', options.date_from);
            }
            if (options.date_to) {
                deltasQuery.where('mse.created_at', '<=', `${options.date_to} 23:59:59`);
            }

            const rawDeltas = await deltasQuery;
            
            // Transform raw database results to properly typed objects
            const deltas = [];
            for (const row of rawDeltas) {
                if (row) {
                    // @ts-ignore
                    const dateValue = row.date || '';
                    // @ts-ignore
                    const deltaValue = row.value || 0;
                    deltas.push({
                        date: String(dateValue),
                        value: parseInt(String(deltaValue), 10)
                    });
                }
            }

            return {
                data: [{
                    total,
                    deltas
                }]
            };
        } catch (error) {
            logging.error('Error fetching newsletter subscriber stats:', error);
            return {
                data: [{
                    total: 0,
                    deltas: []
                }]
            };
        }
    }
}

module.exports = PostsStatsService;
