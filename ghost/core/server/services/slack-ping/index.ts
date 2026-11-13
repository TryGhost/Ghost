import { defineService } from '../../../kernel/define-service';
import { SlackPingService } from './slack-ping-service';

export default defineService('Slack ping', {
  create: () =>
    new SlackPingService({
      blogIcon: require('../../lib/image').blogIcon,
      events: require('../../lib/common/events'),
      logging: require('@tryghost/logging'),
      request: require('../../lib/request-external'),
      settingsCache: require('../../../shared/settings-cache'),
      urlService: require('../url'),
      urlUtils: require('../../../shared/url-utils').default,
    }),
  start: (service) => service.subscribeEvents(),
  // Also removes the listeners of a partial subscription when start fails.
  stop: (service) => service.unsubscribeEvents(),
});
