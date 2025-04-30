const MRRService = require('./MrrStatsService');
const MembersService = require('./MembersStatsService');
const SubscriptionStatsService = require('./SubscriptionStatsService');
const ReferrersStatsService = require('./ReferrersStatsService');
const TopPagesStatsService = require('./TopPagesStatsService');
const tinybird = require('./utils/tinybird');

class StatsService {
    /**
     * @param {object} deps
     * @param {MRRService} deps.mrr
     * @param {MembersService} deps.members
     * @param {SubscriptionStatsService} deps.subscriptions
     * @param {ReferrersStatsService} deps.referrers
     * @param {TopPagesStatsService} deps.topPages
     **/
    constructor(deps) {
        this.mrr = deps.mrr;
        this.members = deps.members;
        this.subscriptions = deps.subscriptions;
        this.referrers = deps.referrers;
        this.topPages = deps.topPages;
    }

    async getMRRHistory() {
        return this.mrr.getHistory();
    }

    async getMemberCountHistory() {
        return this.members.getCountHistory();
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
    async getTopPages(options = {}) {
        return await this.topPages.getTopPages(options);
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
            topPages: new TopPagesStatsService(depsWithTinybird)
        });
    }
}

module.exports = StatsService;