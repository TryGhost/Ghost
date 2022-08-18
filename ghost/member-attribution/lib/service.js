const MemberAttributionEventHandler = require('./event-handler');
const DomainEvents = require('@tryghost/domain-events');
const UrlTranslator = require('./url-translator');
const AttributionBuilder = require('./attribution');
const UrlHistory = require('./history');

class MemberAttributionService {
    constructor({MemberCreatedEvent, SubscriptionCreatedEvent, urlService, labsService}) {
        const eventHandler = new MemberAttributionEventHandler({MemberCreatedEvent, SubscriptionCreatedEvent, DomainEvents, labsService});
        eventHandler.subscribe();

        const urlTranslator = new UrlTranslator({urlService});
        this.attributionBuilder = new AttributionBuilder({urlTranslator});
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
}

module.exports = MemberAttributionService;
