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
    const inOrder = async (since: number) =>
      (await store.claims(since)).sort((x, y) => x.order - y.order).map((claim) => claim.member);

    it('queues first come, first served, moves a member and expires the key', async function () {
      assert.equal((await store.claim('post:a:u2:t', at(1_000))).joined, true);
      await store.claim('post:a:u1:t', at(1_000));
      assert.equal((await store.claim('post:a:u2:t', at(2_000))).joined, false);
      assert.deepEqual(await inOrder(0), ['post:a:u2:t', 'post:a:u1:t']);

      const ttl = await cache.redisClient.pttl(store.leaseKey);
      assert.ok(ttl > 0 && ttl <= 60_000, `expected a TTL within 60s, got ${ttl}`);

      await store.claim('post:a:u1:t', at(3_000), 'front');
      assert.deepEqual(await inOrder(0), ['post:a:u1:t', 'post:a:u2:t']);
      await store.claim('post:a:u1:t', at(3_000), 'back');
      assert.deepEqual(await inOrder(0), ['post:a:u2:t', 'post:a:u1:t']);
      assert.equal(await cache.redisClient.zcard(store.leaseKey), 2);

      await store.release('post:a:u2:t');
      await store.touch('post:a:u1:t', 5_000, 60_000);
      await store.remove('post:a:u1:t');
      assert.deepEqual(await store.claims(0), []);
      assert.deepEqual(await store.read(0), []);
    });

    it('renews a place only where it still is, and drops the ones that lapsed', async function () {
      await store.claim('post:a:u1:t', at(0));
      await store.claim('post:a:u2:t', at(100_000));
      // A heartbeat is not a renewal.
      await store.touch('post:a:u1:t', 151_000, WINDOW);
      assert.deepEqual(await inOrder(151_000 - WINDOW), ['post:a:u2:t']);

      const kept = await store.claim('post:a:u2:t', at(151_000));
      assert.equal(kept.joined, false);
      assert.equal(await cache.redisClient.zcard(store.leaseKey), 1);

      const back = await store.claim('post:a:u1:t', at(152_000));
      assert.equal(back.joined, true);
      assert.deepEqual(await inOrder(0), ['post:a:u2:t', 'post:a:u1:t']);
      assert.equal(await cache.redisClient.zscore(store.leaseKey, 'post:a:u2:t:2'), '151000');
    });

    it('tells at most one of the tabs that join a document together that it is theirs', async function () {
      const service = new EditorPresenceService({ store });
      // Highest id first, so the first to join is the last a tie on names would pick.
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
        assert.ok(told.length <= 1, `${told.length} tabs were told they hold ${post}`);

        // On their next polls they agree on one of them, the one told so if any was.
        const settled = await Promise.all(users.map(poll));
        const holders = new Set(settled.map((answer) => answer.lease?.userId));
        assert.equal(holders.size, 1);
        assert.equal(settled.filter((answer) => answer.lease?.mine).length, 1);
        if (told.length === 1) {
          assert.deepEqual([...holders], [told[0].lease?.userId]);
        }
      }
    });
  },
);
