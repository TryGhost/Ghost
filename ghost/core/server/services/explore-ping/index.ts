import { isLocalhost } from '@tryghost/app-contracts/manifest';
import { defineService } from '../../../kernel/define-service';
import { ExplorePingService } from './explore-ping-service';

export default defineService('Explore ping', () => {
  const config = require('../../../shared/config');
  const service = new ExplorePingService({
    settingsCache: require('../../../shared/settings-cache'),
    config,
    logging: require('@tryghost/logging'),
    request: require('@tryghost/request'),
    posts: require('../posts/posts-service-instance')(),
    members: require('../members'),
    statsService: require('../stats').default.service,
  });

  // The explore ping is a background "phone home" request. It should not run
  // in the test environment (cf. the update-check service, which gates on the
  // same environments), where there is no explore URL configured, or for local
  // site URLs, which Explore rejects.
  // The final intention is to have this run on a schedule. For the initial
  // version, ping when the server starts, without waiting for the response.
  if (config.isProductionOrDevelopment() && !isLocalhost(new URL(config.get('url')).hostname)) {
    service.ping();
  }

  return service;
});
