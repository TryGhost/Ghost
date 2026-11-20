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
const WINDOW = 150_000;
/** The times a claim is made with, as the service would at `now`. */
const at = (now: number) => ({ now, since: now - WINDOW, retentionMs: RETENTION });

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

    it('keeps a queued member in its place and returns every claim', async function () {
      const { store } = build();
      assert.equal((await store.claim('post:a:u1:t', at(1_000))).joined, true);
      await store.claim('post:a:u2:t', at(2_000));
      const again = await store.claim('post:a:u1:t', at(3_000));
      assert.equal(again.joined, false);
      assert.deepEqual(inOrder(again.claims), ['post:a:u1:t', 'post:a:u2:t']);
      assert.deepEqual(inOrder(await store.claims(0)), ['post:a:u1:t', 'post:a:u2:t']);
    });

    it('places members in the order they asked, whatever their names or the clock say', async function () {
      const { store } = build();
      // Asked for in reverse of how the members sort, at one time and then an earlier one.
      await store.claim('post:a:u3:t', at(5_000));
      await store.claim('post:a:u2:t', at(5_000));
      await store.claim('post:a:u1:t', at(4_000));
      assert.deepEqual(inOrder(await store.claims(0)), [
        'post:a:u3:t',
        'post:a:u2:t',
        'post:a:u1:t',
      ]);
    });

    it('moves a member behind everyone or ahead of everyone', async function () {
      const { store } = build();
      await store.claim('post:a:u1:t', at(1_000));
      await store.claim('post:a:u2:t', at(1_000));
      await store.claim('post:a:u3:t', at(1_000));
      const back = await store.claim('post:a:u1:t', at(2_000), 'back');
      assert.equal(back.joined, false);
      assert.deepEqual(inOrder(back.claims), ['post:a:u2:t', 'post:a:u3:t', 'post:a:u1:t']);

      const front = await store.claim('post:a:u3:t', at(2_000), 'front');
      assert.equal(front.joined, false);
      assert.deepEqual(inOrder(front.claims), ['post:a:u3:t', 'post:a:u2:t', 'post:a:u1:t']);
      // The latest to go to the front is ahead of whoever went there before.
      const again = await store.claim('post:a:u2:t', at(2_000), 'front');
      assert.deepEqual(inOrder(again.claims), ['post:a:u2:t', 'post:a:u3:t', 'post:a:u1:t']);
      assert.equal((await store.claims(0)).length, 3);
    });

    it('lets a claim lapse when it is not renewed, and its member joins again at the back', async function () {
      const { store } = build();
      await store.claim('post:a:u1:t', at(0));
      await store.claim('post:a:u2:t', at(100_000));
      assert.deepEqual(inOrder(await store.claims(151_000 - WINDOW)), ['post:a:u2:t']);

      const back = await store.claim('post:a:u1:t', at(151_000));
      assert.equal(back.joined, true);
      assert.deepEqual(inOrder(back.claims), ['post:a:u2:t', 'post:a:u1:t']);
    });

    it('renews a claim only when it is claimed, never with a heartbeat', async function () {
      const { store } = build();
      await store.claim('post:a:u1:t', at(0));
      await store.touch('post:a:u1:t', 151_000, WINDOW);
      assert.deepEqual(await store.claims(151_000 - WINDOW), []);
    });

    it('releases a member’s claim and leaves heartbeats alone', async function () {
      const { store } = build();
      await store.touch('post:a:u1:t', 1_000, RETENTION);
      await store.claim('post:a:u1:t', at(1_000));
      await store.claim('post:a:u2:t', at(1_000));
      await store.release('post:a:u1:t');
      await store.release('post:a:never:t');
      assert.deepEqual(inOrder(await store.claims(0)), ['post:a:u2:t']);
      assert.deepEqual(await store.read(0), [{ member: 'post:a:u1:t', ts: 1_000 }]);
    });

    it('drops a removed member from the queue too', async function () {
      const { store } = build();
      await store.touch('post:a:u1:t', 1_000, RETENTION);
      await store.claim('post:a:u1:t', at(1_000));
      await store.remove('post:a:u1:t');
      assert.deepEqual(await store.claims(0), []);
      assert.deepEqual(await store.read(0), []);
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

  it('expires the lease key with every write and drops lapsed places before reading back', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    const written = ['pexpire', 'zremrangebyscore', 'zrangebyscore'];
    await store.claim('post:a:u1:t', at(1_000));
    assert.deepEqual(client.commands, ['zadd', ...written]);
    assert.equal(client.ttls.get('presence:leases'), RETENTION);
    assert.equal(client.sets.get('presence:active'), undefined);

    // A place is renewed where it is, and only if it is still there.
    client.commands.length = 0;
    await store.claim('post:a:u1:t', at(2_000));
    assert.deepEqual(client.commands, ['zadd xx', ...written]);

    client.commands.length = 0;
    await store.claim('post:a:u1:t', at(3_000), 'front');
    assert.deepEqual(client.commands, ['zrem', 'zadd', ...written]);
    assert.equal(client.sets.get('presence:leases')?.size, 1);
  });

  it('stores a place and its last renewal as one element', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    await store.claim('post:a:u1:t', at(1_000));
    await store.claim('post:a:u2:t', at(2_000));
    await store.claim('post:a:u2:t', at(3_000), 'front');
    await store.claim('post:a:u1:t', at(4_000));
    assert.deepEqual([...(client.sets.get('presence:leases') as Map<string, number>)].sort(), [
      ['post:a:u1:t:1', 4_000],
      ['post:a:u2:t:-1', 3_000],
    ]);
  });

  describe('when calls overlap', function () {
    /** Hold the nth pipeline back until released, and say when it has been reached. */
    function hold(client: FakeRedisClient, nth: number) {
      let release!: () => void;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let reach!: () => void;
      const reached = new Promise<void>((resolve) => {
        reach = resolve;
      });
      client.beforeExec = async (count) => {
        if (count === nth) {
          reach();
          await released;
        }
      };
      return { reached, release };
    }

    function build() {
      const client = new FakeRedisClient();
      const store = new RedisPresenceStore({
        client,
        key: 'presence:active',
        leaseKey: 'presence:leases',
      });
      return { client, store };
    }

    it('does not bring back a place that was dropped between its read and its renewal', async function () {
      const { client, store } = build();
      await store.claim('post:a:u1:t', at(0));
      // The renewal is by a clock just inside the window; the other tab's is just past it.
      const paused = hold(client, 2);
      const renewing = store.claim('post:a:u1:t', at(WINDOW));
      await paused.reached;
      await store.claim('post:a:u2:t', at(WINDOW + 1));
      paused.release();

      const renewed = await renewing;
      assert.equal(renewed.joined, true);
      assert.deepEqual(inOrder(renewed.claims), ['post:a:u2:t', 'post:a:u1:t']);
    });

    it('leaves a place alone that was renewed while a later write was dropping lapsed ones', async function () {
      const { client, store } = build();
      await store.claim('post:a:u1:t', at(0));
      const paused = hold(client, 2);
      // This tab reads the first as lapsed, and stops before it writes.
      const joining = store.claim('post:a:u2:t', at(WINDOW + 1));
      await paused.reached;
      assert.equal((await store.claim('post:a:u1:t', at(WINDOW))).joined, false);
      paused.release();

      const joined = await joining;
      assert.deepEqual(joined.claims.map((claim) => claim.member).sort(), [
        'post:a:u1:t',
        'post:a:u2:t',
      ]);
    });

    it('drops nothing made since when its own write lands late', async function () {
      const { client, store } = build();
      await store.claim('post:a:u1:t', at(0));
      const paused = hold(client, 2);
      const late = store.claim('post:a:u2:t', at(WINDOW + 1));
      await paused.reached;
      // The key expires and another document's tab starts the queue again.
      client.sets.delete('presence:leases');
      await store.claim('post:b:u3:t', at(WINDOW * 3));
      paused.release();
      await late;

      assert.deepEqual(inOrder(await store.claims(WINDOW * 2)), ['post:b:u3:t']);
    });
  });

  it('surfaces a failed claim', async function () {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    client.failNext = new Error('NOPERM');
    await assert.rejects(store.claim('post:a:u1:t', at(1_000)), /NOPERM/);
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
