const urlService = require('../url');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const config = require('../../../shared/config');

class MemberAttributionServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {
            MemberAttributionService, UrlTranslator, ReferrerTranslator, AttributionBuilder, OutboundLinkTagger
        } = require('@tryghost/member-attribution');
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

        const referrerTranslator = new ReferrerTranslator({
            siteUrl: urlUtils.urlFor('home', true),
            adminUrl: urlUtils.urlFor('admin', true)
        });

        this.attributionBuilder = new AttributionBuilder({urlTranslator, referrerTranslator});

        this.outboundLinkTagger = new OutboundLinkTagger({
            isEnabled: () => !labs.isSet('outboundLinkTagging') || !!settingsCache.get('outbound_link_tagging'),
            getSiteUrl: () => config.getSiteUrl(),
            urlUtils
        });

        // Expose the service
        this.service = new MemberAttributionService({
            models: {
                MemberCreatedEvent: models.MemberCreatedEvent,
                SubscriptionCreatedEvent: models.SubscriptionCreatedEvent,
                Integration: models.Integration
            },
            attributionBuilder: this.attributionBuilder,
            getTrackingEnabled: () => !!settingsCache.get('members_track_sources')
        });
    }
}

module.exports = new MemberAttributionServiceWrapper();
