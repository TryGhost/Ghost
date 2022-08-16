const {MemberCreatedEvent, SubscriptionCreatedEvent} = require('@tryghost/member-events');

class MemberAttributionEventHandler {
    constructor({MemberCreatedEvent: MemberCreatedEventModel, SubscriptionCreatedEvent: SubscriptionCreatedEventModel, DomainEvents}) {
        this._MemberCreatedEventModel = MemberCreatedEventModel;
        this._SubscriptionCreatedEvent = SubscriptionCreatedEventModel;
        this.DomainEvents = DomainEvents;
    }

    subscribe() {
        this.DomainEvents.subscribe(MemberCreatedEvent, async (event) => {
            const attribution = event.data.attribution;

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
            const attribution = event.data.attribution;

            await this._SubscriptionCreatedEvent.add({
                member_id: event.data.memberId,
                subscription_id: event.data.subscriptionId,
                created_at: event.timestamp,
                attribution_id: attribution?.id ?? null,
                attribution_url: attribution?.url ?? null,
                attribution_type: attribution?.type ?? null,
                source: event.data.source
            });
        });
    }
}

module.exports = MemberAttributionEventHandler;
