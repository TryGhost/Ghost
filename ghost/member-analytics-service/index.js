const AnalyticEventRepository = require('./lib/AnalyticEventRepository');
const AnalyticsService = require('./lib/AnalyticsService');

class MemberAnalyticsModule {
    /**
     * @param {AnalyticEventRepository} analyticEventRepository
     */
    constructor(analyticEventRepository) {
        this.service = new AnalyticsService(analyticEventRepository);
    }

    static create(AnalyticEventModel) {
        const analyticEventRepository = new AnalyticEventRepository(AnalyticEventModel);

        return new MemberAnalyticsModule(analyticEventRepository);
    }
}

module.exports = MemberAnalyticsModule;
