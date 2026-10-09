import { defineService } from '../../lib/define-service';
import { IndexNowPingService } from './indexnow-ping-service';

export default defineService('IndexNow', () => {
  const service = new IndexNowPingService({
    settingsCache: require('../../../shared/settings-cache'),
    config: require('../../../shared/config'),
    urlService: require('../url'),
    urlUtils: require('../../../shared/url-utils').default,
    request: require('@tryghost/request'),
    logging: require('@tryghost/logging'),
    events: require('../../lib/common/events'),
  });

  try {
    service.subscribeEvents();
  } catch (error) {
    service.unsubscribeEvents();
    throw error;
  }
  return service;
});
