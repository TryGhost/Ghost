const AnalyticEventRepository = require('./lib/AnalyticEventRepository');
const EventHandler = require('./lib/EventHandler');

class MemberAnalyticsService {
    /**
     * @param {AnalyticEventRepository} analyticEventRepository
     */
    constructor(analyticEventRepository) {
        this.eventHandler = new EventHandler(analyticEventRepository);
    }

    static create(AnalyticEventModel) {
        const analyticEventRepository = new AnalyticEventRepository(AnalyticEventModel);

        return new MemberAnalyticsService(analyticEventRepository);
    }
}

module.exports = MemberAnalyticsService;
