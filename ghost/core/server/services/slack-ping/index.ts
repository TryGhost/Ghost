import { defineService, legacyEvent } from '../../../../bootstrap/transition/define-service';
import { SlackPingService } from './slack-ping-service';

type PostEvent = Parameters<SlackPingService['handlePostEvent']>;

export default defineService('Slack ping', {
  create: () =>
    new SlackPingService({
      blogIcon: require('../../lib/image').blogIcon,
      logging: require('@tryghost/logging'),
      request: require('../../lib/request-external'),
      settingsCache: require('../../../shared/settings-cache'),
      urlService: require('../url'),
      urlUtils: require('../../../shared/url-utils').default,
    }),
  listeners: [
    {
      event: legacyEvent('post.published'),
      handle: (service, ...event: PostEvent) => service.handlePostEvent(...event),
    },
    // Fired by the Admin API to check the webhook configuration. It is an event and not a direct
    // call, which was done long ago to avoid circular dependencies.
    { event: legacyEvent('slack.test'), handle: (service) => service.handleTestEvent() },
  ],
});
