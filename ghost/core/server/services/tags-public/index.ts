import { z } from 'zod';
import type { CacheBase } from '@tryghost/adapter-base-cache';
import { defineService, legacyEvent } from '../../../../bootstrap/transition/define-service';

export default defineService('Tags Public', {
  create: () => {
    const adapterManager = require('../adapter-manager').default;
    const config = require('../../../shared/config');

    const cacheEnabled = z.coerce
      .boolean()
      .parse(config.get('hostSettings:tagsPublicCache:enabled'));
    const cache: CacheBase | undefined = cacheEnabled
      ? adapterManager.getAdapter('cache:tagsPublic')
      : undefined;

    return { cache };
  },
  // The cache holds responses built from the whole site, so any change to the site empties it.
  listeners: [{ event: legacyEvent('site.changed'), handle: ({ cache }) => cache?.reset() }],
});
