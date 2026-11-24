import { defineProvider, listen } from '#support/define-provider';
import { defineService } from '#support/define-service';
import {
  BlogIcon,
  ExternalRequest,
  LegacyEvents,
  Logging,
  SettingsCache,
  UrlService,
  UrlUtils,
} from '../../../../shared/transition/legacy';
import type { SlackPingService } from './slack-ping-service';

export const SlackPing = defineService({
  name: 'slack-ping',
  lifetime: 'site',
  needs: {
    blogIcon: BlogIcon,
    logging: Logging,
    request: ExternalRequest,
    settingsCache: SettingsCache,
    urlService: UrlService,
    urlUtils: UrlUtils,
  },
  create: (needs): SlackPingService => {
    const service: typeof import('./slack-ping-service') = require('./slack-ping-service');
    return new service.SlackPingService(needs);
  },
});

export default defineProvider({
  name: 'slack-ping',
  services: [SlackPing],
  listeners: [
    listen({
      bus: LegacyEvents,
      event: 'post.published',
      service: SlackPing,
      handle: (slackPing, model, options) => slackPing.handlePostEvent(model, options),
    }),
    // The Admin API's "send test notification" emits this, to avoid a circular dependency.
    listen({
      bus: LegacyEvents,
      event: 'slack.test',
      service: SlackPing,
      handle: (slackPing) => slackPing.handleTestEvent(),
    }),
  ],
});
