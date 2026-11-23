import { isLocalhost } from '@tryghost/app-contracts/manifest';
import { defineService } from '../../../../bootstrap/transition/define-service';
import stats from '../stats';
import { ExplorePingService } from './explore-ping-service';

export default defineService('Explore ping', {
  needs: { stats },
  create: ({ stats: statsService }) =>
    new ExplorePingService({
      settingsCache: require('../../../shared/settings-cache'),
      config: require('../../../shared/config'),
      logging: require('@tryghost/logging'),
      request: require('@tryghost/request'),
      posts: require('../posts/posts-service-instance')(),
      members: require('../members'),
      statsService,
    }),
  // The explore ping is a background "phone home" request, so it is work with no request behind
  // it. It should not run in the test environment (cf. the update-check service, which gates on
  // the same environments), where there is no explore URL configured, or for local site URLs,
  // which Explore rejects.
  // The final intention is to have this run on a schedule. For the initial version, ping when
  // the service is started, without waiting for the response.
  start(service) {
    const config = require('../../../shared/config');
    if (config.isProductionOrDevelopment() && !isLocalhost(new URL(config.get('url')).hostname)) {
      service.ping();
    }
  },
});
