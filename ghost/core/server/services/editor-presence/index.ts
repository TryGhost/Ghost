import { defineService } from '@tryghost/kernel/define-service';
import { EditorPresenceService, resolveRetentionMs } from './editor-presence-service';
import { MemoryPresenceStore } from './memory-presence-store';
import { RedisPresenceStore, type RedisPresenceClient } from './redis-presence-store';
import type { PresenceStore } from './presence-store';

export type { ActivePresence, PollResult } from './editor-presence-service';

interface RedisBackedCache {
  redisClient: RedisPresenceClient;
  rawKeyPrefix: string;
}

function isRedisBacked(cache: unknown): cache is RedisBackedCache {
  return (
    typeof cache === 'object' &&
    cache !== null &&
    'redisClient' in cache &&
    typeof (cache as { rawKeyPrefix?: unknown }).rawKeyPrefix === 'string'
  );
}

export default defineService('Editor Presence', () => {
  const adapterManager = require('../adapter-manager').default;
  const logging = require('@tryghost/logging');
  const metrics = require('@tryghost/metrics');

  const cache = adapterManager.getAdapter('cache:presence');
  // The adapter's `ttl` (seconds) sets how long a site's key may live.
  const retentionMs = resolveRetentionMs((cache as { ttl?: unknown }).ttl);
  // An empty prefix would leave a bare `active` key in a shared keyspace, so it gets a namespace.
  const key = `${isRedisBacked(cache) && cache.rawKeyPrefix ? cache.rawKeyPrefix : 'presence:'}active`;
  const store: PresenceStore = isRedisBacked(cache)
    ? new RedisPresenceStore({ client: cache.redisClient, key })
    : new MemoryPresenceStore();
  logging.info(
    `Editor presence using ${store.kind} store${store.kind === 'redis' ? ` at ${key}` : ''}, retention ${retentionMs / 1000}s`,
  );

  return new EditorPresenceService({
    store,
    metrics,
    retentionMs,
  });
});
