import { isLocalhost } from '@tryghost/app-contracts/manifest';
import { defineService } from '@tryghost/kernel/define-service';
import stats from '../stats';
import { ExplorePingService } from './explore-ping-service';

// Nothing reads this service. It exists for its start, which is work of the
// worker role: boot builds and starts it from the services list.
export default defineService({
  name: 'Explore ping',
  // Stats still holds its own instance, which boot starts earlier in the list.
  needs: { stats },
  create: ({ foundation, stats: statsService }) =>
    new ExplorePingService({
      settingsCache: require('../../../shared/settings-cache'),
      config: foundation.config,
      logging: foundation.logging,
      request: require('@tryghost/request'),
      posts: require('../posts/posts-service-instance')(),
      members: require('../members'),
      statsService,
    }),
  // The explore ping is a background "phone home" request. It should not run
  // in the test environment (cf. the update-check service, which gates on the
  // same environments), where there is no explore URL configured, or for local
  // site URLs, which Explore rejects.
  // The final intention is to have this run on a schedule. For the initial
  // version, ping when the server starts, without waiting for the response.
  start: (service, { foundation: { config } }) => {
    const env = config.get('env');
    if (
      (env === 'production' || env === 'development') &&
      !isLocalhost(new URL(String(config.get('url'))).hostname)
    ) {
      service.ping();
    }
  },
});
