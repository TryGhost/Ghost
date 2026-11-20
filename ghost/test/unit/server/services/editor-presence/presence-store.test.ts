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

/** The queue as the service reads it: members from the front to the back. */
const inOrder = (claims: StoredClaim[]) =>
  [...claims].sort((x, y) => x.order - y.order).map((claim) => claim.member);

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

    it('answers the heartbeat before this one', async function () {
      const { store } = build();
      assert.equal(await store.touch('post:a:u1', 1_000, RETENTION), undefined);
      assert.equal(await store.touch('post:a:u2', 1_500, RETENTION), undefined);
      assert.equal(await store.touch('post:a:u1', 2_000, RETENTION), 1_000);
    });

    it('keeps a queued member in its place and returns every claim', async function () {
      const { store } = build();
      await store.claim('post:a:u1', RETENTION);
      await store.claim('post:a:u2', RETENTION);
      const claims = await store.claim('post:a:u1', RETENTION);
      assert.deepEqual(inOrder(claims), ['post:a:u1', 'post:a:u2']);
      assert.deepEqual(inOrder(await store.claims()), ['post:a:u1', 'post:a:u2']);
    });

    it('gives every place an order of its own, in the order they were asked for', async function () {
      const { store } = build();
      // Asked for in reverse of how the members sort, which must not decide it.
      for (const member of ['post:a:u3', 'post:a:u2', 'post:a:u1']) {
        await store.claim(member, RETENTION);
      }
      const claims = await store.claims();
      assert.deepEqual(inOrder(claims), ['post:a:u3', 'post:a:u2', 'post:a:u1']);
      assert.equal(new Set(claims.map((claim) => claim.order)).size, 3);
    });

    it('moves a member behind everyone, or ahead of everyone with front', async function () {
      const { store } = build();
      await store.claim('post:a:u1', RETENTION);
      await store.claim('post:a:u2', RETENTION);
      await store.claim('post:a:u3', RETENTION);
      const back = await store.claim('post:a:u1', RETENTION, { move: true });
      assert.deepEqual(inOrder(back), ['post:a:u2', 'post:a:u3', 'post:a:u1']);

      const front = await store.claim('post:a:u3', RETENTION, { front: true, move: true });
      assert.deepEqual(inOrder(front), ['post:a:u3', 'post:a:u2', 'post:a:u1']);
      // The latest to go to the front is ahead of whoever went there before.
      const again = await store.claim('post:a:u2', RETENTION, { front: true, move: true });
      assert.deepEqual(inOrder(again), ['post:a:u2', 'post:a:u3', 'post:a:u1']);
    });

    it('releases a member’s own claim and leaves heartbeats alone', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u1', RETENTION);
      await store.claim('post:a:u2', RETENTION);
      await store.release('post:a:u1');
      await store.release('post:a:never');
      assert.deepEqual(inOrder(await store.claims()), ['post:a:u2']);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u1', ts: 1_000 }]);
    });

    it('prunes a claim only while it has the order it was read with', async function () {
      const { store } = build();
      await store.claim('post:a:u1', RETENTION);
      await store.claim('post:a:u2', RETENTION);
      const [seen] = (await store.claims()).filter((claim) => claim.member === 'post:a:u1');
      // Its member comes back before the claim seen as stale is dropped.
      await store.claim('post:a:u1', RETENTION, { move: true });
      await store.prune([seen]);
      await store.prune([]);
      assert.deepEqual(inOrder(await store.claims()), ['post:a:u2', 'post:a:u1']);

      await store.prune((await store.claims()).filter((claim) => claim.member === 'post:a:u1'));
      assert.deepEqual(inOrder(await store.claims()), ['post:a:u2']);
    });

    it('still places the next member last after pruning the latest claim', async function () {
      const { store } = build();
      await store.claim('post:a:u1', RETENTION);
      await store.claim('post:a:u2', RETENTION);
      await store.prune((await store.claims()).filter((claim) => claim.member === 'post:a:u2'));
      const claims = await store.claim('post:a:u3', RETENTION);
      assert.deepEqual(inOrder(claims), ['post:a:u1', 'post:a:u3']);
      assert.equal(new Set(claims.map((claim) => claim.order)).size, 2);
    });

    it('drops a removed member from the queue too', async function () {
      const { store } = build();
      await store.touch('post:a:u1', 1_000, RETENTION);
      await store.claim('post:a:u1', RETENTION);
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
    assert.deepEqual(client.commands, ['zrangebyscore', 'zadd', 'pexpire', 'zremrangebyscore']);
  });

  it('numbers a new place with ZADD INCR and expires the lease key with every write', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    await store.claim('post:a:u1', RETENTION);
    assert.deepEqual(client.commands, [
      'pexpire',
      'zrangebyscore',
      'zadd incr',
      'pexpire',
      'zadd nx',
      'pexpire',
      'zrangebyscore',
    ]);
    assert.equal(client.ttls.get('presence:leases'), RETENTION);
    assert.equal(client.sets.get('presence:active'), undefined);

    // A member already queued only keeps the key alive.
    client.commands.length = 0;
    await store.claim('post:a:u1', RETENTION);
    assert.deepEqual(client.commands, ['pexpire', 'zrangebyscore']);

    client.commands.length = 0;
    await store.claim('post:a:u1', RETENTION, { front: true, move: true });
    assert.deepEqual(client.commands, ['zadd incr', 'pexpire', 'zadd', 'pexpire', 'zrangebyscore']);
  });

  it('keeps its count of places out of the claims and apart from their orders', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    await store.claim('post:a:u1', RETENTION);
    const claims = await store.claim('post:a:u2', RETENTION, { front: true });
    assert.deepEqual(claims.map((claim) => claim.member).sort(), ['post:a:u1', 'post:a:u2']);
    assert.deepEqual(await store.claims(), claims);

    const stored = client.sets.get('presence:leases') as Map<string, number>;
    const [count] = [...stored]
      .filter(([member]) => !member.includes(':'))
      .map(([, score]) => score);
    assert.equal(stored.size, 3);
    assert.equal(
      claims.some((claim) => claim.order === count),
      false,
    );
  });

  it('surfaces a failed claim', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    client.failNext = new Error('NOPERM');
    await assert.rejects(store.claim('post:a:u1', RETENTION), /NOPERM/);
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
