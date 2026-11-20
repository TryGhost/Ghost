import { z } from 'zod';
import type { CacheBase } from '@tryghost/adapter-base-cache';
import { defineService } from '@tryghost/kernel/define-service';
import { alias } from '../../../shared/service-alias';
import { legacyEvent } from '../../lib/common/legacy-event';

// Built the first time an endpoint reads its cache, or when the site first changes.
export default alias(
  defineService({
    name: 'Tags Public',
    create: ({ foundation }) => {
      // The adapter manager is not something a definition can be handed yet.
      const adapterManager = require('../adapter-manager').default;

      const cacheEnabled = z.coerce
        .boolean()
        .parse(foundation.config.get('hostSettings:tagsPublicCache:enabled'));
      const cache: CacheBase | undefined = cacheEnabled
        ? adapterManager.getAdapter('cache:tagsPublic')
        : undefined;

      return { cache };
    },
    listeners: [{ event: legacyEvent('site.changed'), handle: ({ cache }) => cache?.reset() }],
  }),
);
