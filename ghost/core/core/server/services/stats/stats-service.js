const MRRService = require('./mrr-stats-service');
const MembersService = require('./members-stats-service');
const SubscriptionStatsService = require('./subscription-stats-service');
const ReferrersStatsService = require('./referrers-stats-service');
const PostsStatsService = require('./posts-stats-service');
const ContentStatsService = require('./content-stats-service');
class StatsService {
    /**
     * @param {object} deps
     * @param {MRRService} deps.mrr
     * @param {MembersService} deps.members
     * @param {SubscriptionStatsService} deps.subscriptions
     * @param {ReferrersStatsService} deps.referrers
     * @param {PostsStatsService} deps.posts
     * @param {ContentStatsService} deps.content
     **/
    constructor(deps) {
        this.mrr = deps.mrr;
        this.members = deps.members;
        this.subscriptions = deps.subscriptions;
        this.referrers = deps.referrers;
        this.posts = deps.posts;
        this.content = deps.content;
    }

    async getMRRHistory(options = {}) {
        return this.mrr.getHistory(options);
    }

    /**
     * @param {Object} [options]
     * @param {string} [options.dateFrom] - Start date in YYYY-MM-DD format
     * @param {string} [options.endDate] - End date in YYYY-MM-DD format
     */
    async getMemberCountHistory(options = {}) {
        // Map dateFrom to startDate for backwards compatibility
        const mappedOptions = {
            ...options,
            startDate: options.dateFrom
        };
        delete mappedOptions.dateFrom;

        return this.members.getCountHistory(mappedOptions);
    }

    async getSubscriptionCountHistory() {
        return this.subscriptions.getSubscriptionHistory();
    }

    async getReferrersHistory() {
        return this.referrers.getReferrersHistory();
    }

    /**
     * @param {string} postId
     */
    async getReferrersForPost(postId, options) {
        const result = await this.posts.getReferrersForPost(postId, options);
        return result;
    }

    /**
     * @param {Object} options
     */
    async getTopContent(options = {}) {
        return await this.content.getTopContent(options);
    }

    /**
     * Get top posts by attribution metrics (includes all content that drove conversions)
     * @param {import('./posts-stats-service').TopPostsOptions} options
     * @returns {Promise<{data: import('./posts-stats-service').AttributionResult[]}>}
     */
    async getTopPosts(options = {}) {
        // Return the original { data: results } structure
        const result = await this.posts.getTopPosts(options);
        return result;
    }

    /**
     * Get top posts by views
     * @param {Object} options
     * @param {string} options.date_from - Start date in YYYY-MM-DD format
     * @param {string} options.date_to - End date in YYYY-MM-DD format
     * @param {string} options.timezone - Timezone to use for date interpretation
     * @param {number} [options.limit=5] - Maximum number of posts to return
     * @returns {Promise<{data: import('./posts-stats-service').TopPostResult[]}>}
     */
    async getTopPostsViews(options) {
        const result = await this.posts.getTopPostsViews(options);
        return result;
    }

    /**
     * @param {string} postId
     */
    async getGrowthStatsForPost(postId) {
        return await this.posts.getGrowthStatsForPost(postId);
    }

    /**
     * @param {string[]} postIds
     */
    async getPostsMemberCounts(postIds) {
        return await this.posts.getPostsMemberCounts(postIds);
    }

    /**
     * Get newsletter stats for sent posts
     * @param {Object} options
     * @param {string} [options.newsletter_id] - ID of the specific newsletter to get stats for
     * @param {string} [options.order='published_at desc'] - Order field and direction
     * @param {number} [options.limit=20] - Max number of results to return
     * @param {string} [options.date_from] - Start date filter in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date filter in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<{data: import('./posts-stats-service').NewsletterStatResult[]}>}
     */
    async getNewsletterStats(options = {}) {
        // Extract newsletter_id from options
        const {newsletter_id: newsletterId, ...otherOptions} = options;

        // If no newsletterId is provided, we can't get specific stats
        if (!newsletterId) {
            return {data: []};
        }

        // Return newsletter stats for the specific newsletter
        const result = await this.posts.getNewsletterStats(newsletterId, otherOptions);
        return result;
    }

    /**
     * Get newsletter subscriber statistics including total count and daily deltas
     *
     * @param {Object} options
     * @param {string} [options.newsletter_id] - ID of the specific newsletter to get stats for
     * @param {string} [options.date_from] - Start date filter in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date filter in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @returns {Promise<{data: import('./posts-stats-service').NewsletterSubscriberStats[]}>}
     */
    async getNewsletterSubscriberStats(options = {}) {
        // Extract newsletter_id from options
        const {newsletter_id: newsletterId, ...otherOptions} = options;

        // If no newsletterId is provided, we can't get specific stats
        if (!newsletterId) {
            return {data: [{total: 0, values: []}]};
        }

        const result = await this.posts.getNewsletterSubscriberStats(newsletterId, otherOptions);
        return result;
    }

    /**
     * Get stats for a specific post by ID
     * @param {string} postId - The post ID to get stats for
     * @returns {Promise<{data: Object}>}
     */
    async getPostStats(postId) {
        return await this.posts.getPostStats(postId);
    }

    /**
     * Get visitor counts for multiple posts
     * @param {string[]} postUuids - Array of post UUIDs
     * @returns {Promise<{data: Object}>} Visitor counts mapped by post UUID
     */
    async getPostsVisitorCounts(postUuids) {
        const visitorCounts = await this.posts.getPostsVisitorCounts(postUuids);
        return {
            data: {
                visitor_counts: visitorCounts
            }
        };
    }

    /**
     * Get newsletter basic stats for sent posts (without click data)
     * @param {Object} options
     * @param {string} [options.newsletter_id] - ID of the specific newsletter to get stats for
     * @param {string} [options.order='published_at desc'] - Order field and direction
     * @param {number} [options.limit=20] - Max number of results to return
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @param {string} [options.date_from] - Start date filter in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date filter in YYYY-MM-DD format
     * @returns {Promise<{data: import('./posts-stats-service').NewsletterStatResult[]}>}
     */
    async getNewsletterBasicStats(options = {}) {
        // Extract newsletter_id from options
        const {newsletter_id: newsletterId, ...otherOptions} = options;

        // If no newsletterId is provided, we can't get specific stats
        if (!newsletterId) {
            return {data: []};
        }

        // Return newsletter basic stats for the specific newsletter
        const result = await this.posts.getNewsletterBasicStats(newsletterId, otherOptions);
        return result;
    }

    /**
     * Get newsletter click stats for specific posts
     * @param {Object} options
     * @param {string} [options.newsletter_id] - ID of the specific newsletter to get stats for
     * @param {string} [options.post_ids] - Comma-separated string of post IDs to get click data for
     * @returns {Promise<{data: Object[]}>}
     */
    async getNewsletterClickStats(options = {}) {
        // Extract newsletter_id and post_ids from options
        const {newsletter_id: newsletterId, post_ids: postIds} = options;

        // If no newsletterId is provided, we can't get specific stats
        if (!newsletterId) {
            return {data: []};
        }

        // Return newsletter click stats for the specific newsletter and posts
        const result = await this.posts.getNewsletterClickStats(newsletterId, postIds);
        return result;
    }

    /**
     * @param {Object} options
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @param {string} [options.order='signups desc'] - Sort order: 'signups desc', 'paid_conversions desc', 'mrr desc', 'source desc'
     * @param {number} [options.limit=50] - Maximum number of sources to return
     */
    async getTopSourcesWithRange(options = {}) {
        return this.referrers.getTopSourcesWithRange(options);
    }

    /**
     * @param {object} deps
     *
     * @returns {StatsService}
     **/
    static create(deps) {
        // Create the Tinybird client if config exists
        let tinybirdClient = null;
        const config = deps.config || require('../../../shared/config');
        const request = deps.request || require('../../lib/request-external');
        const settingsCache = deps.settingsCache || require('../../../shared/settings-cache');

        if (settingsCache.get('web_analytics_enabled')) {
            // TODO: move the tinybird client to the tinybird service
            const TinybirdServiceWrapper = require('../tinybird');
            TinybirdServiceWrapper.init();
            tinybirdClient = require('./utils/tinybird').create({
                config,
                request,
                settingsCache,
                tinybirdService: TinybirdServiceWrapper.instance
            });
        }

        // Add the Tinybird client to the dependencies
        const depsWithTinybird = {
            ...deps,
            tinybirdClient
        };

        return new StatsService({
            mrr: new MRRService(deps),
            members: new MembersService(deps),
            subscriptions: new SubscriptionStatsService(deps),
            referrers: new ReferrersStatsService(deps),
            posts: new PostsStatsService(depsWithTinybird),
            content: new ContentStatsService(depsWithTinybird)
        });
    }
}

module.exports = StatsService;
