import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import config from '../../../../core/shared/config';
import RedisCache from '../../../../core/server/adapters/lib/redis/AdapterCacheRedis';
import { EditorPresenceService } from '../../../../core/server/services/editor-presence/editor-presence-service';
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

    const WINDOW = 150_000;
    const at = (now: number) => ({ now, since: now - WINDOW, retentionMs: 60_000 });
    const A1 = 'post:a:u1:t';
    const A2 = 'post:a:u2:t';

    it('holds, takes and gives up a document, and expires the key', async function () {
      assert.deepEqual(await store.hold(A1, at(1_000)), [A1]);
      assert.deepEqual(await store.hold(A2, at(2_000)), [A1]);
      assert.deepEqual(await store.hold(A1, at(3_000)), [A1]);

      const ttl = await cache.redisClient.pttl(store.leaseKey);
      assert.ok(ttl > 0 && ttl <= 60_000, `expected a TTL within 60s, got ${ttl}`);

      assert.deepEqual(await store.hold(A2, at(4_000), true), [A2]);
      assert.deepEqual(await store.hold(A1, at(5_000)), [A2]);
      // The tab it was taken from lets go of nothing that is no longer its own.
      await store.release(A1);
      assert.deepEqual(await store.holders(0), [A2]);

      await store.touch(A2, 5_000, 60_000);
      await store.remove(A2);
      assert.deepEqual(await store.holders(0), []);
      assert.deepEqual(await store.read(0), []);
      // The lock went by its number, which only works if Redis kept that number exactly.
      assert.equal(await cache.redisClient.zcard(store.leaseKey), 0);
    });

    it('frees a document whose holder stopped asking, and never keeps it for a heartbeat', async function () {
      await store.hold(A1, at(0));
      await store.touch(A1, 151_000, WINDOW);
      assert.deepEqual(await store.holders(151_000 - WINDOW), []);

      assert.deepEqual(await store.hold(A2, at(151_000)), [A2]);
      // The lapsed claim and its lock went as the new ones were made.
      assert.equal(await cache.redisClient.zcard(store.leaseKey), 2);
      assert.deepEqual(await store.hold(A1, at(152_000)), [A2]);
    });

    it('tells exactly one of the tabs that ask for a document together that it is theirs', async function () {
      const service = new EditorPresenceService({ store });
      // Highest id first, so the first to ask is the last that sorting by name would pick.
      const users = Array.from({ length: 12 }, (_, index) => (11 - index).toString(16).repeat(24));
      for (const post of ['a', 'b', 'c', 'd', 'e'].map((digit) => digit.repeat(24))) {
        const poll = (userId: string) =>
          service.poll(userId, {
            editing: { id: post, type: 'post' },
            tab: `tab-${userId.slice(0, 8)}`,
            lease: 'hold',
          });
        const together = await Promise.all(users.map(poll));
        const told = together.filter((answer) => answer.lease?.mine);
        assert.equal(told.length, 1, `${told.length} tabs were told they hold ${post}`);
        // The others are told who, in the same answer.
        assert.deepEqual(
          [...new Set(together.map((answer) => answer.lease?.userId))],
          [told[0].lease?.userId],
        );

        const next = await Promise.all(users.map(poll));
        assert.deepEqual(
          next.map((answer) => answer.lease),
          together.map((answer) => answer.lease),
        );
      }
    });
  },
);
