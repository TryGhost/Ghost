import { defineService } from '../../../kernel/define-service';
import { SlackPingService } from './slack-ping-service';

export default defineService('Slack ping', () => {
  const service = new SlackPingService({
    blogIcon: require('../../lib/image').blogIcon,
    events: require('../../lib/common/events'),
    logging: require('@tryghost/logging'),
    request: require('../../lib/request-external'),
    settingsCache: require('../../../shared/settings-cache'),
    urlService: require('../url'),
    urlUtils: require('../../../shared/url-utils').default,
  });

  try {
    service.subscribeEvents();
  } catch (error) {
    service.unsubscribeEvents();
    throw error;
  }
  return service;
});
