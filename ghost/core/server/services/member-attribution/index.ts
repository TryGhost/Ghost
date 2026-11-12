import { defineService } from '../../../kernel/define-service';

const urlService = require('../url');
const urlUtils = require('../../../shared/url-utils').default;
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');

export default defineService('Member attribution', () => {
  // Wire up all the dependencies
  const MemberAttributionService = require('./member-attribution-service');
  const UrlTranslator = require('./url-translator');
  const ReferrerTranslator = require('./referrer-translator');
  const AttributionBuilder = require('./attribution-builder');
  const OutboundLinkTagger = require('./outbound-link-tagger');
  const models = require('../../models');

  const urlTranslator = new UrlTranslator({
    urlService,
    urlUtils,
    models: {
      Post: models.Post,
      User: models.User,
      Tag: models.Tag,
    },
  });

  const referrerTranslator = new ReferrerTranslator({
    siteUrl: urlUtils.urlFor('home', true),
    adminUrl: urlUtils.urlFor('admin', true),
  });

  const attributionBuilder = new AttributionBuilder({ urlTranslator, referrerTranslator });

  const outboundLinkTagger = new OutboundLinkTagger({
    isEnabled: () => !!settingsCache.get('outbound_link_tagging'),
    getSiteUrl: () => config.getSiteUrl(),
    urlUtils,
  });

  return new MemberAttributionService({
    models: {
      MemberCreatedEvent: models.MemberCreatedEvent,
      SubscriptionCreatedEvent: models.SubscriptionCreatedEvent,
      Integration: models.Integration,
    },
    attributionBuilder,
    outboundLinkTagger,
    getTrackingEnabled: () => !!settingsCache.get('members_track_sources'),
  });
});
