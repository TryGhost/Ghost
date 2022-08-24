const urlService = require('../url');
const labsService = require('../../../shared/labs');
const DomainEvents = require('@tryghost/domain-events');
const urlUtils = require('../../../shared/url-utils');

class MemberAttributionServiceWrapper {
    init() {
        if (this.eventHandler) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        // Wire up all the dependencies
        const {MemberAttributionService, UrlTranslator, AttributionBuilder, EventHandler} = require('@tryghost/member-attribution');
        const models = require('../../models');

        const urlTranslator = new UrlTranslator({
            urlService, 
            urlUtils,
            models: {
                Post: models.Post, 
                User: models.User, 
                Tag: models.Tag
            }
        });

        this.attributionBuilder = new AttributionBuilder({urlTranslator});

        // Expose the service
        this.service = new MemberAttributionService({
            models: {
                MemberCreatedEvent: models.MemberCreatedEvent,
                SubscriptionCreatedEvent: models.SubscriptionCreatedEvent
            },
            attributionBuilder: this.attributionBuilder,
            labsService
        });

        // Listen for events and store them in the database
        this.eventHandler = new EventHandler({
            models: {
                MemberCreatedEvent: models.MemberCreatedEvent,
                SubscriptionCreatedEvent: models.SubscriptionCreatedEvent
            }, 
            DomainEvents, 
            labsService
        });
        this.eventHandler.subscribe();
    }
}

module.exports = new MemberAttributionServiceWrapper();
