import { defineService } from '../../../kernel/define-service';
import { ContentCheckService } from './content-check-service';

export default defineService('Content Check', {
  create: () =>
    new ContentCheckService({
      config: require('../../../shared/config'),
      logging: require('@tryghost/logging'),
      request: require('@tryghost/request'),
      urlUtils: require('../../../shared/url-utils').default,
      events: require('../../lib/common/events'),
    }),
  start: (service) => service.subscribeEvents(),
  stop: (service) => service.unsubscribeEvents(),
});
