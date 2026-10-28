import assert from 'node:assert/strict';
import {
  EditorPresenceService,
  type PresenceMetrics,
} from '../../../../../core/server/services/editor-presence/editor-presence-service';
import { MemoryPresenceStore } from '../../../../../core/server/services/editor-presence/memory-presence-store';
import type { PresenceStore } from '../../../../../core/server/services/editor-presence/presence-store';

const POST_A = 'a'.repeat(24);
const POST_B = 'b'.repeat(24);
const PAGE_C = 'c'.repeat(24);
const USER_1 = '1'.repeat(24);
const USER_2 = '2'.repeat(24);
const USER_3 = '3'.repeat(24);

function build(overrides: { store?: PresenceStore; limit?: number } = {}) {
  let now = 1_000_000;
  const recorded: Array<{ name: string; value: Record<string, unknown> }> = [];
  const metrics: PresenceMetrics = {
    metric: (name, value) => recorded.push({ name, value }),
  };
  const store = overrides.store ?? new MemoryPresenceStore();
  const service = new EditorPresenceService({
    store,
    metrics,
    rateLimit: { limit: overrides.limit ?? 100, windowMs: 10_000 },
    now: () => now,
    activeWindowMs: 60_000,
    retentionMs: 60_000,
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

  it('answers an empty request without touching the store', async function () {
    const failing: PresenceStore = {
      kind: 'memory',
      touch: async () => assert.fail('touch called'),
      read: async () => assert.fail('read called'),
      remove: async () => assert.fail('remove called'),
    };
    const { service, now } = build({ store: failing });
    assert.deepEqual(await service.poll(USER_1, {}), { active: [], serverTime: now });
    assert.deepEqual(await service.poll(USER_1, undefined), { active: [], serverTime: now });
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

  it('collapses several tabs of one user to one entry with the latest heartbeat', async function () {
    const { service, advance, now: first } = build();
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    advance(5_000);
    await service.poll(USER_2, { editing: { id: POST_A, type: 'post' } });
    const result = await service.poll(USER_1, { resources: [{ id: POST_A, type: 'post' }] });
    assert.equal(result.active.length, 1);
    assert.equal(result.active[0].ts, first + 5_000);
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
      'string',
    ];
    for (const input of cases) {
      await assert.rejects(service.poll(USER_1, input), { errorType: 'ValidationError' });
    }
    await assert.rejects(service.leave(USER_1, {}), { errorType: 'ValidationError' });
  });

  it('refuses requests beyond the per-user limit', async function () {
    const { service, recorded } = build({ limit: 2 });
    await service.poll(USER_1, {});
    await service.poll(USER_1, {});
    await assert.rejects(service.poll(USER_1, {}), { errorType: 'TooManyRequestsError' });
    await service.poll(USER_2, {});
    assert.deepEqual(recorded.filter((entry) => entry.name === 'presence-rate-limited').length, 1);
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

  it('propagates store failures and records them', async function () {
    const failing: PresenceStore = {
      kind: 'redis',
      touch: async () => {
        throw new Error('connection closed');
      },
      read: async () => [],
      remove: async () => undefined,
    };
    const { service, recorded } = build({ store: failing });
    await assert.rejects(
      service.poll(USER_1, { editing: { id: POST_A, type: 'post' } }),
      /connection closed/,
    );
    assert.equal(recorded[0].value.outcome, 'error');
    assert.equal(recorded[0].value.store, 'redis');
  });
});
