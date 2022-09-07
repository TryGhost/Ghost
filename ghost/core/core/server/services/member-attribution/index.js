const urlService = require('../url');
const urlUtils = require('../../../shared/url-utils');

class MemberAttributionServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {MemberAttributionService, UrlTranslator, AttributionBuilder} = require('@tryghost/member-attribution');
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
            attributionBuilder: this.attributionBuilder
        });
    }
}

module.exports = new MemberAttributionServiceWrapper();
