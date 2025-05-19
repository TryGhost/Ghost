const MRRService = require('./MrrStatsService');
const MembersService = require('./MembersStatsService');
const SubscriptionStatsService = require('./SubscriptionStatsService');
const ReferrersStatsService = require('./ReferrersStatsService');
const PostsStatsService = require('./PostsStatsService');
const ContentStatsService = require('./ContentStatsService');
const tinybird = require('./utils/tinybird');

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

    async getMRRHistory() {
        return this.mrr.getHistory();
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
    async getPostReferrers(postId) {
        return {
            data: await this.referrers.getForPost(postId),
            meta: {}
        };
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
     * Get top posts by attribution metrics
     * @param {import('./PostsStatsService').TopPostsOptions} options
     * @returns {Promise<{data: import('./PostsStatsService').TopPostResult[]}>}
     */
    async getTopPosts(options = {}) {
        // Return the original { data: results } structure
        const result = await this.posts.getTopPosts(options);
        return result;
    }

    /**
     * @param {string} postId
     */
    async getGrowthStatsForPost(postId) {
        return await this.posts.getGrowthStatsForPost(postId);
    }

    /**
     * Get newsletter stats for sent posts
     * @param {Object} options
     * @param {string} [options.newsletter_id] - ID of the specific newsletter to get stats for
     * @param {string} [options.order='published_at desc'] - Order field and direction
     * @param {number} [options.limit=20] - Max number of results to return
     * @param {string} [options.date_from] - Start date filter in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date filter in YYYY-MM-DD format
     * @returns {Promise<{data: Object[]}>}
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
     * @returns {Promise<{data: Object}>}
     */
    async getNewsletterSubscriberStats(options = {}) {
        // Extract newsletter_id from options
        const {newsletter_id: newsletterId, ...otherOptions} = options;
        
        // If no newsletterId is provided, we can't get specific stats
        if (!newsletterId) {
            return {data: [{total: 0, deltas: []}]};
        }
        
        const result = await this.posts.getNewsletterSubscriberStats(newsletterId, otherOptions);
        return result;
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

        // Only create the client if Tinybird is configured
        if (config.get('tinybird') && config.get('tinybird:stats')) {
            tinybirdClient = tinybird.create({
                config,
                request
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
            posts: new PostsStatsService(deps),
            content: new ContentStatsService(depsWithTinybird)
        });
    }
}

module.exports = StatsService;
