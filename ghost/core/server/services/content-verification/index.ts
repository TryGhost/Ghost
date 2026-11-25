import { defineService } from '../../../kernel/define-service';
import { ContentVerificationService } from './content-verification-service';

// Boot must initialize this root after config and the shared event bus are ready.
export default defineService('Content Verification', {
  create: () =>
    new ContentVerificationService({
      config: require('../../../shared/config'),
      logging: require('@tryghost/logging'),
      request: require('@tryghost/request'),
      urlUtils: require('../../../shared/url-utils').default,
      events: require('../../lib/common/events'),
    }),
  start: (service) => service.subscribeEvents(),
  // Also removes the listeners of a partial subscription when start fails.
  stop: (service) => service.unsubscribeEvents(),
});
