const MRRService = require('./mrr');
const MembersService = require('./members');
const SubscriptionStatsService = require('./subscriptions');

class StatsService {
    /**
     * @param {object} deps
     * @param {MRRService} deps.mrr
     * @param {MembersService} deps.members
     * @param {SubscriptionStatsService} deps.subscriptions
     **/
    constructor(deps) {
        this.mrr = deps.mrr;
        this.members = deps.members;
        this.subscriptions = deps.subscriptions;
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

    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     *
     * @returns {StatsService}
     **/
    static create(deps) {
        return new StatsService({
            mrr: new MRRService(deps),
            members: new MembersService(deps),
            subscriptions: new SubscriptionStatsService(deps)
        });
    }
}

module.exports = StatsService;
