import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { RedisPresenceStore } from '../../../../core/server/services/editor-presence/redis-presence-store';

const config = require('../../../../core/shared/config');
const RedisCache = require('../../../../core/server/adapters/lib/redis/AdapterCacheRedis');

// Skipped unless the integration globalSetup found Redis (vitest-globalsetup-services.ts).
describe.skipIf(process.env.GHOST_TEST_REDIS_AVAILABLE !== '1')(
  'Integration: RedisPresenceStore',
  function () {
    let cache: { redisClient: any; rawKeyPrefix: string };
    let store: RedisPresenceStore;

    beforeEach(function () {
      cache = new RedisCache({
        host: config.get('adapters:Redis:host'),
        port: config.get('adapters:Redis:port'),
        keyPrefix: `test:${crypto.randomBytes(6).toString('hex')}:presence:`,
        storeConfig: { retryStrategy: false },
        reuseConnection: false,
      });
      store = new RedisPresenceStore({
        client: cache.redisClient,
        key: `${cache.rawKeyPrefix}active`,
      });
    });

    afterEach(async function () {
      await cache.redisClient.del(store.key);
      await cache.redisClient.quit();
    });

    it('stores heartbeats as scores, trims by retention and expires the key', async function () {
      const now = 1_700_000_000_000;
      await store.touch('post:a:u1', now - 70_000, 60_000);
      await store.touch('post:a:u2', now, 60_000);

      assert.deepEqual(await store.read(now - 60_000), [{ member: 'post:a:u2', ts: now }]);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u2', ts: now }]);

      const ttl = await cache.redisClient.pttl(store.key);
      assert.ok(ttl > 0 && ttl <= 60_000, `expected a TTL within 60s, got ${ttl}`);

      await store.remove('post:a:u2');
      assert.deepEqual(await store.read(0), []);
    });
  },
);
