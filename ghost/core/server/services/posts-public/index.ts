import { z } from 'zod';
import type { CacheBase } from '@tryghost/adapter-base-cache';
import { defineService } from '../../../kernel/define-service';

export default defineService('Posts Public', () => {
  const adapterManager = require('../adapter-manager').default;
  const config = require('../../../shared/config');
  const events = require('../../lib/common/events');

  const cacheEnabled = z.coerce
    .boolean()
    .parse(config.get('hostSettings:postsPublicCache:enabled'));
  const cache: CacheBase | undefined = cacheEnabled
    ? adapterManager.getAdapter('cache:postsPublic')
    : undefined;

  if (cache) {
    events.on('site.changed', () => {
      cache.reset();
    });
  }

  return { cache };
});
