const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');

/**
 * @typedef {Object} StatsServiceOptions
 * @property {string} [order='free_members desc'] - field to order by (free_members, paid_members, or mrr) and direction
 * @property {number|string} [limit=20] - maximum number of results to return
 * @property {string} [date_from] - optional start date filter (YYYY-MM-DD)
 * @property {string} [date_to] - optional end date filter (YYYY-MM-DD)
 * @property {string} [timezone='UTC'] - optional timezone for date interpretation
 * @property {string} [post_type] - optional filter by post type ('post' or 'page')
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
     * @param {object} [deps.tinybirdClient] - Tinybird client for analytics
     */
    constructor(deps) {
        this.knex = deps.knex;
        this.tinybirdClient = deps.tinybirdClient;
    }

    /**
     * Get top posts by attribution metrics (free_members, paid_members, or mrr)
     *
     * @param {StatsServiceOptions} options
     * @returns {Promise<{data: TopPostResult[]}>} The top posts based on the requested attribution metric
     */
    async getTopPosts(options) {
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

            // Add post_type filter if specified
            if (options.post_type && ['post', 'page'].includes(options.post_type)) {
                query = query.where('p.type', options.post_type);
            }

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

            // First, let's get all sources from both tables using separate queries
            // Then combine and group them in a cross-database compatible way
            const membersCreatedSources = this.knex('members_created_events as mce')
                .select('mce.referrer_source as source')
                .select('mce.referrer_url')
                .where('mce.attribution_id', postId)
                .where('mce.attribution_type', 'post')
                .whereNotNull('mce.referrer_source');

            const membersSubscriptionSources = this.knex('members_subscription_created_events as msce')
                .select('msce.referrer_source as source')
                .select('msce.referrer_url')
                .where('msce.attribution_id', postId)
                .where('msce.attribution_type', 'post')
                .whereNotNull('msce.referrer_source');

            // Using a simpler combined query that works in SQLite
            const allSources = this.knex.select('source', 'referrer_url')
                .from(membersCreatedSources.as('sources1'))
                .union(function () {
                    this.select('source', 'referrer_url')
                        .from(membersSubscriptionSources.as('sources2'));
                });

            // Create the final CTE that we'll use to get all referrers
            const allReferrersCTE = this.knex.select('source')
                .select(this.knex.raw('MIN(referrer_url) as referrer_url'))
                .from(allSources.as('all_sources'))
                .groupBy('source');

            // Now join all the data
            let query = this.knex
                .with('free_referrers', freeReferrersCTE)
                .with('paid_referrers', paidReferrersCTE)
                .with('mrr_referrers', mrrReferrersCTE)
                .with('all_referrers', allReferrersCTE)
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
                .whereNotNull('ar.source');

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
                    .andOn('mce.attribution_id', '=', 'msce.attribution_id');
                // Add attribution_type condition based on post_type filter
                if (options.post_type === 'page') {
                    this.andOnVal('msce.attribution_type', '=', 'page');
                } else if (options.post_type === 'post') {
                    this.andOnVal('msce.attribution_type', '=', 'post');
                } else {
                    // If no post_type specified, include both
                    this.andOn(function () {
                        this.on('msce.attribution_type', '=', knex.raw('?', ['post']))
                            .orOn('msce.attribution_type', '=', knex.raw('?', ['page']));
                    });
                }
            })
            .whereNull('msce.id')
            .groupBy('mce.attribution_id');

        // Filter attribution_type based on post_type
        if (options.post_type === 'page') {
            subquery = subquery.where('mce.attribution_type', 'page');
        } else if (options.post_type === 'post') {
            subquery = subquery.where('mce.attribution_type', 'post');
        } else {
            // If no post_type specified, include both
            subquery = subquery.whereIn('mce.attribution_type', ['post', 'page']);
        }

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
            .groupBy('msce.attribution_id');

        // Filter attribution_type based on post_type
        if (options.post_type === 'page') {
            subquery = subquery.where('msce.attribution_type', 'page');
        } else if (options.post_type === 'post') {
            subquery = subquery.where('msce.attribution_type', 'post');
        } else {
            // If no post_type specified, include both
            subquery = subquery.whereIn('msce.attribution_type', ['post', 'page']);
        }

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
            .groupBy('msce.attribution_id');

        // Filter attribution_type based on post_type
        if (options.post_type === 'page') {
            subquery = subquery.where('msce.attribution_type', 'page');
        } else if (options.post_type === 'post') {
            subquery = subquery.where('msce.attribution_type', 'post');
        } else {
            // If no post_type specified, include both
            subquery = subquery.whereIn('msce.attribution_type', ['post', 'page']);
        }

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
     * Get newsletter stats for sent or published posts with a specific newsletter_id
     *
     * @param {string} newsletterId - ID of the newsletter to get stats for
     * @param {Object} options - Query options
     * @param {string} [options.order='date desc'] - Field to order by ('date', 'open_rate', or 'click_rate') and direction
     * @param {number|string} [options.limit=20] - Maximum number of results to return
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: NewsletterStatResult[]}>} The newsletter stats for sent/published posts with the specified newsletter_id
     */
    async getNewsletterStats(newsletterId, options = {}) {
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
                click_rate: 'click_rate',
                sent_to: 'sent_to'
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
                .where('p.newsletter_id', newsletterId)
                .whereIn('p.status', ['sent', 'published'])
                .whereNotNull('e.id') // Ensure there is an associated email record
                .whereRaw(dateFilter)
                .orderBy(orderFieldMap[orderField], orderDirection)
                .limit(limit);

            const results = await query;

            return {data: results};
        } catch (error) {
            logging.error(`Error fetching newsletter stats for newsletter ${newsletterId}:`, error);
            return {data: []};
        }
    }

    /**
     * Get newsletter basic statistics (without click data) for faster loading
     *
     * @param {string} newsletterId - ID of the newsletter to get stats for
     * @param {Object} options - Query options
     * @param {string} [options.order] - Sort order (e.g., 'date desc', 'open_rate desc')
     * @param {number} [options.limit] - Number of results to return (default: 20)
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: Array}>} The newsletter basic stats (without click data)
     */
    async getNewsletterBasicStats(newsletterId, options = {}) {
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
                sent_to: 'sent_to'
            };

            // Validate order field (excluding click_rate since we don't fetch click data)
            if (!Object.keys(orderFieldMap).includes(orderField)) {
                throw new errors.BadRequestError({
                    message: `Invalid order field: ${orderField}. Must be one of: date, open_rate, sent_to`
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

            // Build the query to get newsletter basic stats (without click data)
            const query = this.knex
                .select(
                    'p.id as post_id',
                    'p.title as post_title',
                    'p.published_at as send_date',
                    this.knex.raw('COALESCE(e.email_count, 0) as sent_to'),
                    this.knex.raw('COALESCE(e.opened_count, 0) as total_opens'),
                    this.knex.raw('CASE WHEN COALESCE(e.email_count, 0) > 0 THEN COALESCE(e.opened_count, 0) / COALESCE(e.email_count, 0) ELSE 0 END as open_rate')
                )
                .from('posts as p')
                .leftJoin('emails as e', 'p.id', 'e.post_id')
                .where('p.newsletter_id', newsletterId)
                .whereIn('p.status', ['sent', 'published'])
                .whereNotNull('e.id') // Ensure there is an associated email record
                .whereRaw(dateFilter)
                .orderBy(orderFieldMap[orderField], orderDirection)
                .limit(limit);

            const results = await query;

            return {data: results};
        } catch (error) {
            logging.error(`Error fetching newsletter basic stats for newsletter ${newsletterId}:`, error);
            return {data: []};
        }
    }

    /**
     * Get newsletter click statistics for specific posts
     *
     * @param {string} newsletterId - ID of the newsletter to get click stats for
     * @param {Array<string>|string} postIds - Array of post IDs or comma-separated string of post IDs to get click data for
     * @returns {Promise<{data: Array}>} The newsletter click stats
     */
    async getNewsletterClickStats(newsletterId, postIds = []) {
        try {
            // Handle postIds as either array or comma-separated string
            let postIdsArray = [];
            if (Array.isArray(postIds)) {
                postIdsArray = postIds;
            } else if (typeof postIds === 'string' && postIds.length > 0) {
                postIdsArray = postIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
            }

            if (postIdsArray.length === 0) {
                return {data: []};
            }

            // Subquery to count clicks from members_click_events
            const clicksQuery = this.knex
                .select(
                    'r.post_id',
                    this.knex.raw('COALESCE(COUNT(DISTINCT mce.member_id), 0) as total_clicks'),
                    this.knex.raw('MAX(COALESCE(e.email_count, 0)) as email_count')
                )
                .from('redirects as r')
                .leftJoin('members_click_events as mce', 'r.id', 'mce.redirect_id')
                .leftJoin('posts as p', 'r.post_id', 'p.id')
                .leftJoin('emails as e', 'p.id', 'e.post_id')
                .whereIn('r.post_id', postIdsArray)
                .where('p.newsletter_id', newsletterId)
                .whereNotNull('r.post_id')
                .groupBy('r.post_id')
                .select(
                    this.knex.raw('CASE WHEN MAX(COALESCE(e.email_count, 0)) > 0 THEN COALESCE(COUNT(DISTINCT mce.member_id), 0) / MAX(COALESCE(e.email_count, 0)) ELSE 0 END as click_rate')
                );

            const results = await clicksQuery;

            return {data: results};
        } catch (error) {
            logging.error(`Error fetching newsletter click stats for newsletter ${newsletterId}:`, error);
            return {data: []};
        }
    }

    /**
     * Get newsletter subscriber statistics including total count and daily deltas for a specific newsletter
     *
     * @param {string} newsletterId - ID of the newsletter to get subscriber stats for
     * @param {Object} options - Query options
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: Array<{total: number, deltas: Array<{date: string, value: number}>}>}>} The newsletter subscriber stats
     */
    async getNewsletterSubscriberStats(newsletterId, options = {}) {
        try {
            // Run both queries in parallel for better performance
            const [totalResult, rawDeltas] = await Promise.all([
                // Get total subscriber count (fast query)
                this.knex('members_newsletters as mn')
                    .countDistinct('mn.member_id as total')
                    .join('members as m', 'm.id', 'mn.member_id')
                    .where('mn.newsletter_id', newsletterId)
                    .where('m.email_disabled', 0),
                
                // Get daily deltas (optimized query)
                this._getNewsletterSubscriberDeltas(newsletterId, options)
            ]);

            const totalValue = totalResult[0] ? totalResult[0].total : 0;
            const total = parseInt(String(totalValue), 10);

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
            logging.error(`Error fetching subscriber stats for newsletter ${newsletterId}:`, error);
            return {
                data: [{
                    total: 0,
                    deltas: []
                }]
            };
        }
    }

    /**
     * Optimized query to get newsletter subscriber deltas
     * @private
     */
    async _getNewsletterSubscriberDeltas(newsletterId, options = {}) {
        // Build optimized deltas query with efficient JOIN
        let deltasQuery = this.knex('members_subscribe_events as mse')
            .select(
                this.knex.raw(`DATE(mse.created_at) as date`),
                this.knex.raw(`SUM(CASE WHEN mse.subscribed = 1 THEN 1 ELSE -1 END) as value`)
            )
            .innerJoin('members as m', 'm.id', 'mse.member_id')
            .where('mse.newsletter_id', newsletterId)
            .whereNot('m.email_disabled', 1) // Filter out email-disabled members
            .whereNotNull('mse.created_at')
            .groupByRaw('DATE(mse.created_at)')
            .orderBy('date', 'asc');

        // Apply date filters early to reduce dataset
        if (options.date_from) {
            deltasQuery.where('mse.created_at', '>=', options.date_from);
        }
        if (options.date_to) {
            deltasQuery.where('mse.created_at', '<=', `${options.date_to} 23:59:59`);
        }

        return await deltasQuery;
    }

    /**
     * Get stats for the latest published post including open rate, member attribution counts, and visitor count
     * @returns {Promise<{data: Array<{id: string, title: string, slug: string, feature_image: string|null, published_at: string, recipient_count: number|null, opened_count: number|null, open_rate: number|null, member_delta: number, free_members: number, paid_members: number, visitors: number}>}>}
     */
    async getLatestPostStats() {
        try {
            // Get the latest published post
            const latestPost = await this.knex('posts as p')
                .select(
                    'p.id',
                    'p.uuid',
                    'p.title',
                    'p.slug',
                    'p.feature_image',
                    'p.published_at',
                    'e.email_count',
                    'e.opened_count'
                )
                .leftJoin('emails as e', 'p.id', 'e.post_id')
                .where('p.status', 'published')
                .whereNotNull('p.published_at')
                .orderBy('p.published_at', 'desc')
                .first();

            if (!latestPost) {
                return {data: []};
            }

            // Get member attribution counts using the same logic as other methods
            const memberAttributionCounts = await this._getMemberAttributionCounts([latestPost.id]);
            const attributionCount = memberAttributionCounts.find(ac => ac.post_id === latestPost.id);
            
            const freeMembers = attributionCount ? attributionCount.free_members : 0;
            const paidMembers = attributionCount ? attributionCount.paid_members : 0;
            const totalMembers = freeMembers + paidMembers;

            // Calculate open rate
            const openRate = latestPost.email_count ? 
                (latestPost.opened_count / latestPost.email_count) * 100 : 
                null;

            // Get visitor count from Tinybird
            let visitors = 0;
            if (this.tinybirdClient) {
                try {
                    const dateFrom = new Date(latestPost.published_at).toISOString().split('T')[0];
                    const visitorData = await this.tinybirdClient.fetch('api_top_pages', {
                        post_uuid: latestPost.uuid,
                        dateFrom: dateFrom
                    });

                    visitors = visitorData?.[0]?.visits || 0;
                } catch (error) {
                    logging.error('Error fetching visitor data from Tinybird:', error);
                }
            }

            return {
                data: [{
                    id: latestPost.id,
                    title: latestPost.title,
                    slug: latestPost.slug,
                    feature_image: latestPost.feature_image ? urlUtils.transformReadyToAbsolute(latestPost.feature_image) : latestPost.feature_image,
                    published_at: latestPost.published_at,
                    recipient_count: latestPost.email_count,
                    opened_count: latestPost.opened_count,
                    open_rate: openRate,
                    member_delta: totalMembers,
                    free_members: freeMembers,
                    paid_members: paidMembers,
                    visitors: visitors
                }]
            };
        } catch (error) {
            // Log the error but return a valid response
            logging.error('Error fetching latest post stats:', error);
            return {data: []};
        }
    }

    /**
     * Get top posts by views for a given date range
     * @param {Object} options
     * @param {string} options.date_from - Start date in YYYY-MM-DD format
     * @param {string} options.date_to - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation (default: 'UTC')
     * @param {number} [options.limit] - Maximum number of posts to return (default: 5)
     * @returns {Promise<Object>} Top posts with view counts and additional Ghost data
     */
    async getTopPostsViews(options) {
        try {
            const limit = options.limit || 5;
            const timezone = options.timezone || 'UTC';
            let viewsData = [];

            if (this.tinybirdClient) {
                const tinybirdOptions = {
                    dateFrom: options.date_from,
                    dateTo: options.date_to,
                    timezone: timezone,
                    post_type: 'post',
                    limit: limit
                };

                viewsData = await this.tinybirdClient.fetch('api_top_pages', tinybirdOptions) || [];
            }

            // Filter out any rows without post_uuid and get unique UUIDs
            const postUuids = [...new Set(viewsData.filter(row => row.post_uuid).map(row => row.post_uuid))];
            
            // Get posts data from Ghost DB for the posts we have views for
            const posts = await this.knex('posts as p')
                .select(
                    'p.id as post_id',
                    'p.uuid as post_uuid',
                    'p.title',
                    'p.published_at',
                    'p.feature_image',
                    'emails.email_count',
                    'emails.opened_count'
                )
                .leftJoin('emails', 'emails.post_id', 'p.id')
                .whereIn('p.uuid', postUuids);

            // Get member attribution counts for these posts (model after GrowthStats logic)
            const memberAttributionCounts = await this._getMemberAttributionCounts(posts.map(p => p.post_id), options);

            // Process posts with views
            const postsWithViews = viewsData.map((row) => {
                const post = posts.find(p => p.post_uuid === row.post_uuid);

                if (!post) {
                    return null;
                }

                // Find the member attribution count for this post
                const attributionCount = memberAttributionCounts.find(ac => ac.post_id === post.post_id);
                const memberCount = attributionCount ? (attributionCount.free_members + attributionCount.paid_members) : 0;

                return {
                    post_id: post.post_id,
                    title: post.title,
                    published_at: post.published_at,
                    feature_image: post.feature_image ? urlUtils.transformReadyToAbsolute(post.feature_image) : post.feature_image,
                    views: row.visits,
                    open_rate: post.email_count > 0 ? (post.opened_count / post.email_count) * 100 : null,
                    members: memberCount
                };
            }).filter(Boolean);

            // Calculate how many more posts we need - we want to always return 5 posts
            const remainingCount = limit - postsWithViews.length;

            // If we need more posts, get the latest ones excluding the ones we already have
            let additionalPosts = [];
            let additionalMemberAttributionCounts = [];
            if (remainingCount > 0) {
                additionalPosts = await this.knex('posts as p')
                    .select(
                        'p.id as post_id',
                        'p.uuid as post_uuid',
                        'p.title',
                        'p.published_at',
                        'p.feature_image',
                        'emails.email_count',
                        'emails.opened_count'
                    )
                    .leftJoin('emails', 'emails.post_id', 'p.id')
                    .whereNotIn('p.uuid', postUuids)
                    .where('p.status', 'published')
                    .whereNotNull('p.published_at')
                    .orderBy('p.published_at', 'desc')
                    .limit(remainingCount);

                // Get member attribution counts for additional posts
                if (additionalPosts.length > 0) {
                    additionalMemberAttributionCounts = await this._getMemberAttributionCounts(additionalPosts.map(p => p.post_id), options);
                }
            }

            // Process additional posts with 0 views
            const additionalPostsWithZeroViews = additionalPosts.map((post) => {
                // Find the member attribution count for this post
                const attributionCount = additionalMemberAttributionCounts.find(ac => ac.post_id === post.post_id);
                const memberCount = attributionCount ? (attributionCount.free_members + attributionCount.paid_members) : 0;

                return {
                    post_id: post.post_id,
                    title: post.title,
                    published_at: post.published_at,
                    feature_image: post.feature_image ? urlUtils.transformReadyToAbsolute(post.feature_image) : post.feature_image,
                    views: 0,
                    open_rate: post.email_count > 0 ? (post.opened_count / post.email_count) * 100 : null,
                    members: memberCount
                };
            });

            // Combine both sets of posts
            return {data: [...postsWithViews, ...additionalPostsWithZeroViews]};
        } catch (error) {
            logging.error('Error fetching top posts views:', error);
            return {data: []};
        }
    }

    /**
     * Get member attribution counts for a set of post IDs, modeling after GrowthStats logic
     * Properly handles both free and paid members with deduplication
     * @private
     * @param {string[]} postIds - Array of post IDs to get attribution counts for
     * @param {Object} options - Date filter options
     * @returns {Promise<Array<{post_id: string, free_members: number, paid_members: number}>>}
     */
    async _getMemberAttributionCounts(postIds, options = {}) {
        if (!postIds.length) {
            return [];
        }

        try {
            // Build free members query (modeled after _buildFreeMembersSubquery)
            // Members who signed up on post but paid elsewhere/never
            let freeMembersQuery = this.knex('members_created_events as mce')
                .select('mce.attribution_id as post_id')
                .countDistinct('mce.member_id as free_members')
                .leftJoin('members_subscription_created_events as msce', function () {
                    this.on('mce.member_id', '=', 'msce.member_id')
                        .andOn('mce.attribution_id', '=', 'msce.attribution_id')
                        .andOnVal('msce.attribution_type', '=', 'post');
                })
                .where('mce.attribution_type', 'post')
                .whereIn('mce.attribution_id', postIds)
                .whereNull('msce.id')
                .groupBy('mce.attribution_id');

            // Apply date filter to free members query
            this._applyDateFilter(freeMembersQuery, options, 'mce.created_at');

            // Build paid members query (modeled after _buildPaidMembersSubquery)
            // Members whose paid conversion was attributed to this post
            let paidMembersQuery = this.knex('members_subscription_created_events as msce')
                .select('msce.attribution_id as post_id')
                .countDistinct('msce.member_id as paid_members')
                .where('msce.attribution_type', 'post')
                .whereIn('msce.attribution_id', postIds)
                .groupBy('msce.attribution_id');

            // Apply date filter to paid members query
            this._applyDateFilter(paidMembersQuery, options, 'msce.created_at');

            // Execute both queries
            const [freeResults, paidResults] = await Promise.all([
                freeMembersQuery,
                paidMembersQuery
            ]);

            // Combine results for each post
            const combinedResults = postIds.map((postId) => {
                const freeResult = freeResults.find(r => r.post_id === postId);
                const paidResult = paidResults.find(r => r.post_id === postId);

                return {
                    post_id: postId,
                    free_members: freeResult ? freeResult.free_members : 0,
                    paid_members: paidResult ? paidResult.paid_members : 0
                };
            });

            return combinedResults;
        } catch (error) {
            logging.error('Error fetching member attribution counts:', error);
            return postIds.map(postId => ({
                post_id: postId,
                free_members: 0,
                paid_members: 0
            }));
        }
    }
}

module.exports = PostsStatsService;
