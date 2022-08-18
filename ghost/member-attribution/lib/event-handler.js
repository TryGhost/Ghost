const {MemberCreatedEvent, SubscriptionCreatedEvent} = require('@tryghost/member-events');

class MemberAttributionEventHandler {
    constructor({MemberCreatedEvent: MemberCreatedEventModel, SubscriptionCreatedEvent: SubscriptionCreatedEventModel, DomainEvents, labsService}) {
        this._MemberCreatedEventModel = MemberCreatedEventModel;
        this._SubscriptionCreatedEvent = SubscriptionCreatedEventModel;
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

            await this._MemberCreatedEventModel.add({
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

            await this._SubscriptionCreatedEvent.add({
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
