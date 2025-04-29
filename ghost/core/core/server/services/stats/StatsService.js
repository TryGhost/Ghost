const MRRService = require('./MrrStatsService');
const MembersService = require('./MembersStatsService');
const SubscriptionStatsService = require('./SubscriptionStatsService');
const ReferrersStatsService = require('./ReferrersStatsService');
const TopPagesStatsService = require('./TopPagesStatsService');

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
        return new StatsService({
            mrr: new MRRService(deps),
            members: new MembersService(deps),
            subscriptions: new SubscriptionStatsService(deps),
            referrers: new ReferrersStatsService(deps),
            topPages: new TopPagesStatsService(deps)
        });
    }
}

module.exports = StatsService;
