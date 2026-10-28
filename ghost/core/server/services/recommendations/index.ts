const RecommendationServiceWrapper = require('./recommendation-service-wrapper');

// Boot calls init() on this instance, which composes the recommendations graph
// from these shared modules at that time and reads config and settings live.
export default new RecommendationServiceWrapper({
  config: require('../../../shared/config'),
  logging: require('@tryghost/logging'),
  sentry: require('../../../shared/sentry'),
  urlUtils: require('../../../shared/url-utils').default,
  models: require('../../models'),
  mail: require('../../lib/mail'),
  externalRequest: require('../../lib/request-external'),
  DomainEvents: require('@tryghost/domain-events'),
  MentionCreatedEvent: require('../mentions/mention-created-event'),
  mentions: require('../mentions').default,
  oembedService: require('../oembed'),
  settings: require('../settings'),
  staffService: require('../staff'),
});
