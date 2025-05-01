const MRRService = require('./MrrStatsService');
const MembersService = require('./MembersStatsService');
const SubscriptionStatsService = require('./SubscriptionStatsService');
const ReferrersStatsService = require('./ReferrersStatsService');
const TopContentStatsService = require('./TopContentStatsService');
const PostsStatsService = require('./PostsStatsService');
const tinybird = require('./utils/tinybird');

class StatsService {
    /**
     * @param {object} deps
     * @param {MRRService} deps.mrr
     * @param {MembersService} deps.members
     * @param {SubscriptionStatsService} deps.subscriptions
     * @param {ReferrersStatsService} deps.referrers
     * @param {TopContentStatsService} deps.topContent
     * @param {PostsStatsService} deps.posts
     **/
    constructor(deps) {
        this.mrr = deps.mrr;
        this.members = deps.members;
        this.subscriptions = deps.subscriptions;
        this.referrers = deps.referrers;
        this.topContent = deps.topContent;
        this.topPosts = deps.posts;
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
     * @param {Object} options
     */
    async getTopContent(options = {}) {
        return await this.topContent.getTopContent(options);
    }

    /**
     * Get top posts by attribution metrics
     * @param {import('./PostsStatsService').TopPostsOptions} options
     * @returns {Promise<{data: import('./PostsStatsService').TopPostResult[]}>}
     */
    async getTopPosts(options = {}) {
        // Return the original { data: results } structure
        const result = await this.topPosts.getTopPosts(options);
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
            topContent: new TopContentStatsService(depsWithTinybird),
            posts: new PostsStatsService(deps)
        });
    }
}

module.exports = StatsService;
