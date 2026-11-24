import { defineService } from '#support/define-service';
import {
  BlogIcon,
  ExternalRequest,
  Logging,
  SettingsCache,
  UrlService,
  UrlUtils,
} from '../../../../shared/transition/legacy';
import type { SlackPingService } from './slack-ping.service';

export const SlackPing = defineService({
  name: 'apps/slack-ping',
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
    const implementation: typeof import('./slack-ping.service') = require('./slack-ping.service');
    return new implementation.SlackPingService(needs);
  },
});
