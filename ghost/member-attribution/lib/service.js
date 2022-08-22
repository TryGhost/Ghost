const UrlHistory = require('./history');

class MemberAttributionService {
    /**
     * 
     * @param {Object} deps 
     * @param {Object} deps.attributionBuilder
     * @param {Object} deps.models
     * @param {Object} deps.models.MemberCreatedEvent
     * @param {Object} deps.models.SubscriptionCreatedEvent
     */
    constructor({attributionBuilder, models}) {
        this.models = models;
        this.attributionBuilder = attributionBuilder;
    }

    /**
     * 
     * @param {import('./history').UrlHistoryArray} historyArray 
     * @returns {import('./attribution').Attribution}
     */
    getAttribution(historyArray) {
        const history = new UrlHistory(historyArray);
        return this.attributionBuilder.getAttribution(history);
    }

    /**
     * Returns the parsed attribution for a member creation event
     * @param {string} memberId 
     * @returns {Promise<import('./attribution').AttributionResource|null>}
     */
    async getMemberCreatedAttribution(memberId) {
        const memberCreatedEvent = await this.models.MemberCreatedEvent.findOne({member_id: memberId}, {require: false});
        if (!memberCreatedEvent || !memberCreatedEvent.get('attribution_type')) {
            return null;
        }
        const attribution = this.attributionBuilder.build({
            id: memberCreatedEvent.get('attribution_id'),
            url: memberCreatedEvent.get('attribution_url'),
            type: memberCreatedEvent.get('attribution_type')
        });
        return await attribution.getResource();
    }

    /**
     * Returns the last attribution for a given subscription ID
     * @param {string} subscriptionId 
     * @returns {Promise<import('./attribution').AttributionResource|null>}
     */
    async getSubscriptionCreatedAttribution(subscriptionId) {
        const subscriptionCreatedEvent = await this.models.SubscriptionCreatedEvent.findOne({subscription_id: subscriptionId}, {require: false});
        if (!subscriptionCreatedEvent || !subscriptionCreatedEvent.get('attribution_type')) {
            return null;
        }
        const attribution = this.attributionBuilder.build({
            id: subscriptionCreatedEvent.get('attribution_id'),
            url: subscriptionCreatedEvent.get('attribution_url'),
            type: subscriptionCreatedEvent.get('attribution_type')
        });
        return await attribution.getResource();
    }
}

module.exports = MemberAttributionService;
