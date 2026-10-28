import { defineService } from '../../../kernel/define-service';
import { EditorPresenceService } from './editor-presence-service';
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
  const store: PresenceStore = isRedisBacked(cache)
    ? new RedisPresenceStore({ client: cache.redisClient, key: `${cache.rawKeyPrefix}active` })
    : new MemoryPresenceStore();
  logging.info(`Editor presence using ${store.kind} store`);

  return new EditorPresenceService({
    store,
    metrics,
    rateLimit: { limit: 12, windowMs: 10_000 },
  });
});
