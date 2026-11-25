import { defineService } from '../../../kernel/define-service';
import { IndexNowPingService } from './indexnow-ping-service';

export default defineService('IndexNow', {
  create: () =>
    new IndexNowPingService({
      settingsCache: require('../../../shared/settings-cache'),
      config: require('../../../shared/config'),
      urlService: require('../url'),
      urlUtils: require('../../../shared/url-utils').default,
      request: require('@tryghost/request'),
      logging: require('@tryghost/logging'),
      events: require('../../lib/common/events'),
    }),
  start: (service) => service.subscribeEvents(),
  // Also removes the listeners of a partial subscription when start fails.
  stop: (service) => service.unsubscribeEvents(),
});
