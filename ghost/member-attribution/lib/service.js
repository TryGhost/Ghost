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
        const history = UrlHistory.create(historyArray);
        return this.attributionBuilder.getAttribution(history);
    }

    /**
     * Returns the attribution resource for a given event model (MemberCreatedEvent / SubscriptionCreatedEvent), where the model has the required relations already loaded
     * You need to already load the 'postAttribution', 'userAttribution', and 'tagAttribution' relations
     * @param {Object} eventModel MemberCreatedEvent or SubscriptionCreatedEvent
     * @returns {import('./attribution').AttributionResource|null}
     */
    getEventAttribution(eventModel) {
        if (eventModel.get('attribution_type') === null) {
            return null;
        }

        const _attribution = this.attributionBuilder.build({
            id: eventModel.get('attribution_id'),
            url: eventModel.get('attribution_url'),
            type: eventModel.get('attribution_type')
        });

        if (_attribution.type !== 'url') {
            // Find the right relation to use to fetch the resource
            const tryRelations = [
                eventModel.related('postAttribution'),
                eventModel.related('userAttribution'),
                eventModel.related('tagAttribution')
            ];
            for (const relation of tryRelations) {
                if (relation && relation.id) {
                    // We need to check the ID, because .related() always returs a model when eager loaded, even when the relation didn't exist
                    return _attribution.getResource(relation);
                }
            }
        }
        return _attribution.getResource(null);
    }

    /**
     * Returns the parsed attribution for a member creation event
     * @param {string} memberId
     * @returns {Promise<import('./attribution').AttributionResource|null>}
     */
    async getMemberCreatedAttribution(memberId) {
        const memberCreatedEvent = await this.models.MemberCreatedEvent.findOne({member_id: memberId}, {require: false, withRelated: []});
        if (!memberCreatedEvent || !memberCreatedEvent.get('attribution_type')) {
            return null;
        }
        const attribution = this.attributionBuilder.build({
            id: memberCreatedEvent.get('attribution_id'),
            url: memberCreatedEvent.get('attribution_url'),
            type: memberCreatedEvent.get('attribution_type')
        });
        return await attribution.fetchResource();
    }

    /**
     * Returns the last attribution for a given subscription ID
     * @param {string} subscriptionId
     * @returns {Promise<import('./attribution').AttributionResource|null>}
     */
    async getSubscriptionCreatedAttribution(subscriptionId) {
        const subscriptionCreatedEvent = await this.models.SubscriptionCreatedEvent.findOne({subscription_id: subscriptionId}, {require: false, withRelated: []});
        if (!subscriptionCreatedEvent || !subscriptionCreatedEvent.get('attribution_type')) {
            return null;
        }
        const attribution = this.attributionBuilder.build({
            id: subscriptionCreatedEvent.get('attribution_id'),
            url: subscriptionCreatedEvent.get('attribution_url'),
            type: subscriptionCreatedEvent.get('attribution_type')
        });
        return await attribution.fetchResource();
    }
}

module.exports = MemberAttributionService;
