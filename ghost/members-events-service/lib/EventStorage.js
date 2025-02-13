const {MemberCreatedEvent, SubscriptionCreatedEvent, SubscriptionAttributionEvent} = require('@tryghost/member-events');

/**
 * Store events in the database
 */
class EventStorage {
    /**
     *
     * @param {Object} deps
     * @param {Object} deps.labsService
     * @param {Object} deps.models
     * @param {Object} deps.models.MemberCreatedEvent
     * @param {Object} deps.models.SubscriptionCreatedEvent
     */
    constructor({labsService, models}) {
        this.models = models;
        this.labsService = labsService;
    }

    /**
     * Subscribe to events of this domainEvents service
     * @param {Object} domainEvents The DomainEvents service
     */
    subscribe(domainEvents) {
        domainEvents.subscribe(MemberCreatedEvent, async (event) => {
            let attribution = event.data.attribution;

            await this.models.MemberCreatedEvent.add({
                member_id: event.data.memberId,
                created_at: event.timestamp,
                attribution_id: attribution?.id ?? null,
                attribution_url: attribution?.url ?? null,
                attribution_type: attribution?.type ?? null,
                source: event.data.source,
                referrer_source: attribution?.referrerSource ?? null,
                referrer_medium: attribution?.referrerMedium ?? null,
                referrer_url: attribution?.referrerUrl ?? null,
                batch_id: event.data.batchId ?? null
            });
        });

        domainEvents.subscribe(SubscriptionCreatedEvent, async (event) => {
            console.log('SubscriptionCreatedEvent > subscriptionId', event.data.subscriptionId);
            let attribution = event.data.attribution;

            await this.models.SubscriptionCreatedEvent.add({
                member_id: event.data.memberId,
                subscription_id: event.data.subscriptionId,
                created_at: event.timestamp,
                attribution_id: attribution?.id ?? null,
                attribution_url: attribution?.url ?? null,
                attribution_type: attribution?.type ?? null,
                referrer_source: attribution?.referrerSource ?? null,
                referrer_medium: attribution?.referrerMedium ?? null,
                referrer_url: attribution?.referrerUrl ?? null,
                batch_id: event.data.batchId ?? null
            });
        });

        domainEvents.subscribe(SubscriptionAttributionEvent, async (event) => {
            let attribution = event.data.attribution;

            const subscriptionCreatedEvent = await this.models.SubscriptionCreatedEvent
                .findOne({subscription_id: event.data.subscriptionId}, {require: false, withRelated: []});

            if (!subscriptionCreatedEvent) {
                return;
            }

            const original = subscriptionCreatedEvent.toJSON();
            await subscriptionCreatedEvent.save({
                attribution_id: attribution?.id ?? original.attribution_id,
                attribution_url: attribution?.url ?? original.attribution_url,
                attribution_type: attribution?.type ?? original.attribution_type,
                referrer_source: attribution?.referrerSource ?? original.referrer_source,
                referrer_medium: attribution?.referrerMedium ?? original.referrer_medium,
                referrer_url: attribution?.referrerUrl ?? original.referrer_url
            }, {patch: true});
        });
    }
}

module.exports = EventStorage;
