import assert from 'node:assert/strict';
import { vi } from 'vitest';
import {
  DEFAULT_LEASE_WINDOW_MS,
  DEFAULT_RETENTION_MS,
  DEFAULT_STORE_TIMEOUT_MS,
  EditorPresenceService,
  MIN_RETENTION_MS,
  resolveRetentionMs,
  type PresenceMetrics,
} from '../../../../../core/server/services/editor-presence/editor-presence-service';
import { MemoryPresenceStore } from '../../../../../core/server/services/editor-presence/memory-presence-store';
import type {
  LeaseTime,
  PresenceStore,
} from '../../../../../core/server/services/editor-presence/presence-store';
import { RedisPresenceStore } from '../../../../../core/server/services/editor-presence/redis-presence-store';
import { FakeRedisClient } from './fake-redis-client';

const POST_A = 'a'.repeat(24);
const POST_B = 'b'.repeat(24);
const PAGE_C = 'c'.repeat(24);
const USER_1 = '1'.repeat(24);
const USER_2 = '2'.repeat(24);
const USER_3 = '3'.repeat(24);
const TAB_1 = 'tab-one-0001';
const TAB_2 = 'tab-two-0002';

function build(overrides: { store?: PresenceStore; leaseWindowMs?: number } = {}) {
  let now = 1_000_000;
  const recorded: Array<{ name: string; value: Record<string, unknown> }> = [];
  const metrics: PresenceMetrics = {
    metric: (name, value) => recorded.push({ name, value }),
  };
  const store = overrides.store ?? new MemoryPresenceStore();
  const service = new EditorPresenceService({
    store,
    metrics,
    now: () => now,
    activeWindowMs: 60_000,
    leaseWindowMs: overrides.leaseWindowMs,
    retentionMs: overrides.leaseWindowMs ?? 60_000,
  });
  return {
    service,
    store,
    recorded,
    advance: (ms: number) => {
      now += ms;
    },
    get now() {
      return now;
    },
  };
}

describe('EditorPresenceService', function () {
  it('reports other users on the requested resources and never the caller', async function () {
    const { service, now } = build();
    await service.poll(USER_1, { editing: { id: POST_A, type: 'post' } });
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    await service.poll(USER_3, { editing: { id: PAGE_C, type: 'page' } });

    const result = await service.poll(USER_1, {
      resources: [
        { id: POST_A, type: 'post' },
        { id: POST_B, type: 'post' },
      ],
    });

    assert.deepEqual(result, {
      active: [{ userId: USER_2, resourceId: POST_A, resourceType: 'post', ts: now }],
      serverTime: now,
    });
  });

  it('includes the edited resource in the reported set', async function () {
    const { service } = build();
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    const result = await service.poll(USER_1, { editing: { id: POST_A, type: 'post' } });
    assert.equal(result.active.length, 1);
    assert.equal(result.active[0].userId, USER_2);
  });

  it('does not write when only reading', async function () {
    const { service, store } = build();
    await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal((store as MemoryPresenceStore).size, 0);
  });

  it('answers an empty request without touching the store and rejects a missing one', async function () {
    const failing: PresenceStore = {
      kind: 'memory',
      touch: async () => assert.fail('touch called'),
      read: async () => assert.fail('read called'),
      remove: async () => assert.fail('remove called'),
      hold: async () => assert.fail('hold called'),
      holders: async () => assert.fail('holders called'),
      release: async () => assert.fail('release called'),
    };
    const { service, now } = build({ store: failing });
    assert.deepEqual(await service.poll(USER_1, {}), { active: [], serverTime: now });
    await assert.rejects(service.poll(USER_1, undefined), { errorType: 'ValidationError' });
  });

  it('drops users whose last heartbeat is outside the active window', async function () {
    const { service, advance } = build();
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    advance(59_000);
    let result = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal(result.active.length, 1);
    advance(2_000);
    result = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal(result.active.length, 0);
  });

  it('reports a user once across their tabs, with the latest heartbeat', async function () {
    const { service, advance, now: first } = build();
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' }, tab: TAB_1 });
    advance(5_000);
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' }, tab: TAB_2 });
    const result = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal(result.active.length, 1);
    assert.equal(result.active[0].ts, first + 5_000);

    // The first tab beats again: it is the newest now, and the store still lists it first.
    advance(5_000);
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' }, tab: TAB_1 });
    const again = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal(again.active.length, 1);
    assert.equal(again.active[0].ts, first + 10_000);
  });

  it('keeps a user present while another of their tabs is still open', async function () {
    const { service } = build();
    const editing = { id: POST_A, type: 'post' };
    await service.poll(USER_2, { editing, tab: TAB_1 });
    await service.poll(USER_2, { editing, tab: TAB_2 });

    await service.leave(USER_2, { resource: editing, tab: TAB_1 });
    const oneLeft = await service.poll(USER_1, { resources: [editing] });
    assert.deepEqual(
      oneLeft.active.map((entry) => entry.userId),
      [USER_2],
    );

    await service.leave(USER_2, { resource: editing, tab: TAB_2 });
    const noneLeft = await service.poll(USER_1, { resources: [editing] });
    assert.deepEqual(noneLeft.active, []);
  });

  it('removes the caller on leave', async function () {
    const { service } = build();
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    await service.leave(USER_2, { resource: { id: POST_A, type: 'post' } });
    const result = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.deepEqual(result.active, []);
  });

  it('rejects malformed input with a ValidationError', async function () {
    const { service } = build();
    const cases: unknown[] = [
      { editing: { id: 'not-an-id', type: 'post' } },
      { editing: { id: POST_A, type: 'comment' } },
      { resources: Array.from({ length: 51 }, () => ({ id: POST_A, type: 'post' })) },
      { resources: [{ id: POST_A, type: 'post', extra: true }] },
      { unexpected: true },
      { editing: { id: POST_A, type: 'post' }, tab: 'short' },
      { editing: { id: POST_A, type: 'post' }, tab: 'has:a-colon' },
      'string',
    ];
    for (const input of cases) {
      await assert.rejects(service.poll(USER_1, input), { errorType: 'ValidationError' });
    }
    await assert.rejects(service.leave(USER_1, {}), { errorType: 'ValidationError' });
    await assert.rejects(
      service.leave(USER_1, { resource: { id: POST_A, type: 'post' }, tab: 'has:a-colon' }),
      { errorType: 'ValidationError' },
    );
  });

  it('records duration, store kind and outcome', async function () {
    const { service, recorded } = build();
    await service.poll(USER_1, { editing: { id: POST_A, type: 'post' } });
    await service.leave(USER_1, { resource: { id: POST_A, type: 'post' } });

    assert.deepEqual(
      recorded.map(({ name, value }) => ({ name, ...value, value: typeof value.value })),
      [
        {
          name: 'presence-poll',
          feature: 'presence',
          store: 'memory',
          outcome: 'ok',
          write: true,
          lease: 'none',
          value: 'number',
        },
        {
          name: 'presence-leave',
          feature: 'presence',
          store: 'memory',
          outcome: 'ok',
          value: 'number',
        },
      ],
    );
  });

  function failingStore(failure: Partial<PresenceStore>): PresenceStore {
    return {
      kind: 'redis',
      touch: async () => undefined,
      read: async () => [],
      remove: async () => undefined,
      hold: async () => [],
      holders: async () => [],
      release: async () => undefined,
      ...failure,
    };
  }

  it('turns a store failure into a 503 and records the degraded operation', async function () {
    const store = failingStore({
      touch: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:6379'), {
          code: 'ECONNREFUSED',
        });
      },
    });
    const { service, recorded } = build({ store });
    await assert.rejects(
      service.poll(USER_1, { editing: { id: POST_A, type: 'post' } }),
      (error: unknown) => {
        const ghostError = error as {
          statusCode: number;
          errorType: string;
          message: string;
          code: string;
        };
        assert.equal(ghostError.statusCode, 503);
        assert.equal(ghostError.errorType, 'ServiceUnavailableError');
        assert.equal(ghostError.message, 'Presence is temporarily unavailable');
        assert.equal(ghostError.code, 'PRESENCE_UNAVAILABLE');
        return true;
      },
    );
    assert.deepEqual(
      recorded.map((entry) => ({ name: entry.name, ...entry.value, value: undefined })),
      [
        {
          name: 'presence-degraded',
          feature: 'presence',
          store: 'redis',
          operation: 'touch',
          reason: 'ECONNREFUSED',
          value: undefined,
        },
        {
          name: 'presence-poll',
          feature: 'presence',
          store: 'redis',
          outcome: 'error',
          write: true,
          lease: 'none',
          value: undefined,
        },
      ],
    );
  });

  describe('store deadline', function () {
    beforeEach(function () {
      vi.useFakeTimers();
    });

    // Not a finally in the test: one that hangs would leave fake timers on for the rest of the worker.
    afterEach(function () {
      vi.useRealTimers();
    });

    it('answers 503 with reason timeout when the store does not respond in time', async function () {
      const store = failingStore({
        touch: () => new Promise<void>(() => {}),
        read: async () => assert.fail('read called after touch timed out'),
      });
      const { service, recorded } = build({ store });
      const pending = assert.rejects(
        service.poll(USER_1, { editing: { id: POST_A, type: 'post' } }),
        { statusCode: 503 },
      );
      await vi.advanceTimersByTimeAsync(DEFAULT_STORE_TIMEOUT_MS);
      await pending;
      const degraded = recorded.filter((entry) => entry.name === 'presence-degraded');
      assert.deepEqual(
        degraded.map((entry) => [entry.value.operation, entry.value.reason]),
        [['touch', 'timeout']],
      );
      assert.equal(vi.getTimerCount(), 0);
    });

    it('leaves no timer armed when the store answers, or throws before returning a promise', async function () {
      const { service } = build();
      await service.poll(USER_1, { editing: { id: POST_A, type: 'post' } });
      assert.equal(vi.getTimerCount(), 0);

      const throwing = build({
        store: failingStore({
          touch: () => {
            throw new Error('boom');
          },
        }),
      });
      await assert.rejects(
        throwing.service.poll(USER_1, { editing: { id: POST_A, type: 'post' } }),
        { statusCode: 503 },
      );
      assert.equal(vi.getTimerCount(), 0);
    });
  });

  it('labels a NOPERM reply from Redis as noperm on read and remove', async function () {
    const noperm = () => {
      throw new Error("NOPERM User 1 has no permissions to run the 'zrangebyscore' command");
    };
    const { service, recorded } = build({
      store: failingStore({ read: async () => noperm(), remove: async () => noperm() }),
    });
    await assert.rejects(service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] }), {
      statusCode: 503,
    });
    await assert.rejects(service.leave(USER_1, { resource: { id: POST_A, type: 'post' } }), {
      statusCode: 503,
    });
    const degraded = recorded.filter((entry) => entry.name === 'presence-degraded');
    assert.deepEqual(
      degraded.map((entry) => [entry.value.operation, entry.value.reason]),
      [
        ['read', 'noperm'],
        ['remove', 'noperm'],
      ],
    );
  });

  it('labels a disconnected client as offline and a Redis reply error by its first word', async function () {
    const offline = () => {
      throw new Error("Stream isn't writeable and enableOfflineQueue options is false");
    };
    const readonly = () => {
      throw Object.assign(new Error("READONLY You can't write against a read only replica."), {
        name: 'ReplyError',
      });
    };
    const { service, recorded } = build({
      store: failingStore({ touch: async () => offline(), read: async () => readonly() }),
    });
    await assert.rejects(service.poll(USER_1, { editing: { id: POST_A, type: 'post' } }), {
      statusCode: 503,
    });
    await assert.rejects(service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] }), {
      statusCode: 503,
    });
    const degraded = recorded.filter((entry) => entry.name === 'presence-degraded');
    assert.deepEqual(
      degraded.map((entry) => [entry.value.operation, entry.value.reason]),
      [
        ['touch', 'offline'],
        ['read', 'readonly'],
      ],
    );
  });
});

describe('EditorPresenceService lease', function () {
  const LEASE_WINDOW = 150_000;
  const editing = { id: POST_A, type: 'post' as const };
  const hold = (tab: string) => ({ editing, tab, lease: 'hold' as const });
  const take = (tab: string) => ({ editing, tab, lease: 'take' as const });

  it('gives the lease to the first tab that asks and tells the next who holds it', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    const first = await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    const second = await service.poll(USER_2, hold(TAB_2));
    assert.deepEqual(first.lease, { userId: USER_1, mine: true });
    assert.deepEqual(second.lease, { userId: USER_1, mine: false });
  });

  it('keeps the holder in place however often the others poll', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    for (let i = 0; i < 3; i += 1) {
      advance(10_000);
      assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, false);
      assert.equal((await service.poll(USER_1, hold(TAB_1))).lease?.mine, true);
    }
  });

  it('treats the same user in a second tab as another claimant', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    const other = await service.poll(USER_1, hold(TAB_2));
    assert.deepEqual(other.lease, { userId: USER_1, mine: false });
  });

  it('gives the document to the next tab that asks once the holder leaves', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    await service.poll(USER_2, hold(TAB_2));
    await service.leave(USER_1, { resource: editing, tab: TAB_1 });
    advance(1_000);
    assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
      userId: USER_2,
      mine: true,
    });
  });

  it('keeps a quiet holder past the active window and drops it after the lease window', async function () {
    const { service, store, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    await service.poll(USER_2, hold(TAB_2));

    advance(90_000);
    const quiet = await service.poll(USER_2, hold(TAB_2));
    assert.deepEqual(quiet.active, []);
    assert.deepEqual(quiet.lease, { userId: USER_1, mine: false });

    advance(60_000);
    const lapsed = await service.poll(USER_2, hold(TAB_2));
    assert.deepEqual(lapsed.lease, { userId: USER_2, mine: true });
    assert.deepEqual(await store.holders(0), [`post:${POST_A}:${USER_2}:${TAB_2}`]);
  });

  it('does not give a returning holder a document that another tab has held since', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    await service.poll(USER_2, hold(TAB_2));
    advance(LEASE_WINDOW + 1);
    await service.poll(USER_2, hold(TAB_2));
    advance(1_000);
    assert.deepEqual((await service.poll(USER_1, hold(TAB_1))).lease, {
      userId: USER_2,
      mine: false,
    });
  });

  it('gives a document whose holder stopped asking to whichever tab asks first', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(100_000);
    await service.poll(USER_2, hold(TAB_2));
    advance(LEASE_WINDOW - 100_000 + 1_000);
    // Nobody is in line for it: the one that held it is back first, so holds it again.
    assert.deepEqual((await service.poll(USER_1, hold(TAB_1))).lease, {
      userId: USER_1,
      mine: true,
    });
    assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
      userId: USER_1,
      mine: false,
    });
  });

  it('does not keep a document for a holder that sends only heartbeats', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(100_000);
    await service.poll(USER_2, hold(TAB_2));
    advance(LEASE_WINDOW - 100_000 + 1_000);
    // Present again, but not asking for the lease.
    await service.poll(USER_1, { editing, tab: TAB_1 });
    assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
      userId: USER_2,
      mine: true,
    });
    assert.deepEqual((await service.poll(USER_1, hold(TAB_1))).lease, {
      userId: USER_2,
      mine: false,
    });
  });

  it('holds nothing for a tab whose hold failed after its heartbeat', async function () {
    class FailsOnce extends MemoryPresenceStore {
      failing = false;
      async hold(member: string, time: LeaseTime, whoever?: boolean): Promise<string[]> {
        if (this.failing) {
          this.failing = false;
          throw new Error('ECONNRESET');
        }
        return super.hold(member, time, whoever);
      }
    }
    const store = new FailsOnce();
    const { service, advance } = build({ store, leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(LEASE_WINDOW + 1_000);

    store.failing = true;
    await assert.rejects(service.poll(USER_1, hold(TAB_1)), { statusCode: 503 });
    assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
      userId: USER_2,
      mine: true,
    });
    assert.deepEqual((await service.poll(USER_1, hold(TAB_1))).lease, {
      userId: USER_2,
      mine: false,
    });
  });

  it('gives the lease to the first of two tabs that ask in the same millisecond', async function () {
    const { service } = build({ leaseWindowMs: LEASE_WINDOW });
    // The second to ask sorts first as a member, which must not decide it.
    const first = await service.poll(USER_2, hold(TAB_2));
    const second = await service.poll(USER_1, hold(TAB_1));
    assert.deepEqual(first.lease, { userId: USER_2, mine: true });
    assert.deepEqual(second.lease, { userId: USER_2, mine: false });
    assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, true);
  });

  describe('when two tabs ask at once', function () {
    /** The Redis store, with the first tab held back between reading who holds the document and asking for it. */
    function overlapping() {
      const client = new FakeRedisClient();
      const store = new RedisPresenceStore({
        client,
        key: 'presence:active',
        leaseKey: 'presence:leases',
      });
      let release!: () => void;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let reach!: () => void;
      const reached = new Promise<void>((resolve) => {
        reach = resolve;
      });
      // A poll's first pipeline is its heartbeat and its second asks for the document.
      client.beforeExec = async (count) => {
        if (count === 2) {
          reach();
          await released;
        }
      };
      return { ...build({ store, leaseWindowMs: LEASE_WINDOW }), client, reached, release };
    }

    it('tells only the one that got there first that the document is its own', async function () {
      const { service, reached, release } = overlapping();
      const slow = service.poll(USER_1, hold(TAB_1));
      await reached;
      const quick = await service.poll(USER_2, hold(TAB_2));
      release();

      assert.deepEqual(quick.lease, { userId: USER_2, mine: true });
      assert.deepEqual((await slow).lease, { userId: USER_2, mine: false });
      // And it stays that way, whichever of them sorts first.
      assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, true);
      assert.equal((await service.poll(USER_1, hold(TAB_1))).lease?.mine, false);
    });

    it('lets a takeover through all the same', async function () {
      const { service, reached, release } = overlapping();
      const slow = service.poll(USER_1, take(TAB_1));
      await reached;
      const quick = await service.poll(USER_2, hold(TAB_2));
      release();

      assert.deepEqual(quick.lease, { userId: USER_2, mine: true });
      assert.deepEqual((await slow).lease, { userId: USER_1, mine: true });
      assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, false);
    });

    it('leaves the document with its holder when the other tab’s request fails and it asks again', async function () {
      const fixture = overlapping();
      const { service, store, client, reached, release } = fixture;
      const slow = service.poll(USER_1, hold(TAB_1));
      await reached;
      const quick = await service.poll(USER_2, hold(TAB_2));
      // The slow tab's write runs, and its answer never arrives.
      client.afterExec = (count) => {
        if (count === 2) {
          throw new Error('ECONNRESET');
        }
      };
      release();
      await assert.rejects(slow, { statusCode: 503 });

      // It asks again through a service that remembers nothing of the first try.
      const again = new EditorPresenceService({
        store,
        now: () => fixture.now,
        leaseWindowMs: LEASE_WINDOW,
      });
      assert.deepEqual(quick.lease, { userId: USER_2, mine: true });
      assert.deepEqual((await again.poll(USER_1, hold(TAB_1))).lease, {
        userId: USER_2,
        mine: false,
      });
      assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, true);
    });
  });

  it('hands the document over on take, and the tab it was taken from learns on its next poll', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    await service.poll(USER_2, hold(TAB_2));
    advance(1_000);
    assert.deepEqual((await service.poll(USER_2, take(TAB_2))).lease, {
      userId: USER_2,
      mine: true,
    });
    advance(1_000);
    assert.deepEqual((await service.poll(USER_1, hold(TAB_1))).lease, {
      userId: USER_2,
      mine: false,
    });
    advance(1_000);
    assert.equal((await service.poll(USER_1, take(TAB_1))).lease?.mine, true);
    assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, false);
  });

  it('takes like a hold when nobody holds the document', async function () {
    const { service } = build({ leaseWindowMs: LEASE_WINDOW });
    assert.deepEqual((await service.poll(USER_1, take(TAB_1))).lease, {
      userId: USER_1,
      mine: true,
    });
  });

  it('holds each document and each type of document apart', async function () {
    const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, hold(TAB_1));
    advance(1_000);
    const otherPost = await service.poll(USER_2, {
      editing: { id: POST_B, type: 'post' },
      tab: TAB_2,
      lease: 'take',
    });
    const page = await service.poll(USER_3, {
      editing: { id: POST_A, type: 'page' },
      tab: TAB_1,
      lease: 'hold',
    });
    assert.deepEqual(otherPost.lease, { userId: USER_2, mine: true });
    assert.deepEqual(page.lease, { userId: USER_3, mine: true });
    assert.equal((await service.poll(USER_1, hold(TAB_1))).lease?.mine, true);
  });

  it('leaves a tab that does not ask holding nothing, and out of the answer', async function () {
    const { service, store, advance } = build({ leaseWindowMs: LEASE_WINDOW });
    const plain = await service.poll(USER_1, { editing, tab: TAB_1 });
    assert.equal('lease' in plain, false);
    assert.deepEqual(await store.holders(0), []);

    advance(1_000);
    const asked = await service.poll(USER_2, hold(TAB_2));
    assert.deepEqual(asked.lease, { userId: USER_2, mine: true });
    assert.deepEqual(
      asked.active.map((entry) => entry.userId),
      [USER_1],
    );
  });

  describe('watch', function () {
    const watch = (tab: string) => ({ editing, tab, lease: 'watch' as const });

    it('finds nobody holding a document that tabs only watch', async function () {
      const { service, store, advance } = build({ leaseWindowMs: LEASE_WINDOW });
      const first = await service.poll(USER_1, watch(TAB_1));
      advance(1_000);
      const second = await service.poll(USER_2, watch(TAB_2));
      assert.equal(first.lease, null);
      assert.equal(second.lease, null);
      assert.deepEqual(await store.holders(0), []);
      // Watching is still being present.
      assert.deepEqual(
        second.active.map((entry) => entry.userId),
        [USER_1],
      );
    });

    it('tells a watching tab who holds the document, without holding it', async function () {
      const { service, store, advance } = build({ leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, hold(TAB_1));
      advance(1_000);
      const watching = await service.poll(USER_2, watch(TAB_2));
      assert.deepEqual(watching.lease, { userId: USER_1, mine: false });
      assert.equal((await store.holders(0)).length, 1);
    });

    it('hands nobody the lease when the holder leaves, until a tab asks to hold', async function () {
      const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, hold(TAB_1));
      advance(1_000);
      await service.poll(USER_2, watch(TAB_2));
      await service.leave(USER_1, { resource: editing, tab: TAB_1 });
      advance(1_000);
      assert.equal((await service.poll(USER_2, watch(TAB_2))).lease, null);
      assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
        userId: USER_2,
        mine: true,
      });
    });

    it('gives the document up when its holder goes back to watching', async function () {
      const { service, store, advance } = build({ leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, hold(TAB_1));
      advance(1_000);
      assert.deepEqual((await service.poll(USER_2, watch(TAB_2))).lease, {
        userId: USER_1,
        mine: false,
      });

      advance(1_000);
      assert.equal((await service.poll(USER_1, watch(TAB_1))).lease, null);
      assert.deepEqual(await store.holders(0), []);
      assert.deepEqual((await service.poll(USER_2, hold(TAB_2))).lease, {
        userId: USER_2,
        mine: true,
      });
    });

    it('answers a holder that goes back to watching from who holds the document after it let go', async function () {
      let reach!: () => void;
      const reached = new Promise<void>((resolve) => {
        reach = resolve;
      });
      let resume!: () => void;
      const paused = new Promise<void>((resolve) => {
        resume = resolve;
      });
      class PausedRelease extends MemoryPresenceStore {
        async release(member: string): Promise<void> {
          reach();
          await paused;
          return super.release(member);
        }
      }
      const { service } = build({ store: new PausedRelease(), leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, hold(TAB_1));

      // It has read itself as the holder, and not yet let go.
      const watching = service.poll(USER_1, watch(TAB_1));
      await reached;
      assert.deepEqual((await service.poll(USER_2, take(TAB_2))).lease, {
        userId: USER_2,
        mine: true,
      });
      resume();

      assert.deepEqual((await watching).lease, { userId: USER_2, mine: false });
      assert.equal((await service.poll(USER_2, hold(TAB_2))).lease?.mine, true);
    });

    it('gives the lease to the first of two tabs that ask at nearly the same time', async function () {
      const { service, advance } = build({ leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, watch(TAB_1));
      await service.poll(USER_2, watch(TAB_2));
      advance(5_000);
      const winner = await service.poll(USER_2, hold(TAB_2));
      advance(1);
      const loser = await service.poll(USER_1, hold(TAB_1));
      assert.deepEqual(winner.lease, { userId: USER_2, mine: true });
      assert.deepEqual(loser.lease, { userId: USER_2, mine: false });
    });

    it('records the mode a poll asked in', async function () {
      const { service, recorded } = build({ leaseWindowMs: LEASE_WINDOW });
      await service.poll(USER_1, watch(TAB_1));
      assert.equal(recorded[0].value.lease, 'watch');
    });
  });

  it('rejects a lease with no document being edited', async function () {
    const { service } = build();
    await assert.rejects(
      service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }], lease: 'hold' }),
      { errorType: 'ValidationError' },
    );
    await assert.rejects(service.poll(USER_1, { editing, tab: TAB_1, lease: 'keep' }), {
      errorType: 'ValidationError',
    });
  });

  it('rejects a lease from a caller that does not name its tab', async function () {
    const { service, store } = build();
    // Unnamed, a user's tabs are one member, and each would be told the lease is its own.
    for (const lease of ['hold', 'take', 'watch']) {
      await assert.rejects(service.poll(USER_1, { editing, lease }), {
        errorType: 'ValidationError',
      });
    }
    assert.deepEqual(await store.holders(0), []);
    assert.equal('lease' in (await service.poll(USER_1, { editing })), false);
  });

  it('records which lease a poll asked for, and a failed hold as degraded', async function () {
    const { service, recorded } = build({ leaseWindowMs: LEASE_WINDOW });
    await service.poll(USER_1, take(TAB_1));
    assert.equal(recorded[0].value.lease, 'take');

    const failing = build({
      store: {
        kind: 'redis',
        touch: async () => undefined,
        read: async () => [],
        remove: async () => undefined,
        hold: async () => {
          throw new Error("NOPERM User 1 has no permissions to run the 'zadd' command");
        },
        holders: async () => [],
        release: async () => undefined,
      },
    });
    await assert.rejects(failing.service.poll(USER_1, hold(TAB_1)), { statusCode: 503 });
    assert.deepEqual(
      failing.recorded.map((entry) => [entry.name, entry.value.operation ?? entry.value.lease]),
      [
        ['presence-degraded', 'hold'],
        ['presence-poll', 'hold'],
      ],
    );
  });
});

describe('resolveRetentionMs', function () {
  it('defaults when the adapter has no usable ttl', function () {
    assert.equal(resolveRetentionMs(undefined), DEFAULT_RETENTION_MS);
    assert.equal(resolveRetentionMs('60'), DEFAULT_RETENTION_MS);
    assert.equal(resolveRetentionMs(0), DEFAULT_RETENTION_MS);
    assert.equal(resolveRetentionMs(Number.NaN), DEFAULT_RETENTION_MS);
  });

  it('takes the adapter ttl in seconds, no shorter than the lease window', function () {
    assert.equal(resolveRetentionMs(300), 300_000);
    assert.equal(resolveRetentionMs(3_600), 3_600_000);
    assert.equal(resolveRetentionMs(60), MIN_RETENTION_MS);
    assert.equal(MIN_RETENTION_MS, DEFAULT_LEASE_WINDOW_MS);
  });
});
