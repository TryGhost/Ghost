const {MemberCreatedEvent, SubscriptionCreatedEvent} = require('../../../shared/events');

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
                utm_source: attribution?.utmSource ?? null,
                utm_medium: attribution?.utmMedium ?? null,
                utm_campaign: attribution?.utmCampaign ?? null,
                utm_term: attribution?.utmTerm ?? null,
                utm_content: attribution?.utmContent ?? null,
                batch_id: event.data.batchId ?? null
            });
        });

        domainEvents.subscribe(SubscriptionCreatedEvent, async (event) => {
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
                utm_source: attribution?.utmSource ?? null,
                utm_medium: attribution?.utmMedium ?? null,
                utm_campaign: attribution?.utmCampaign ?? null,
                utm_term: attribution?.utmTerm ?? null,
                utm_content: attribution?.utmContent ?? null,
                batch_id: event.data.batchId ?? null
            });
        });
    }
}

module.exports = EventStorage;
