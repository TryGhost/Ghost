import assert from 'node:assert/strict';
import { MemoryPresenceStore } from '../../../../../core/server/services/editor-presence/memory-presence-store';
import { RedisPresenceStore } from '../../../../../core/server/services/editor-presence/redis-presence-store';
import {
  decodeMember,
  encodeMember,
  type PresenceStore,
  type StoredClaim,
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
      return {
        store: new RedisPresenceStore({
          client,
          key: 'presence:active',
          leaseKey: 'presence:leases',
        }),
        client,
      };
    },
  },
];

const byOrder = (claims: StoredClaim[]) => [...claims].sort((x, y) => x.order - y.order);

describe('presence member encoding', function () {
  it('round-trips a member', function () {
    const member = { type: 'post' as const, resourceId: 'a'.repeat(24), userId: 'b'.repeat(24) };
    assert.deepEqual(decodeMember(encodeMember(member)), member);
  });

  it('round-trips a member that names its tab', function () {
    const member = {
      type: 'post' as const,
      resourceId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
      tab: 'c0ffee-tab-1',
    };
    assert.equal(encodeMember(member), `post:${member.resourceId}:${member.userId}:c0ffee-tab-1`);
    assert.deepEqual(decodeMember(encodeMember(member)), member);
  });

  it('rejects malformed members', function () {
    assert.equal(decodeMember('post:only-two'), null);
    assert.equal(decodeMember('comment:a:b'), null);
    assert.equal(decodeMember('post::b'), null);
    assert.equal(decodeMember('post:a:b:'), null);
    assert.equal(decodeMember('post:a:b:c:d'), null);
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

    it('keeps a queued member in its place and returns every claim', async function () {
      const { store } = build();
      await store.claim('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u2', 2_000, RETENTION);
      const claims = await store.claim('post:a:u1', 3_000, RETENTION);
      const expected = [
        { member: 'post:a:u1', order: 1_000 },
        { member: 'post:a:u2', order: 2_000 },
      ];
      assert.deepEqual(byOrder(claims), expected);
      assert.deepEqual(byOrder(await store.claims()), expected);
    });

    it('moves a queued member when asked to replace its place', async function () {
      const { store } = build();
      await store.claim('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u2', 2_000, RETENTION);
      const claims = await store.claim('post:a:u2', 999, RETENTION, true);
      assert.deepEqual(byOrder(claims), [
        { member: 'post:a:u2', order: 999 },
        { member: 'post:a:u1', order: 1_000 },
      ]);
    });

    it('releases the named claims and leaves heartbeats alone', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u2', 2_000, RETENTION);
      await store.release(['post:a:u1', 'post:a:never']);
      await store.release([]);
      assert.deepEqual(await store.claims(), [{ member: 'post:a:u2', order: 2_000 }]);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u1', ts: 1_000 }]);
    });

    it('drops a removed member from the queue too', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u1', 1_000, RETENTION);
      await store.remove('post:a:u1');
      assert.deepEqual(await store.claims(), []);
    });
  });
}

describe('RedisPresenceStore pipeline', function () {
  it('expires the key for the retention window', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: '2368:presence:active',
      leaseKey: '2368:presence:leases',
    });
    await store.touch('post:a:u1', 1_000, RETENTION);
    assert.equal(client.ttls.get('2368:presence:active'), RETENTION);
  });

  it('sets the TTL before trimming so a new key never lacks one', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    await store.touch('post:a:u1', 1_000, RETENTION);
    assert.deepEqual(client.commands, ['zadd', 'pexpire', 'zremrangebyscore']);
  });

  it('queues with ZADD NX and expires the lease key before reading it back', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    await store.claim('post:a:u1', 1_000, RETENTION);
    assert.deepEqual(client.commands, ['zadd nx', 'pexpire', 'zrangebyscore']);
    assert.equal(client.ttls.get('presence:leases'), RETENTION);
    assert.equal(client.sets.get('presence:active'), undefined);

    client.commands.length = 0;
    await store.claim('post:a:u1', 500, RETENTION, true);
    assert.deepEqual(client.commands, ['zadd', 'pexpire', 'zrangebyscore']);
  });

  it('surfaces a failed claim', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    client.failNext = new Error('NOPERM');
    await assert.rejects(store.claim('post:a:u1', 1_000, RETENTION), /NOPERM/);
  });

  it('surfaces a failed command', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    client.failNext = new Error('READONLY');
    await assert.rejects(store.touch('post:a:u1', 1_000, RETENTION), /READONLY/);
  });
});
