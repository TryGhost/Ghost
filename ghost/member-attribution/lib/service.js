const MemberAttributionEventHandler = require('./event-handler');
const DomainEvents = require('@tryghost/domain-events');

class MemberAttributionService {
    constructor({MemberCreatedEvent, SubscriptionCreatedEvent}) {
        const eventHandler = new MemberAttributionEventHandler({MemberCreatedEvent, SubscriptionCreatedEvent, DomainEvents});
        eventHandler.subscribe();
    }
}

module.exports = MemberAttributionService;
