const MRRService = require('./mrr');
const MembersService = require('./members');

class StatsService {
    /**
     * @param {object} deps
     * @param {MRRService} deps.mrr
     * @param {MembersService} deps.members
     **/
    constructor(deps) {
        this.mrr = deps.mrr;
        this.members = deps.members;
    }

    async getMRRHistory() {
        return this.mrr.getHistory();
    }

    async getMemberCountHistory() {
        return this.members.getCountHistory();
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
            members: new MembersService(deps)
        });
    }
}

module.exports = StatsService;
