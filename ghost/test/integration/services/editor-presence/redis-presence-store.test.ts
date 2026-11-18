import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import config from '../../../../core/shared/config';
import RedisCache from '../../../../core/server/adapters/lib/redis/AdapterCacheRedis';
import { RedisPresenceStore } from '../../../../core/server/services/editor-presence/redis-presence-store';

// Skipped unless the integration globalSetup found Redis (vitest-globalsetup-services.ts).
describe.skipIf(process.env.GHOST_TEST_REDIS_AVAILABLE !== '1')(
  'Integration: RedisPresenceStore',
  function () {
    let cache: { redisClient: any; rawKeyPrefix: string };
    let store: RedisPresenceStore;

    beforeEach(function () {
      // The adapter types its client for cache commands only; the store uses the raw ioredis one.
      cache = new RedisCache({
        host: config.get('adapters:Redis:host'),
        port: config.get('adapters:Redis:port'),
        keyPrefix: `test:${crypto.randomBytes(6).toString('hex')}:presence:`,
        storeConfig: { retryStrategy: false },
        reuseConnection: false,
      }) as unknown as { redisClient: any; rawKeyPrefix: string };
      store = new RedisPresenceStore({
        client: cache.redisClient,
        key: `${cache.rawKeyPrefix}active`,
        leaseKey: `${cache.rawKeyPrefix}leases`,
      });
    });

    afterEach(async function () {
      await cache.redisClient.del(store.key, store.leaseKey);
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

    it('queues first come, first served, moves a member on replace and expires the key', async function () {
      await store.claim('post:a:u1', 1_000, 60_000);
      await store.claim('post:a:u2', 2_000, 60_000);
      assert.deepEqual(await store.claim('post:a:u1', 3_000, 60_000), [
        { member: 'post:a:u1', order: 1_000 },
        { member: 'post:a:u2', order: 2_000 },
      ]);

      const ttl = await cache.redisClient.pttl(store.leaseKey);
      assert.ok(ttl > 0 && ttl <= 60_000, `expected a TTL within 60s, got ${ttl}`);

      assert.deepEqual(await store.claim('post:a:u2', 999, 60_000, true), [
        { member: 'post:a:u2', order: 999 },
        { member: 'post:a:u1', order: 1_000 },
      ]);

      await store.release(['post:a:u2']);
      await store.touch('post:a:u1', 5_000, 60_000);
      await store.remove('post:a:u1');
      assert.deepEqual(await store.claims(), []);
      assert.deepEqual(await store.read(0), []);
    });
  },
);
