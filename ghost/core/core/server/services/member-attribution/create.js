const MemberAttributionService = require('./member-attribution-service');
const UrlTranslator = require('./url-translator');
const ReferrerTranslator = require('./referrer-translator');
const AttributionBuilder = require('./attribution-builder');
const OutboundLinkTagger = require('./outbound-link-tagger');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.urlUtils
 * @param {object} deps.settingsCache
 * @param {object} deps.urlService
 */
module.exports = function createMemberAttributionService({models, urlUtils, settingsCache, urlService}) {
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

    const attributionBuilder = new AttributionBuilder({urlTranslator, referrerTranslator});

    const outboundLinkTagger = new OutboundLinkTagger({
        isEnabled: () => !!settingsCache.get('outbound_link_tagging'),
        getSiteUrl: () => urlUtils.urlFor('home', true),
        urlUtils
    });

    const service = new MemberAttributionService({
        models: {
            MemberCreatedEvent: models.MemberCreatedEvent,
            SubscriptionCreatedEvent: models.SubscriptionCreatedEvent,
            Integration: models.Integration
        },
        attributionBuilder,
        getTrackingEnabled: () => !!settingsCache.get('members_track_sources')
    });

    return {
        service,
        attributionBuilder,
        outboundLinkTagger,
        init() {}
    };
};
