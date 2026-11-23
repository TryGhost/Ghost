import { defineService, legacyEvent } from '../../../../bootstrap/transition/define-service';
import { IndexNowPingService } from './indexnow-ping-service';

type PostEvent = Parameters<IndexNowPingService['handlePostEvent']>;

export default defineService('IndexNow', {
  create: () =>
    new IndexNowPingService({
      settingsCache: require('../../../shared/settings-cache'),
      config: require('../../../shared/config'),
      urlService: require('../url'),
      urlUtils: require('../../../shared/url-utils').default,
      request: require('@tryghost/request'),
      logging: require('@tryghost/logging'),
    }),
  // A post being published, and a published post being edited.
  listeners: [
    {
      event: legacyEvent('post.published'),
      handle: (service, ...event: PostEvent) => service.handlePostEvent(...event),
    },
    {
      event: legacyEvent('post.published.edited'),
      handle: (service, ...event: PostEvent) => service.handlePostEvent(...event),
    },
  ],
});
