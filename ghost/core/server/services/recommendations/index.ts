import { defineService } from '../../../kernel/define-service';

// The wrapper composes its graph synchronously inside init(), reading config and
// the ready Mentions facade at that time, so boot must initialize Mentions first. Every
// construction failure precedes the detached refreshes, the mentions mapper and
// the event subscription, so a failed attempt leaves nothing to release.
export default defineService('Recommendations', () => {
  const RecommendationServiceWrapper = require('./recommendation-service-wrapper');
  const wrapper = new RecommendationServiceWrapper({
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
  wrapper.init();
  return wrapper;
});
