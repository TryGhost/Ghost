import assert from 'node:assert/strict';
import { MemoryPresenceStore } from '../../../../../core/server/services/editor-presence/memory-presence-store';
import { RedisPresenceStore } from '../../../../../core/server/services/editor-presence/redis-presence-store';
import {
  decodeMember,
  documentOf,
  encodeMember,
  type PresenceStore,
} from '../../../../../core/server/services/editor-presence/presence-store';
import { FakeRedisClient } from './fake-redis-client';

const RETENTION = 60_000;
const WINDOW = 150_000;
/** The times a hold is asked for with, as the service would at `now`. */
const at = (now: number) => ({ now, since: now - WINDOW, retentionMs: RETENTION });
const A1 = 'post:a:u1:t';
const A2 = 'post:a:u2:t';
const A3 = 'post:a:u3:t';
const B3 = 'post:b:u3:t';

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

  it('names the document a member is on', function () {
    assert.equal(documentOf(A1), 'post:a');
    assert.equal(documentOf('page:b:u1'), 'page:b');
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

    it('gives a free document to the member that asks, and keeps it there', async function () {
      const { store } = build();
      assert.deepEqual(await store.hold(A1, at(1_000)), [A1]);
      assert.deepEqual(await store.hold(A2, at(2_000)), [A1]);
      assert.deepEqual(await store.hold(A1, at(3_000)), [A1]);
      assert.deepEqual(await store.holders(0), [A1]);
    });

    it('holds each document apart', async function () {
      const { store } = build();
      await store.hold(A1, at(1_000));
      assert.deepEqual((await store.hold(B3, at(1_000))).sort(), [A1, B3]);
    });

    it('takes a document from whoever holds it', async function () {
      const { store } = build();
      await store.hold(A1, at(1_000));
      assert.deepEqual(await store.hold(A2, at(2_000), true), [A2]);
      assert.deepEqual(await store.hold(A1, at(3_000)), [A2]);
      assert.deepEqual(await store.hold(A3, at(4_000), true), [A3]);
      assert.deepEqual(await store.holders(0), [A3]);
    });

    it('frees a document whose holder stopped asking, for the next member that asks', async function () {
      const { store } = build();
      await store.hold(A1, at(0));
      assert.deepEqual(await store.holders(151_000 - WINDOW), []);
      assert.deepEqual(await store.hold(A2, at(151_000)), [A2]);
      assert.deepEqual(await store.hold(A1, at(152_000)), [A2]);
    });

    it('keeps a hold only when it is asked for, never with a heartbeat', async function () {
      const { store } = build();
      await store.hold(A1, at(0));
      await store.touch(A1, 151_000, WINDOW);
      assert.deepEqual(await store.holders(151_000 - WINDOW), []);
    });

    it('releases only the hold of the member that gives it up', async function () {
      const { store } = build();
      await store.touch(A1, 1_000, RETENTION);
      await store.hold(A1, at(1_000));
      await store.release(A2);
      await store.release('post:a:never:t');
      assert.deepEqual(await store.holders(0), [A1]);

      await store.release(A1);
      assert.deepEqual(await store.holders(0), []);
      assert.deepEqual(await store.read(0), [{ member: A1, ts: 1_000 }]);
      assert.deepEqual(await store.hold(A2, at(2_000)), [A2]);
    });

    it('drops the hold of a removed member', async function () {
      const { store } = build();
      await store.touch(A1, 1_000, RETENTION);
      await store.hold(A1, at(1_000));
      await store.remove(A1);
      assert.deepEqual(await store.holders(0), []);
      assert.deepEqual(await store.read(0), []);
    });
  });
}

describe('RedisPresenceStore pipeline', function () {
  function build() {
    const client = new FakeRedisClient();
    const store = new RedisPresenceStore({
      client,
      key: 'presence:active',
      leaseKey: 'presence:leases',
    });
    const stored = () => [...(client.sets.get('presence:leases') ?? new Map<string, number>())];
    return { client, store, stored };
  }

  it('expires the key for the retention window', async function () {
    const { client, store } = build();
    await store.touch('post:a:u1', 1_000, RETENTION);
    assert.equal(client.ttls.get('presence:active'), RETENTION);
  });

  it('sets the TTL before trimming so a new key never lacks one', async function () {
    const { client, store } = build();
    await store.touch('post:a:u1', 1_000, RETENTION);
    assert.deepEqual(client.commands, ['zadd', 'pexpire', 'zremrangebyscore']);
  });

  it('stores a claim scored by when it last asked, and a lock scored by the claim’s number', async function () {
    const { client, store, stored } = build();
    await store.hold(A1, at(1_000));
    await store.hold(A1, at(2_000));
    const [[claim, asked]] = stored().filter(([element]) => element.startsWith(A1));
    const [[lock, number]] = stored().filter(([element]) => element === 'post:a');
    assert.equal(stored().length, 2);
    assert.equal(asked, 2_000);
    assert.equal(claim, `${A1}:${number}`);
    assert.equal(lock, 'post:a');
    // Above any time, so a lock is never read or dropped as a lapsed claim, and still a whole number.
    assert.ok(number > Date.now() * 1_000 && Number.isSafeInteger(number));
    assert.equal(client.ttls.get('presence:leases'), RETENTION);
    assert.equal(client.sets.get('presence:active'), undefined);
  });

  it('lets Redis decide who gets a free document, and writes nothing when it is held', async function () {
    const { client, store } = build();
    const written = ['zremrangebyscore', 'zrangebyscore'];
    await store.hold(A1, at(1_000));
    assert.deepEqual(client.commands, ['zadd', 'pexpire', 'zadd nx', ...written]);

    // A hold is renewed where it is, and only if it is still there.
    client.commands.length = 0;
    await store.hold(A1, at(2_000));
    assert.deepEqual(client.commands, ['zadd xx', 'pexpire', ...written]);

    client.commands.length = 0;
    await store.hold(A2, at(3_000));
    assert.deepEqual(client.commands, []);

    await store.hold(A2, at(4_000), true);
    assert.deepEqual(client.commands, ['zadd', 'pexpire', 'zadd', ...written]);
  });

  it('drops a lapsed lock by its own number before asking for the document', async function () {
    const { client, store, stored } = build();
    await store.hold(A1, at(0));
    await store.hold(B3, at(0));
    client.commands.length = 0;
    assert.deepEqual(await store.hold(A2, at(WINDOW + 1)), [A2]);
    // Its own document's lock, then the other lapsed lock, then the lapsed claims.
    assert.deepEqual(client.commands, [
      'zadd',
      'pexpire',
      'zremrangebyscore',
      'zadd nx',
      'zremrangebyscore',
      'zremrangebyscore',
      'zrangebyscore',
    ]);
    assert.deepEqual(
      stored()
        .map(([element]) => element.split(':').length)
        .sort(),
      [2, 5],
    );
  });

  describe('when calls overlap', function () {
    /** Hold the nth pipeline back until released, and say when it has been reached. */
    function pause(client: FakeRedisClient, nth: number) {
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

    it('gives a free document to one of two members that ask at once', async function () {
      const { client, store } = build();
      const paused = pause(client, 1);
      // Both read the document as free; the first stops before it writes.
      const slow = store.hold(A1, at(1_000));
      await paused.reached;
      assert.deepEqual(await store.hold(A2, at(1_000)), [A2]);
      paused.release();

      assert.deepEqual(await slow, [A2]);
      assert.deepEqual(await store.hold(A1, at(2_000)), [A2]);
      assert.deepEqual(await store.hold(A2, at(2_000)), [A2]);
    });

    it('gives a lapsed document to one of two members that ask at once', async function () {
      const { client, store } = build();
      await store.hold(A3, at(0));
      const paused = pause(client, 2);
      const slow = store.hold(A1, at(WINDOW + 1));
      await paused.reached;
      assert.deepEqual(await store.hold(A2, at(WINDOW + 1)), [A2]);
      paused.release();

      // The slow one drops the lock it read as lapsed, which is no longer the lock there.
      assert.deepEqual(await slow, [A2]);
      assert.deepEqual(await store.holders(1), [A2]);
    });

    it('keeps a document with its holder when the other member’s write ran and its answer was lost', async function () {
      const { client, store } = build();
      const paused = pause(client, 1);
      const slow = store.hold(A2, at(1_000));
      await paused.reached;
      assert.deepEqual(await store.hold(A1, at(1_000)), [A1]);
      client.afterExec = (count) => {
        if (count === 1) {
          throw new Error('ECONNRESET');
        }
      };
      paused.release();
      await assert.rejects(slow, /ECONNRESET/);

      // It asks again through a store that remembers nothing of the first try.
      const again = new RedisPresenceStore({
        client,
        key: 'presence:active',
        leaseKey: 'presence:leases',
      });
      assert.deepEqual(await again.hold(A2, at(2_000)), [A1]);
      assert.deepEqual(await store.hold(A1, at(2_000)), [A1]);
    });

    it('does not renew a hold that was taken between its read and its renewal', async function () {
      const { client, store } = build();
      await store.hold(A1, at(1_000));
      const paused = pause(client, 2);
      const renewing = store.hold(A1, at(2_000));
      await paused.reached;
      assert.deepEqual(await store.hold(A2, at(2_000), true), [A2]);
      paused.release();

      assert.deepEqual(await renewing, [A2]);
    });

    it('holds a document again when its claim was dropped just as it was renewed', async function () {
      const { client, store } = build();
      await store.hold(A1, at(0));
      // Renewed by a clock just inside the window, while another document's member is just past it.
      const paused = pause(client, 2);
      const renewing = store.hold(A1, at(WINDOW));
      await paused.reached;
      await store.hold(B3, at(WINDOW + 1));
      paused.release();

      assert.deepEqual((await renewing).sort(), [A1, B3]);
    });

    it('drops nothing made since when its own write lands late', async function () {
      const { client, store } = build();
      await store.hold(A1, at(0));
      const paused = pause(client, 2);
      // Reads the first document's lock as lapsed, and stops before it writes.
      const late = store.hold(B3, at(WINDOW + 1));
      await paused.reached;
      // The key expires and the first document is held again, by another member.
      client.sets.delete('presence:leases');
      assert.deepEqual(await store.hold(A2, at(WINDOW * 3)), [A2]);
      paused.release();
      await late;

      assert.deepEqual(await store.holders(WINDOW * 2), [A2]);
    });

    it('gives up a hold only while it is still the one that holds the document', async function () {
      const { client, store } = build();
      await store.hold(A1, at(1_000));
      const paused = pause(client, 2);
      const leaving = store.release(A1);
      await paused.reached;
      assert.deepEqual(await store.hold(A2, at(2_000), true), [A2]);
      paused.release();
      await leaving;

      assert.deepEqual(await store.holders(0), [A2]);
    });
  });

  it('surfaces a failed hold', async function () {
    const { client, store } = build();
    client.failNext = new Error('NOPERM');
    await assert.rejects(store.hold(A1, at(1_000)), /NOPERM/);
  });

  it('surfaces a failed command', async function () {
    const { client, store } = build();
    client.failNext = new Error('READONLY');
    await assert.rejects(store.touch('post:a:u1', 1_000, RETENTION), /READONLY/);
  });
});
