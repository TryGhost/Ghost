const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

// Import source normalization from ReferrersStatsService
const {normalizeSource} = require('./ReferrersStatsService');

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
 * @property {string} published_at - The date the post was published
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

            // Start from attribution events and aggregate by URL to include ALL paths that drove conversions
            const freeMembersCTE = this._buildFreeMembersSubquery(options, true);
            const paidMembersCTE = this._buildPaidMembersSubquery(options, true);
            const mrrCTE = this._buildMrrSubquery(options, true);

            // Store knex reference for use in callbacks
            const knex = this.knex;

            const results = await this.knex
                .with('free_attr', freeMembersCTE)
                .with('paid_attr', paidMembersCTE)
                .with('mrr_attr', mrrCTE)
                .with('all_urls', function () {
                    this.select('attribution_url')
                        .from('free_attr')
                        .union(function () {
                            this.select('attribution_url').from('paid_attr');
                        })
                        .union(function () {
                            this.select('attribution_url').from('mrr_attr');
                        });
                })
                .with('url_metadata', function () {
                    // Get the first occurrence of each URL with its metadata
                    this.select('attribution_url')
                        .select(knex.raw('MIN(attribution_type) as attribution_type'))
                        .select(knex.raw('MIN(attribution_id) as attribution_id'))
                        .from(function () {
                            this.select('attribution_url', 'attribution_type', 'attribution_id')
                                .from('members_created_events')
                                .whereNotNull('attribution_url')
                                .whereBetween('created_at', [options.date_from, options.date_to])
                                .union(function () {
                                    this.select('attribution_url', 'attribution_type', 'attribution_id')
                                        .from('members_subscription_created_events')
                                        .whereNotNull('attribution_url')
                                        .whereBetween('created_at', [options.date_from, options.date_to]);
                                })
                                .as('combined');
                        })
                        .groupBy('attribution_url');
                })
                .select([
                    'all_urls.attribution_url',
                    'url_metadata.attribution_type',
                    'url_metadata.attribution_id',
                    'p.id as post_id',
                    'p.title',
                    'p.published_at',
                    knex.raw('COALESCE(free_attr.free_members, 0) as free_members'),
                    knex.raw('COALESCE(paid_attr.paid_members, 0) as paid_members'),
                    knex.raw('COALESCE(mrr_attr.mrr, 0) as mrr')
                ])
                .from('all_urls')
                .leftJoin('free_attr', 'all_urls.attribution_url', 'free_attr.attribution_url')
                .leftJoin('paid_attr', 'all_urls.attribution_url', 'paid_attr.attribution_url')
                .leftJoin('mrr_attr', 'all_urls.attribution_url', 'mrr_attr.attribution_url')
                .leftJoin('url_metadata', 'all_urls.attribution_url', 'url_metadata.attribution_url')
                .leftJoin('posts as p', function () {
                    this.on('url_metadata.attribution_id', 'p.id')
                        .andOnIn('url_metadata.attribution_type', ['post', 'page']);
                })
                .whereRaw('(COALESCE(free_attr.free_members, 0) > 0 OR COALESCE(paid_attr.paid_members, 0) > 0 OR COALESCE(mrr_attr.mrr, 0) > 0)')
                .orderBy(orderField, orderDirection)
                .limit(limit);

            // Apply post_type filter after getting results if specified
            let filteredResults = results;
            if (options.post_type && ['post', 'page'].includes(options.post_type)) {
                filteredResults = results.filter((row) => {
                    if (options.post_type === 'post') {
                        // Posts tab: Only posts (attribution_type = 'post' && has post_id)
                        return row.attribution_type === 'post' && row.post_id !== null;
                    } else if (options.post_type === 'page') {
                        // Pages tab: Everything except posts
                        return !(row.attribution_type === 'post' && row.post_id !== null);
                    }
                    return false;
                });
            }

            // Transform results to include titles using urlService for path resolution
            const transformedResults = await this._enrichWithTitles(filteredResults);

            return {data: transformedResults.slice(0, limit)};
        } catch (error) {
            logging.error('Error fetching top posts by attribution:', error);
            return {data: []};
        }
    }

    async _enrichWithTitles(results) {
        if (!results || !results.length) {
            return [];
        }

        // Transform results and enrich with titles
        return results.map((row) => {
            const title = row.title || this._generateTitleFromPath(row.attribution_url);

            return {
                post_id: row.post_id,
                attribution_url: row.attribution_url,
                attribution_type: row.attribution_type,
                attribution_id: row.attribution_id,
                title,
                published_at: row.published_at,
                free_members: row.free_members,
                paid_members: row.paid_members,
                mrr: row.mrr
            };
        });
    }

    _generateTitleFromPath(path) {
        if (!path) {
            return 'Unknown';
        }
        
        // Handle common Ghost paths
        if (path === '/') {
            return 'Homepage';
        }
        if (path.startsWith('/tag/')) {
            return `Tag: ${path.split('/')[2]}`;
        }
        if (path.startsWith('/tags/')) {
            return `Tag: ${path.split('/')[2]}`;
        }
        if (path.startsWith('/author/')) {
            return `Author: ${path.split('/')[2]}`;
        }  
        if (path.startsWith('/authors/')) {
            return `Author: ${path.split('/')[2]}`;
        }
        
        // For other paths, just return the path itself
        return path;
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

            // Apply source normalization and group by normalized source
            const normalizedResults = new Map();
            
            results.forEach((row) => {
                const normalizedSource = normalizeSource(row.source);
                const existing = normalizedResults.get(normalizedSource) || {
                    source: normalizedSource,
                    referrer_url: row.referrer_url,
                    free_members: 0,
                    paid_members: 0,
                    mrr: 0
                };
                
                existing.free_members += row.free_members;
                existing.paid_members += row.paid_members;
                existing.mrr += row.mrr;
                
                normalizedResults.set(normalizedSource, existing);
            });

            // Convert back to array and sort again since normalization might have changed the order
            const finalResults = Array.from(normalizedResults.values());
            finalResults.sort((a, b) => {
                if (orderDirection === 'desc') {
                    return b[orderField] - a[orderField];
                } else {
                    return a[orderField] - b[orderField];
                }
            });

            return {data: finalResults.slice(0, limit)};
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
    _buildFreeMembersSubquery(options, groupByUrl = false) {
        const knex = this.knex;
        const selectField = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id';
        const joinCondition = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id';
        
        let subquery = knex('members_created_events as mce')
            .select(selectField)
            .countDistinct('mce.member_id as free_members')
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    .andOn(joinCondition, '=', groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id');
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
            .groupBy(groupByField);

        // Filter attribution_type based on post_type - only when grouping by post_id
        if (!groupByUrl) {
            if (options.post_type === 'page') {
                subquery = subquery.where('mce.attribution_type', 'page');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('mce.attribution_type', 'post');
            } else {
                // If no post_type specified, include both
                subquery = subquery.whereIn('mce.attribution_type', ['post', 'page']);
            }
        } else {
            // When groupByUrl=true, include posts, pages, and system pages (url, tag, author)
            if (options.post_type === 'page') {
                subquery = subquery.where('mce.attribution_type', '!=', 'post');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('mce.attribution_type', 'post');
            } else {
                // Include all types that can drive conversions
                subquery = subquery.whereIn('mce.attribution_type', ['post', 'page', 'url', 'tag', 'author']);
            }
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
    _buildPaidMembersSubquery(options, groupByUrl = false) {
        const knex = this.knex;
        const selectField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id';
        
        let subquery = knex('members_subscription_created_events as msce')
            .select(selectField)
            .countDistinct('msce.member_id as paid_members')
            .groupBy(groupByField);

        // Filter attribution_type based on post_type - only when grouping by post_id
        if (!groupByUrl) {
            if (options.post_type === 'page') {
                subquery = subquery.where('msce.attribution_type', 'page');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('msce.attribution_type', 'post');
            } else {
                // If no post_type specified, include both
                subquery = subquery.whereIn('msce.attribution_type', ['post', 'page']);
            }
        } else {
            // When groupByUrl=true, include posts, pages, and system pages (url, tag, author)
            if (options.post_type === 'page') {
                subquery = subquery.where('msce.attribution_type', '!=', 'post');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('msce.attribution_type', 'post');
            } else {
                // Include all types that can drive conversions
                subquery = subquery.whereIn('msce.attribution_type', ['post', 'page', 'url', 'tag', 'author']);
            }
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
    _buildMrrSubquery(options, groupByUrl = false) {
        const selectField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id';
        
        let subquery = this.knex('members_subscription_created_events as msce')
            .select(selectField)
            .sum('mpse.mrr_delta as mrr')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                this.andOn('mpse.member_id', '=', 'msce.member_id');
            })
            .groupBy(groupByField);

        // Filter attribution_type based on post_type - only when grouping by post_id
        if (!groupByUrl) {
            if (options.post_type === 'page') {
                subquery = subquery.where('msce.attribution_type', 'page');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('msce.attribution_type', 'post');
            } else {
                // If no post_type specified, include both
                subquery = subquery.whereIn('msce.attribution_type', ['post', 'page']);
            }
        } else {
            // When groupByUrl=true, include posts, pages, and system pages (url, tag, author)
            if (options.post_type === 'page') {
                // Pages tab: Include actual pages AND system pages (everything except posts)
                subquery = subquery.where('msce.attribution_type', '!=', 'post');
            } else if (options.post_type === 'post') {
                subquery = subquery.where('msce.attribution_type', 'post');
            } else {
                // Include all types that can drive conversions
                subquery = subquery.whereIn('msce.attribution_type', ['post', 'page', 'url', 'tag', 'author']);
            }
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
     * @param {string} [options.order] - Sort order (e.g., 'date desc', 'open_rate desc', 'click_rate desc')
     * @param {number} [options.limit] - Number of results to return (default: 20)
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @returns {Promise<{data: Array}>} The newsletter basic stats (with click data when ordering by click_rate)
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
                sent_to: 'sent_to',
                click_rate: 'click_rate'
            };

            // Validate order field (now including click_rate)
            if (!Object.keys(orderFieldMap).includes(orderField)) {
                throw new errors.BadRequestError({
                    message: `Invalid order field: ${orderField}. Must be one of: date, open_rate, sent_to, click_rate`
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
}

module.exports = PostsStatsService;