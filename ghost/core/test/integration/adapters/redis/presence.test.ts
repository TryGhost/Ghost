import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { PostPresenceService } from '../../../../core/server/services/post-presence/post-presence-service';
// @ts-expect-error Legacy cache adapter.
import RedisCache from '../../../../core/server/adapters/lib/redis/AdapterCacheRedis';

describe.skipIf(process.env.GHOST_TEST_REDIS_AVAILABLE !== '1')(
  'Redis presence across replicas',
  () => {
    const caches: InstanceType<typeof RedisCache>[] = [];
    afterEach(async () => {
      for (const cache of caches.splice(0)) {
        await cache.redisClient.quit();
      }
    });
    function replica(prefix: string) {
      const cache = new RedisCache({
        host: process.env.adapters__Redis__host || '127.0.0.1',
        port: Number(process.env.adapters__Redis__port || 6379),
        keyPrefix: prefix,
        reuseConnection: false,
        storeConfig: { retryStrategy: false },
      });
      caches.push(cache);
      return cache;
    }
    it('preserves concurrent writers, tenant isolation and state after replacing a replica', async () => {
      const prefix = `presence-test:${randomUUID()}:`;
      const a = replica(prefix);
      const b = replica(prefix);
      const first = new PostPresenceService(a, 'site-a');
      const second = new PostPresenceService(b, 'site-a');
      const post = { id: 'a'.repeat(24), type: 'post' as const };
      const actor = { id: 'b'.repeat(24), name: 'Alex', profile_image: null };
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          (i % 2 ? first : second).record(post, actor, 'editing', randomUUID()),
        ),
      );
      expect(await second.recent([post])).toHaveLength(20);
      expect(await new PostPresenceService(b, 'site-b').recent([post])).toEqual([]);
      const replacement = new PostPresenceService(replica(prefix), 'site-a');
      expect(await replacement.recent([post])).toHaveLength(20);
      const key = await a._buildKey(`presence:v1:site-a:post:${post.id}`);
      expect(await a.redisClient.ttl(key)).toBeGreaterThan(3500);
      // Delete only this test's keys.
      await a.redisClient.del(key, `${prefix}prefix_hash`);
    });
    it('atomically bounds events and enforces the same limiter across replicas', async () => {
      const prefix = `presence-test:${randomUUID()}:`;
      const a = replica(prefix);
      const b = replica(prefix);
      const now = Date.now();
      await Promise.all(
        Array.from({ length: 40 }, (_, i) =>
          (i % 2 ? a : b).appendEvent('window', `${i}`, now, 1, 10),
        ),
      );
      expect(await a.readEvents('window', now)).toHaveLength(10);
      await a.appendEvent('window', 'next', now + 1001, 1, 10);
      expect(await b.readEvents('window', now)).toEqual(['next']);
      const first = new PostPresenceService(a, 'site');
      const second = new PostPresenceService(b, 'site');
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) => (i % 2 ? first : second).allowPoll('user')),
      );
      expect(results.filter(Boolean)).toHaveLength(30);
      await a.redisClient.del(
        await a._buildKey('window'),
        await a._buildKey('presence:v1:site:limit:user'),
        `${prefix}prefix_hash`,
      );
    });
  },
);
