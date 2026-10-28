import assert from 'node:assert/strict';
import { MemoryPresenceStore } from '../../../../../core/server/services/editor-presence/memory-presence-store';
import { RedisPresenceStore } from '../../../../../core/server/services/editor-presence/redis-presence-store';
import {
  decodeMember,
  encodeMember,
  type PresenceStore,
} from '../../../../../core/server/services/editor-presence/presence-store';
import { FakeRedisClient } from './fake-redis-client';

const RETENTION = 60_000;

const scenarios: Array<{
  label: string;
  build: () => { store: PresenceStore; client?: FakeRedisClient };
}> = [
  { label: 'MemoryPresenceStore', build: () => ({ store: new MemoryPresenceStore() }) },
  {
    label: 'RedisPresenceStore',
    build: () => {
      const client = new FakeRedisClient();
      return { store: new RedisPresenceStore({ client, key: 'presence:active' }), client };
    },
  },
];

describe('presence member encoding', function () {
  it('round-trips a member', function () {
    const member = { type: 'post' as const, resourceId: 'a'.repeat(24), userId: 'b'.repeat(24) };
    assert.deepEqual(decodeMember(encodeMember(member)), member);
  });

  it('rejects malformed members', function () {
    assert.equal(decodeMember('post:only-two'), null);
    assert.equal(decodeMember('comment:a:b'), null);
    assert.equal(decodeMember('post::b'), null);
  });
});

for (const { label, build } of scenarios) {
  describe(label, function () {
    it('returns members at or after the window start', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.touch('post:a:u2', 5_000, RETENTION);
      await store.touch('post:b:u3', 9_000, RETENTION);

      const read = await store.read(5_000);
      assert.deepEqual(
        read.sort((x, y) => x.ts - y.ts),
        [
          { member: 'post:a:u2', ts: 5_000 },
          { member: 'post:b:u3', ts: 9_000 },
        ],
      );
    });

    it('overwrites the timestamp for a repeated member', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.touch('post:a:u1', 2_000, RETENTION);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u1', ts: 2_000 }]);
    });

    it('trims members older than the retention on write', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.touch('post:a:u2', 1_000 + RETENTION + 1, RETENTION);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u2', ts: 1_000 + RETENTION + 1 }]);
    });

    it('removes a member', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.remove('post:a:u1');
      await store.remove('post:a:never');
      assert.deepEqual(await store.read(0), []);
    });
  });
}

describe('RedisPresenceStore transaction', function () {
  it('expires the key for the retention window', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({ client, key: 'site:{1:presence}:active' });
    await store.touch('post:a:u1', 1_000, RETENTION);
    assert.equal(client.ttls.get('site:{1:presence}:active'), RETENTION);
  });

  it('surfaces a failed command', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({ client, key: 'presence:active' });
    client.failNext = new Error('READONLY');
    await assert.rejects(store.touch('post:a:u1', 1_000, RETENTION), /READONLY/);
  });
});
