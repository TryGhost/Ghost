const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');

// Import source normalization from ReferrersStatsService
const {normalizeSource} = require('./referrers-stats-service');
// Import centralized date utilities
const {getDateBoundaries, applyDateFilter} = require('./utils/date-utils');

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
 * @typedef {Object} TopPostsOptions
 * @property {string} [order='free_members desc'] - Sort order (e.g., 'free_members desc', 'paid_members desc', 'mrr desc')
 * @property {number} [limit=20] - Maximum number of results to return
 * @property {string} [date_from] - Start date filter in YYYY-MM-DD format
 * @property {string} [date_to] - End date filter in YYYY-MM-DD format
 * @property {string} [timezone='UTC'] - optional timezone for date interpretation
 * @property {string} [post_type] - Filter by post type ('post', 'page')
 */

/**
 * @typedef {Object} AttributionResult
 * @property {string} [post_id] - Post ID if this is a post/page
 * @property {string} attribution_url - The URL that drove the conversion
 * @property {string} attribution_type - Type of attribution ('post', 'page', 'url', 'tag', 'author')
 * @property {string} attribution_id - ID of the attributed resource
 * @property {string} title - Display title for the content
 * @property {string} [published_at] - Publication date
 * @property {number} free_members - Number of free member conversions
 * @property {number} paid_members - Number of paid member conversions
 * @property {number} mrr - Monthly recurring revenue impact
 * @property {string} [post_type] - Post type if applicable
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
 * @property {Array<{date: string, value: number}>} values - Daily subscription cumulative values
 */

class PostsStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex - Database client
     * @param {object} [deps.tinybirdClient] - Tinybird client for analytics
     * @param {object} [deps.urlService] - URL service for checking URL existence
     */
    constructor(deps) {
        this.knex = deps.knex;
        this.tinybirdClient = deps.tinybirdClient;
        this.urlService = deps.urlService;
    }

    /**
     * Get top posts by attribution metrics (free_members, paid_members, or mrr)
     *
     * @param {TopPostsOptions} options
     * @returns {Promise<{data: AttributionResult[]}>} The top posts based on the requested attribution metric
     */
    async getTopPosts(options) {
        try {
            const order = options.order || 'free_members desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20;
            const [orderField, orderDirection = 'desc'] = order.split(' ');
            const {dateFrom, dateTo} = getDateBoundaries(options);

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
                            const subquery1 = this.select('attribution_url', 'attribution_type', 'attribution_id')
                                .from('members_created_events')
                                .whereNotNull('attribution_url');
                            applyDateFilter(subquery1, dateFrom, dateTo, 'created_at');

                            subquery1.union(function () {
                                const subquery2 = this.select('attribution_url', 'attribution_type', 'attribution_id')
                                    .from('members_subscription_created_events')
                                    .whereNotNull('attribution_url');
                                applyDateFilter(subquery2, dateFrom, dateTo, 'created_at');
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

        // Transform results and enrich with titles and URL existence validation
        return results.map((row) => {
            const title = row.title || this._generateTitleFromPath(row.attribution_url);

            // Check if URL exists using the URL service
            let urlExists = true; // Default to true for backward compatibility

            if (this.urlService && row.attribution_url) {
                try {
                    // Check if URL service is ready
                    if (this.urlService.hasFinished && this.urlService.hasFinished()) {
                        const resource = this.urlService.getResource(row.attribution_url);
                        urlExists = !!resource; // Convert to boolean
                    }
                    // If URL service isn't ready, we default to true (clickable)
                } catch (error) {
                    // If there's an error checking the URL service, default to true
                    urlExists = true;
                }
            }

            return {
                post_id: row.post_id,
                attribution_url: row.attribution_url,
                attribution_type: row.attribution_type,
                attribution_id: row.attribution_id,
                title,
                published_at: row.published_at,
                free_members: row.free_members,
                paid_members: row.paid_members,
                mrr: row.mrr,
                post_type: row.attribution_type === 'post' ? 'post' : (row.attribution_type === 'page' ? 'page' : null),
                url_exists: urlExists
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
            const segments = path.split('/');
            return segments.length > 2 && segments[2] ? `tag/${segments[2]}` : 'tag/unknown';
        }
        if (path.startsWith('/tags/')) {
            const segments = path.split('/');
            return segments.length > 2 && segments[2] ? `tag/${segments[2]}` : 'tag/unknown';
        }
        if (path.startsWith('/author/')) {
            const segments = path.split('/');
            return segments.length > 2 && segments[2] ? `author/${segments[2]}` : 'author/unknown';
        }
        if (path.startsWith('/authors/')) {
            const segments = path.split('/');
            return segments.length > 2 && segments[2] ? `author/${segments[2]}` : 'author/unknown';
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
                .whereIn('mce.attribution_type', ['post', 'page'])
                .where('msce.id', null);

            const paidMembers = await this.knex('members_subscription_created_events as msce')
                .countDistinct('msce.member_id as paid_members')
                .where('msce.attribution_id', postId)
                .whereIn('msce.attribution_type', ['post', 'page']);

            const mrr = await this.knex('members_subscription_created_events as msce')
                .sum('mpse.mrr_delta as mrr')
                .join('members_paid_subscription_events as mpse', function () {
                    this.on('mpse.subscription_id', '=', 'msce.subscription_id');
                    this.andOn('mpse.member_id', '=', 'msce.member_id');
                })
                .where('msce.attribution_id', postId)
                .whereIn('msce.attribution_type', ['post', 'page']);

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
     * @param {boolean} groupByUrl - Whether to group by attribution_url instead of attribution_id
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildFreeMembersSubquery(options, groupByUrl = false) {
        const knex = this.knex;
        const selectField = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id';
        const joinCondition = groupByUrl ? 'mce.attribution_url' : 'mce.attribution_id';
        const {dateFrom, dateTo} = getDateBoundaries(options);

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

        applyDateFilter(subquery, dateFrom, dateTo, 'mce.created_at');
        return subquery;
    }

    /**
     * Build a subquery/CTE for paid_members count (Post-level)
     * (Paid conversion attributed to this post)
     * @private
     * @param {StatsServiceOptions} options
     * @param {boolean} groupByUrl - Whether to group by attribution_url instead of attribution_id
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildPaidMembersSubquery(options, groupByUrl = false) {
        const knex = this.knex;
        const selectField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id';
        const {dateFrom, dateTo} = getDateBoundaries(options);

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

        applyDateFilter(subquery, dateFrom, dateTo, 'msce.created_at');
        return subquery;
    }

    /**
     * Build a subquery/CTE for mrr sum (Post-level)
     * (Paid Conversions Attributed to Post)
     * @private
     * @param {StatsServiceOptions} options
     * @param {boolean} groupByUrl - Whether to group by attribution_url instead of attribution_id
     * @returns {import('knex').Knex.QueryBuilder}
     */
    _buildMrrSubquery(options, groupByUrl = false) {
        const selectField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id as post_id';
        const groupByField = groupByUrl ? 'msce.attribution_url' : 'msce.attribution_id';
        const {dateFrom, dateTo} = getDateBoundaries(options);

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

        applyDateFilter(subquery, dateFrom, dateTo, 'msce.created_at');
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
        const {dateFrom, dateTo} = getDateBoundaries(options);

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

        applyDateFilter(subquery, dateFrom, dateTo, 'mce.created_at');
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
        const {dateFrom, dateTo} = getDateBoundaries(options);
        let subquery = knex('members_subscription_created_events as msce')
            .select('msce.referrer_source as source')
            .countDistinct('msce.member_id as paid_members')
            .where('msce.attribution_id', postId)
            .where('msce.attribution_type', 'post')
            .groupBy('msce.referrer_source');

        applyDateFilter(subquery, dateFrom, dateTo, 'msce.created_at');
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
        const {dateFrom, dateTo} = getDateBoundaries(options);
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

        applyDateFilter(subquery, dateFrom, dateTo, 'msce.created_at');
        return subquery;
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
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<{data: NewsletterStatResult[]}>} The newsletter stats for sent/published posts with the specified newsletter_id
     */
    async getNewsletterStats(newsletterId, options = {}) {
        try {
            const order = options.order || 'date desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20;
            const {dateFrom, dateTo} = getDateBoundaries(options);

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
                .orderBy(orderFieldMap[orderField], orderDirection)
                .limit(limit);

            // Apply centralized date filtering
            applyDateFilter(query, dateFrom, dateTo, 'p.published_at');

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
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<{data: Array}>} The newsletter basic stats (with click data when ordering by click_rate)
     */
    async getNewsletterBasicStats(newsletterId, options = {}) {
        try {
            const order = options.order || 'date desc';
            const limitRaw = Number.parseInt(String(options.limit ?? 20), 10);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20;
            const {dateFrom, dateTo} = getDateBoundaries(options);

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

            let query;

            // If ordering by click_rate, we need to include click data
            if (orderField === 'click_rate') {
                // Subquery to count clicks from members_click_events
                const clicksSubquery = this.knex
                    .select('r.post_id')
                    .countDistinct('mce.member_id as click_count')
                    .from('redirects as r')
                    .leftJoin('members_click_events as mce', 'r.id', 'mce.redirect_id')
                    .whereNotNull('r.post_id')
                    .groupBy('r.post_id')
                    .as('clicks');

                // Build the query with click data
                query = this.knex
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
                    .orderBy(orderFieldMap[orderField], orderDirection)
                    .limit(limit);

                // Apply centralized date filtering
                applyDateFilter(query, dateFrom, dateTo, 'p.published_at');
            } else {
                // Build the query without click data for better performance
                query = this.knex
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
                    .orderBy(orderFieldMap[orderField], orderDirection)
                    .limit(limit);

                // Apply centralized date filtering
                applyDateFilter(query, dateFrom, dateTo, 'p.published_at');
            }

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
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<{data: Array<{total: number, values: Array<{date: string, value: number}>}>}>} The newsletter subscriber stats with cumulative values
     */
    async getNewsletterSubscriberStats(newsletterId, options = {}) {
        try {
            const timezone = options.timezone || 'UTC';
            const {dateFrom, dateTo} = getDateBoundaries(options);

            // Run both queries in parallel for better performance
            const [totalResult, rawDeltas] = await Promise.all([
                // Get total subscriber count (optimized query - avoid JOIN)
                this.knex('members_newsletters as mn')
                    .countDistinct('mn.member_id as total')
                    .where('mn.newsletter_id', newsletterId)
                    .whereNotExists(function () {
                        this.select('*')
                            .from('members as m')
                            .whereRaw('m.id = mn.member_id')
                            .where('m.email_disabled', 1);
                    }),

                // Get daily deltas (optimized query)
                this._getNewsletterSubscriberDeltas(newsletterId, options)
            ]);

            const totalValue = totalResult[0] ? totalResult[0].total : 0;
            const total = parseInt(String(totalValue), 10);

            // Transform raw database results (daily changes) to cumulative values
            const values = [];
            let cumulativeTotal = 0;

            // First pass: collect all daily changes from database
            const dailyChanges = [];
            for (const row of rawDeltas) {
                if (row) {
                    // @ts-ignore
                    const dateValue = row.date || '';
                    // @ts-ignore
                    const changeValue = row.value || 0;
                    dailyChanges.push({
                        date: String(dateValue),
                        change: parseInt(String(changeValue), 10)
                    });
                }
            }

            // Calculate the starting point by working backwards from the current total
            const totalChange = dailyChanges.reduce((sum, item) => sum + item.change, 0);
            cumulativeTotal = total - totalChange;
            const startingTotal = cumulativeTotal;

            // Second pass: build cumulative values from daily changes
            for (const dayData of dailyChanges) {
                cumulativeTotal += dayData.change;
                values.push({
                    date: dayData.date,
                    value: cumulativeTotal
                });
            }

            // Fill in missing dates to ensure the frontend has a complete time series
            // This is critical for percent change calculations which need consecutive days
            const completeValues = this._fillMissingDates(
                values,
                dateFrom ? dateFrom.split('T')[0] : null,
                dateTo ? dateTo.split('T')[0] : null,
                timezone,
                startingTotal
            );

            return {
                data: [{
                    total,
                    values: completeValues
                }]
            };
        } catch (error) {
            logging.error(`Error fetching subscriber stats for newsletter ${newsletterId}:`, error);
            return {
                data: [{
                    total: 0,
                    values: []
                }]
            };
        }
    }

    /**
     * Optimized query to get newsletter subscriber deltas
     * @private
     * @param {string} newsletterId - ID of the newsletter to get subscriber deltas for
     * @param {Object} options - Query options
     * @param {string} [options.date_from] - Optional start date filter (YYYY-MM-DD)
     * @param {string} [options.date_to] - Optional end date filter (YYYY-MM-DD)
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     */
    async _getNewsletterSubscriberDeltas(newsletterId, options = {}) {
        const {dateFrom, dateTo} = getDateBoundaries(options);

        // Build optimized deltas query - avoid expensive JOIN
        let deltasQuery = this.knex('members_subscribe_events as mse')
            .select(
                this.knex.raw(`DATE(mse.created_at) as date`),
                this.knex.raw(`SUM(CASE WHEN mse.subscribed = 1 THEN 1 ELSE -1 END) as value`)
            )
            .where('mse.newsletter_id', newsletterId)
            .whereNotExists(function () {
                this.select('*')
                    .from('members as m')
                    .whereRaw('m.id = mse.member_id')
                    .where('m.email_disabled', 1);
            })
            .groupByRaw('DATE(mse.created_at)')
            .orderBy('date', 'asc');

        // Apply timezone-aware date filters
        applyDateFilter(deltasQuery, dateFrom, dateTo, 'mse.created_at');

        return await deltasQuery;
    }

    /**
     * Fill missing dates in a time series with carried-forward values
     * @private
     * @param {Array<{date: string, value: number}>} values - Sparse array of values with dates
     * @param {string|null} startDate - Start date in YYYY-MM-DD format (ISO)
     * @param {string|null} endDate - End date in YYYY-MM-DD format (ISO)
     * @param {string} timezone - Timezone for date interpretation
     * @param {number} startingValue - The value to use before the first event (default: 0)
     * @returns {Array<{date: string, value: number}>} Dense array with all dates filled
     */
    _fillMissingDates(values, startDate, endDate, timezone = 'UTC', startingValue = 0) {
        const moment = require('moment-timezone');

        // If no date range provided, return as-is
        if (!startDate || !endDate) {
            return values || [];
        }

        // Determine the date range
        const rangeStart = moment.tz(startDate, timezone).startOf('day');
        const rangeEnd = moment.tz(endDate, timezone).startOf('day');

        // Create a map of existing dates for quick lookup
        const valuesByDate = new Map();
        if (values && values.length > 0) {
            values.forEach((item) => {
                const dateKey = moment.tz(item.date, timezone).startOf('day').format('YYYY-MM-DD');
                valuesByDate.set(dateKey, item.value);
            });
        }

        // Build complete time series with all dates
        const completeValues = [];
        let lastValue = startingValue; // Use provided starting value
        let currentDate = rangeStart.clone();

        while (currentDate.isSameOrBefore(rangeEnd)) {
            const dateKey = currentDate.format('YYYY-MM-DD');

            if (valuesByDate.has(dateKey)) {
                // Date has an event - use the calculated value
                lastValue = valuesByDate.get(dateKey);
            }
            // Always add the date (either with event value or carried-forward value)
            completeValues.push({
                date: dateKey,
                value: lastValue
            });

            currentDate.add(1, 'day');
        }

        return completeValues;
    }

    /**
     * Get stats for a specific post by ID (analytics only, no post content)
     * @param {string} postId - The post ID to get stats for
     * @returns {Promise<{data: Array<{id: string, recipient_count: number|null, opened_count: number|null, open_rate: number|null, member_delta: number, free_members: number, paid_members: number, visitors: number}>}>}
     */
    async getPostStats(postId) {
        try {
            // Validate postId parameter
            if (!postId || postId.trim() === '') {
                return {data: []};
            }

            // Get basic post info for stats calculations
            const postData = await this.knex('posts')
                .select('posts.id', 'posts.uuid', 'posts.published_at', 'e.email_count', 'e.opened_count')
                .leftJoin('emails as e', 'posts.id', 'e.post_id')
                .where('posts.id', postId)
                .where('posts.status', 'published')
                .first();

            if (!postData) {
                return {data: []};
            }

            // Get member attribution counts
            const memberAttributionCounts = await this._getMemberAttributionCounts([postData.id]);
            const attributionCount = memberAttributionCounts.find(ac => ac.post_id === postData.id);

            const freeMembers = attributionCount ? attributionCount.free_members : 0;
            const paidMembers = attributionCount ? attributionCount.paid_members : 0;
            const totalMembers = freeMembers + paidMembers;

            // Calculate open rate
            const openRate = postData.email_count ?
                (postData.opened_count / postData.email_count) * 100 :
                null;

            // Get visitor count from Tinybird
            let visitors = 0;
            if (this.tinybirdClient && postData.uuid) {
                try {
                    const dateFrom = new Date(postData.published_at).toISOString().split('T')[0];
                    const visitorData = await this.tinybirdClient.fetch('api_top_pages', {
                        post_uuid: postData.uuid,
                        dateFrom: dateFrom
                    });

                    visitors = visitorData?.[0]?.visits || 0;
                } catch (error) {
                    logging.error('Error fetching visitor data from Tinybird:', error);
                }
            }

            return {
                data: [{
                    id: postData.id,
                    recipient_count: postData.email_count || null,
                    opened_count: postData.opened_count || null,
                    open_rate: openRate,
                    member_delta: totalMembers,
                    free_members: freeMembers,
                    paid_members: paidMembers,
                    visitors: visitors
                }]
            };
        } catch (error) {
            logging.error(`Error fetching post stats for post ${postId}:`, error);
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

            // Get posts data from Ghost DB - prioritize posts that were sent as newsletters
            const posts = await this.knex('posts as p')
                .select(
                    'p.id as post_id',
                    'p.uuid as post_uuid',
                    'p.title',
                    'p.published_at',
                    'p.feature_image',
                    'p.status',
                    'emails.email_count',
                    'emails.opened_count'
                )
                .leftJoin('emails', 'emails.post_id', 'p.id')
                .where('p.status', 'published')
                .where('p.type', 'post')
                .whereNotNull('p.published_at')
                .orderByRaw('CASE WHEN p.uuid IN (?) THEN 0 ELSE 1 END', [postUuids.length > 0 ? postUuids : ['none']])
                .orderBy('p.published_at', 'desc')
                .limit(limit);

            // Get authors for all posts
            const postIds = posts.map(p => p.post_id);
            const authorsData = postIds.length > 0 ? await this.knex('posts_authors as pa')
                .select('pa.post_id', 'u.name', 'pa.sort_order')
                .leftJoin('users as u', 'u.id', 'pa.author_id')
                .whereIn('pa.post_id', postIds)
                .whereNotNull('u.name')
                .orderBy(['pa.post_id', 'pa.sort_order']) : [];

            // Group authors by post_id
            const authorsByPost = {};
            authorsData.forEach((author) => {
                if (!authorsByPost[author.post_id]) {
                    authorsByPost[author.post_id] = [];
                }
                authorsByPost[author.post_id].push(author.name);
            });

            // Add authors to posts
            posts.forEach((post) => {
                post.authors = (authorsByPost[post.post_id] || []).join(', ');
            });

            // Get member attribution counts and click counts for these posts
            const [memberAttributionCounts, clickCounts] = await Promise.all([
                this._getMemberAttributionCounts(posts.map(p => p.post_id), options),
                this.getPostsClickCounts(posts.map(p => p.post_id))
            ]);

            // Process posts with views
            const postsWithViews = viewsData.map((row) => {
                const post = posts.find(p => p.post_uuid === row.post_uuid);

                if (!post) {
                    return null;
                }

                // Find the member attribution count for this post
                const attributionCount = memberAttributionCounts.find(ac => ac.post_id === post.post_id);
                const memberCount = attributionCount ? (attributionCount.free_members + attributionCount.paid_members) : 0;
                const clickCount = clickCounts[post.post_id] || 0;

                return {
                    post_id: post.post_id,
                    title: post.title,
                    published_at: post.published_at,
                    feature_image: post.feature_image ? urlUtils.transformReadyToAbsolute(post.feature_image) : post.feature_image,
                    status: post.status,
                    authors: post.authors,
                    views: row.visits,
                    sent_count: post.email_count || null,
                    opened_count: post.opened_count || null,
                    open_rate: post.email_count > 0 ? (post.opened_count / post.email_count) * 100 : null,
                    clicked_count: clickCount,
                    click_rate: post.email_count > 0 ? (clickCount / post.email_count) * 100 : null,
                    members: memberCount,
                    free_members: attributionCount ? attributionCount.free_members : 0,
                    paid_members: attributionCount ? attributionCount.paid_members : 0
                };
            }).filter(Boolean);

            // Calculate how many more posts we need - we want to always return 5 posts
            const remainingCount = limit - postsWithViews.length;

            // If we need more posts, get the latest ones excluding the ones we already have
            let additionalPosts = [];
            let additionalMemberAttributionCounts = [];
            let additionalClickCounts = {};
            if (remainingCount > 0) {
                // Get post IDs that we already have to exclude them
                const existingPostIds = postsWithViews.map(p => p.post_id);

                additionalPosts = await this.knex('posts as p')
                    .select(
                        'p.id as post_id',
                        'p.uuid as post_uuid',
                        'p.title',
                        'p.published_at',
                        'p.feature_image',
                        'p.status',
                        'emails.email_count',
                        'emails.opened_count'
                    )
                    .leftJoin('emails', 'emails.post_id', 'p.id')
                    .whereNotIn('p.uuid', postUuids)
                    .whereNotIn('p.id', existingPostIds)
                    .where('p.status', 'published')
                    .where('p.type', 'post')
                    .whereNotNull('p.published_at')
                    .orderBy('p.published_at', 'desc')
                    .limit(remainingCount);

                // Get authors for additional posts
                const additionalPostIds = additionalPosts.map(p => p.post_id);
                const additionalAuthorsData = additionalPostIds.length > 0 ? await this.knex('posts_authors as pa')
                    .select('pa.post_id', 'u.name', 'pa.sort_order')
                    .leftJoin('users as u', 'u.id', 'pa.author_id')
                    .whereIn('pa.post_id', additionalPostIds)
                    .whereNotNull('u.name')
                    .orderBy(['pa.post_id', 'pa.sort_order']) : [];

                // Group authors by post_id for additional posts
                const additionalAuthorsByPost = {};
                additionalAuthorsData.forEach((author) => {
                    if (!additionalAuthorsByPost[author.post_id]) {
                        additionalAuthorsByPost[author.post_id] = [];
                    }
                    additionalAuthorsByPost[author.post_id].push(author.name);
                });

                // Add authors to additional posts
                additionalPosts.forEach((post) => {
                    post.authors = (additionalAuthorsByPost[post.post_id] || []).join(', ');
                });

                // Get member attribution counts and click counts for additional posts
                if (additionalPosts.length > 0) {
                    [additionalMemberAttributionCounts, additionalClickCounts] = await Promise.all([
                        this._getMemberAttributionCounts(additionalPosts.map(p => p.post_id), options),
                        this.getPostsClickCounts(additionalPosts.map(p => p.post_id))
                    ]);
                }
            }

            // Process additional posts with 0 views
            const additionalPostsWithZeroViews = additionalPosts.map((post) => {
                // Find the member attribution count for this post
                const attributionCount = additionalMemberAttributionCounts.find(ac => ac.post_id === post.post_id);
                const memberCount = attributionCount ? (attributionCount.free_members + attributionCount.paid_members) : 0;
                const clickCount = additionalClickCounts[post.post_id] || 0;

                return {
                    post_id: post.post_id,
                    title: post.title,
                    published_at: post.published_at,
                    feature_image: post.feature_image ? urlUtils.transformReadyToAbsolute(post.feature_image) : post.feature_image,
                    status: post.status,
                    authors: post.authors,
                    views: 0,
                    sent_count: post.email_count || null,
                    opened_count: post.opened_count || null,
                    open_rate: post.email_count > 0 ? (post.opened_count / post.email_count) * 100 : null,
                    clicked_count: clickCount,
                    click_rate: post.email_count > 0 ? (clickCount / post.email_count) * 100 : null,
                    members: memberCount,
                    free_members: attributionCount ? attributionCount.free_members : 0,
                    paid_members: attributionCount ? attributionCount.paid_members : 0
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
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<Array<{post_id: string, free_members: number, paid_members: number}>>}
     */
    async _getMemberAttributionCounts(postIds, options = {}) {
        if (!postIds.length) {
            return [];
        }

        const {dateFrom, dateTo} = getDateBoundaries(options);

        try {
            // Build free members query (modeled after _buildFreeMembersSubquery)
            // Members who signed up on post but paid elsewhere/never
            let freeMembersQuery = this.knex('members_created_events as mce')
                .select('mce.attribution_id as post_id')
                .countDistinct('mce.member_id as free_members')
                .leftJoin('members_subscription_created_events as msce', function () {
                    this.on('mce.member_id', '=', 'msce.member_id')
                        .andOn('mce.attribution_id', '=', 'msce.attribution_id')
                        .andOnIn('msce.attribution_type', ['post', 'page']);
                })
                .whereIn('mce.attribution_type', ['post', 'page'])
                .whereIn('mce.attribution_id', postIds)
                .whereNull('msce.id')
                .groupBy('mce.attribution_id');

            // Apply date filter to free members query
            applyDateFilter(freeMembersQuery, dateFrom, dateTo, 'mce.created_at');

            // Build paid members query (modeled after _buildPaidMembersSubquery)
            // Members whose paid conversion was attributed to this post
            let paidMembersQuery = this.knex('members_subscription_created_events as msce')
                .select('msce.attribution_id as post_id')
                .countDistinct('msce.member_id as paid_members')
                .whereIn('msce.attribution_type', ['post', 'page'])
                .whereIn('msce.attribution_id', postIds)
                .groupBy('msce.attribution_id');

            // Apply date filter to paid members query
            applyDateFilter(paidMembersQuery, dateFrom, dateTo, 'msce.created_at');

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

    /**
     * Get member attribution counts for multiple posts
     * @param {string[]} postIds - Array of post IDs
     * @param {Object} options - Date filter options
     * @returns {Promise<Object>} Map of post ID to member counts
     */
    async getPostsMemberCounts(postIds, options = {}) {
        try {
            const attributionCounts = await this._getMemberAttributionCounts(postIds, options);

            // Convert array to object mapping post_id -> counts
            const memberCounts = {};
            attributionCounts.forEach((count) => {
                memberCounts[count.post_id] = {
                    free_members: count.free_members,
                    paid_members: count.paid_members
                };
            });

            return memberCounts;
        } catch (error) {
            logging.error('Error fetching member counts:', error);
            return {};
        }
    }

    /**
     * Get visitor counts for multiple posts from Tinybird
     * @param {string[]} postUuids - Array of post UUIDs
     * @returns {Promise<Object>} Map of post UUID to visitor count
     */
    async getPostsVisitorCounts(postUuids) {
        try {
            if (!postUuids || !Array.isArray(postUuids) || postUuids.length === 0) {
                return {};
            }

            if (!this.tinybirdClient) {
                // Return empty object if Tinybird is not configured
                return {};
            }

            // Fetch visitor counts from Tinybird for all posts
            const visitorData = await this.tinybirdClient.fetch('api_post_visitor_counts', {
                post_uuids: postUuids
            });

            // Convert the response to a simple UUID -> count mapping
            const visitorCounts = {};
            if (visitorData && Array.isArray(visitorData)) {
                visitorData.forEach((row) => {
                    if (row.post_uuid && row.visits !== undefined) {
                        visitorCounts[row.post_uuid] = row.visits;
                    }
                });
            }

            return visitorCounts;
        } catch (error) {
            logging.error('Error fetching visitor counts from Tinybird:', error);
            return {};
        }
    }

    /**
     * Get click counts for multiple posts
     * @param {string[]} postIds - Array of post IDs
     * @returns {Promise<Object>} Map of post ID to click count
     */
    async getPostsClickCounts(postIds) {
        try {
            if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
                return {};
            }

            // Query to count clicks from members_click_events for multiple posts
            const clicksQuery = await this.knex
                .select(
                    'r.post_id',
                    this.knex.raw('COALESCE(COUNT(DISTINCT mce.member_id), 0) as total_clicks')
                )
                .from('redirects as r')
                .leftJoin('members_click_events as mce', 'r.id', 'mce.redirect_id')
                .whereIn('r.post_id', postIds)
                .whereNotNull('r.post_id')
                .groupBy('r.post_id');

            // Convert the response to a simple post_id -> count mapping
            const clickCounts = {};
            clicksQuery.forEach((row) => {
                if (row.post_id) {
                    clickCounts[row.post_id] = row.total_clicks || 0;
                }
            });

            return clickCounts;
        } catch (error) {
            logging.error('Error fetching click counts:', error);
            return {};
        }
    }
}

module.exports = PostsStatsService;
