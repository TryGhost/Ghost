const {MemberCreatedEvent, SubscriptionCreatedEvent} = require('@tryghost/member-events');

class MemberAttributionEventHandler {
    /**
     * 
     * @param {Object} deps 
     * @param {Object} deps.DomainEvents
     * @param {Object} deps.labsService
     * @param {Object} deps.models
     * @param {Object} deps.models.MemberCreatedEvent
     * @param {Object} deps.models.SubscriptionCreatedEvent
     */
    constructor({DomainEvents, labsService, models}) {
        this.models = models;
        this.DomainEvents = DomainEvents;
        this.labsService = labsService;
    }

    subscribe() {
        this.DomainEvents.subscribe(MemberCreatedEvent, async (event) => {
            let attribution = event.data.attribution;

            if (!this.labsService.isSet('memberAttribution')){
                // Prevent storing attribution
                // Can replace this later with a privacy toggle
                attribution = {};
            }

            await this.models.MemberCreatedEvent.add({
                member_id: event.data.memberId,
                created_at: event.timestamp,
                attribution_id: attribution?.id ?? null,
                attribution_url: attribution?.url ?? null,
                attribution_type: attribution?.type ?? null,
                source: event.data.source
            });
        });

        this.DomainEvents.subscribe(SubscriptionCreatedEvent, async (event) => {
            let attribution = event.data.attribution;

            if (!this.labsService.isSet('memberAttribution')){
                // Prevent storing attribution
                // Can replace this later with a privacy toggle
                attribution = {};
            }

            await this.models.SubscriptionCreatedEvent.add({
                member_id: event.data.memberId,
                subscription_id: event.data.subscriptionId,
                created_at: event.timestamp,
                attribution_id: attribution?.id ?? null,
                attribution_url: attribution?.url ?? null,
                attribution_type: attribution?.type ?? null
            });
        });
    }
}

module.exports = MemberAttributionEventHandler;
