import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, type Deferred } from '@/utils/deferred';
import {
  AUTOSAVE_DEBOUNCE_MS,
  createSaveEngine,
  resolveStatus,
  TIMED_SAVE_INTERVAL_MS,
  zeroMilliseconds,
  type DispatchIntent,
  type PostStatus,
  type SaveEngineState,
  type SaveError,
  type SaveIntent,
  type SaveOutcome,
  type SaveRequest,
  type SaveSnapshot,
} from './save-engine';

const NOW = Date.parse('2026-09-02T12:00:00.000Z');
const FUTURE = '2026-09-03T09:30:00.000Z';
const PAST = '2026-09-01T09:30:00.000Z';

const flush = () => vi.advanceTimersByTimeAsync(0);

function setup(overrides: Partial<SaveSnapshot> = {}) {
  let snapshot: SaveSnapshot = {
    id: 'post-1',
    isNew: false,
    status: 'draft',
    publishedAt: null,
    willPublish: false,
    willSchedule: false,
    isDirty: true,
    changedSinceLastRevision: true,
    version: 1,
    ...overrides,
  };
  const requests: SaveRequest[] = [];
  const outstanding: Deferred<SaveOutcome>[] = [];
  const states: SaveEngineState[] = [];
  let concurrent = 0;
  let maxConcurrent = 0;
  let snapshotError: Error | null = null;

  const execute = vi.fn(async (request: SaveRequest) => {
    requests.push(request);
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    const outcome = deferred<SaveOutcome>();
    outstanding.push(outcome);
    try {
      return await outcome.promise;
    } finally {
      concurrent -= 1;
    }
  });

  const engine = createSaveEngine({
    getSnapshot: () => {
      if (snapshotError) {
        const error = snapshotError;
        snapshotError = null;
        throw error;
      }
      return snapshot;
    },
    execute,
    now: () => NOW,
    onStateChange: (state) => states.push(state),
  });

  function nextRequest() {
    return requests[requests.length - outstanding.length];
  }

  return {
    engine,
    execute,
    requests,
    states,
    get snapshot() {
      return snapshot;
    },
    maxConcurrent: () => maxConcurrent,
    patch(changes: Partial<SaveSnapshot>) {
      snapshot = { ...snapshot, ...changes };
    },
    edit() {
      snapshot = { ...snapshot, isDirty: true, version: snapshot.version + 1 };
    },
    throwNextSnapshot(error: Error) {
      snapshotError = error;
    },
    // Mirrors what the editor does on a successful response: adopt id/status, dirty iff edited since the request left.
    async succeed(changes: Partial<SaveSnapshot> = {}) {
      const request = nextRequest();
      const outcome = outstanding.shift()!;
      const id = request.snapshot.id ?? 'post-1';
      snapshot = {
        ...snapshot,
        id,
        isNew: false,
        status: request.status,
        isDirty: snapshot.version !== request.snapshot.version,
        ...changes,
      };
      outcome.resolve({
        ok: true,
        result: { id, status: request.status, updatedAt: '2026-09-02T12:00:00.000Z' },
      });
      await flush();
    },
    async fail(error: SaveError) {
      outstanding.shift()!.resolve({ ok: false, error });
      await flush();
    },
    async reject(cause: unknown) {
      outstanding.shift()!.reject(cause);
      await flush();
    },
  };
}

const validation: SaveError = { kind: 'validation', message: 'Title is too long' };
const hostLimit: SaveError = { kind: 'host-limit', message: 'Upgrade required' };
const transport: SaveError = { kind: 'transport', message: 'Server unreachable' };
const sessionInvalid: SaveError = { kind: 'session-invalid', message: 'Unauthorized' };
const notFound: SaveError = { kind: 'not-found', message: 'Post not found' };
const unknown: SaveError = { kind: 'unknown', message: 'Boom' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolveStatus', () => {
  const rows: Array<[SaveIntent, PostStatus, boolean, boolean, string | null, PostStatus]> = [
    ['autosave', 'draft', true, false, null, 'draft'],
    ['timed', 'draft', false, true, null, 'draft'],
    ['field', 'draft', true, true, null, 'draft'],
    ['explicit', 'draft', false, false, null, 'draft'],
    ['explicit', 'draft', true, false, null, 'published'],
    ['explicit', 'draft', false, true, FUTURE, 'scheduled'],
    ['explicit', 'draft', true, true, FUTURE, 'published'],
    ['explicit', 'published', false, false, PAST, 'published'],
    ['explicit', 'sent', false, false, PAST, 'sent'],
    ['explicit', 'scheduled', false, true, FUTURE, 'scheduled'],
    ['explicit', 'scheduled', false, false, FUTURE, 'scheduled'],
    ['explicit', 'scheduled', false, false, PAST, 'draft'],
    ['explicit', 'scheduled', false, true, PAST, 'published'],
    ['explicit', 'scheduled', true, false, PAST, 'published'],
    ['leave', 'published', false, false, PAST, 'published'],
    ['leave', 'draft', true, true, null, 'draft'],
    ['publish', 'draft', false, false, null, 'published'],
    ['publish', 'draft', false, true, FUTURE, 'scheduled'],
    ['revert', 'published', false, false, PAST, 'draft'],
    ['revert', 'scheduled', false, true, FUTURE, 'draft'],
  ];

  it.each(rows)(
    '%s on a %s post (willPublish=%s, willSchedule=%s, publishedAt=%s) resolves to %s',
    (intent, status, willPublish, willSchedule, publishedAt, expected) => {
      expect(resolveStatus({ status, publishedAt, willPublish, willSchedule }, intent, NOW)).toBe(
        expected,
      );
    },
  );
});

describe('zeroMilliseconds', () => {
  it('drops milliseconds and leaves everything else untouched', () => {
    expect(zeroMilliseconds('2026-09-03T09:30:15.789Z')).toBe('2026-09-03T09:30:15.000Z');
    expect(zeroMilliseconds(null)).toBeNull();
    expect(zeroMilliseconds('not a date')).toBe('not a date');
  });
});

describe('createSaveEngine', () => {
  describe('invariant 1: background saves never change status', () => {
    it('pins background intents to draft and never requests a revision', () => {
      const h = setup({ willPublish: true, willSchedule: true });

      void h.engine.dispatch('field');

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        intent: 'field',
        status: 'draft',
        saveRevision: false,
      });
    });

    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'drops background intents for a %s post',
      async (status) => {
        const h = setup({ status, publishedAt: FUTURE });

        const completions = await Promise.all([
          h.engine.dispatch('autosave'),
          h.engine.dispatch('field'),
        ]);
        await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS + AUTOSAVE_DEBOUNCE_MS);

        expect(completions).toEqual(Array(2).fill({ kind: 'dropped', reason: 'not-draft' }));
        expect(h.execute).not.toHaveBeenCalled();
      },
    );

    it('drops a pending background save once the in-flight save has published the post', async () => {
      const h = setup({ willPublish: true });
      const publish = h.engine.dispatch('publish');
      const field = h.engine.dispatch('field');

      await h.succeed();

      expect(h.snapshot.status).toBe('published');
      await expect(publish).resolves.toMatchObject({ kind: 'saved' });
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'not-draft' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 2: single flight, payload built at execution time, coalescing loses nothing', () => {
    it('runs one save at a time and builds each payload from the snapshot current at execution', async () => {
      const h = setup();
      const first = h.engine.dispatch('explicit');
      h.edit();
      const second = h.engine.dispatch('field');
      h.edit();
      const third = h.engine.dispatch('explicit');

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'explicit',
      });
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ intent: 'explicit', snapshot: { version: 3 } });

      await h.succeed();
      await expect(first).resolves.toMatchObject({ kind: 'saved' });
      await expect(second).resolves.toMatchObject({ kind: 'saved' });
      await expect(third).resolves.toMatchObject({ kind: 'saved' });
      expect(h.maxConcurrent()).toBe(1);
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('restarts the autosave debounce on every edit and fires once, 3s after the last one', async () => {
      const h = setup();

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(2000);
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(2000);
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'debouncing' });

      await vi.advanceTimersByTimeAsync(1000);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({ intent: 'autosave', snapshot: { version: 2 } });
    });
  });

  describe('invariant 3: session expiry loses nothing', () => {
    it('freezes the queue on 401 and re-dispatches the failed save after re-authentication', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'autosave' });

      h.edit();
      const laterAutosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'autosave' });

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ intent: 'autosave', snapshot: { version: 2 } });

      await h.succeed();
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
      await expect(laterAutosave).resolves.toMatchObject({ kind: 'saved' });
      expect(h.snapshot.isDirty).toBe(false);
    });

    it('lets a higher-priority intent queued during re-auth win the re-dispatch', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      await h.fail(sessionInvalid);

      const explicit = h.engine.dispatch('explicit');
      expect(h.execute).toHaveBeenCalledTimes(1);

      h.engine.reauthSucceeded();
      await flush();
      expect(h.requests[1]).toMatchObject({ intent: 'explicit', saveRevision: true });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
    });

    it('ignores reauthSucceeded when nothing is waiting on re-authentication', async () => {
      const h = setup();
      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('asks for confirmation instead of enqueueing a leave save while re-auth is pending', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      await h.fail(sessionInvalid);

      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 4: save-on-leave fires at most once and only for dirty drafts', () => {
    it('saves a dirty draft with unrevisioned changes exactly once, with a revision, then proceeds', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({ intent: 'leave', status: 'draft', saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('proceeds without saving when the post is clean', async () => {
      const h = setup({ isDirty: false });
      await expect(h.engine.leaveRequested()).resolves.toBe('proceed');
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('never saves a dirty published post on leave and asks for confirmation', async () => {
      const h = setup({ status: 'published', publishedAt: PAST });
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('cancels an armed autosave and saves once for an already-revisioned dirty draft', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('autosave');

      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ intent: 'leave', saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('does not save a second time in the same leave attempt when the first leave save failed', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      h.edit();
      void h.engine.dispatch('autosave');

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('invariant 6: a failed save keeps the post dirty and recoverable', () => {
    it.each([validation, hostLimit, transport, unknown])(
      'surfaces a $kind error to the dispatcher and still runs the pending explicit save',
      async (error) => {
        const h = setup();
        const failing = h.engine.dispatch('field');
        const explicit = h.engine.dispatch('explicit');

        await h.fail(error);
        await expect(failing).resolves.toEqual({ kind: 'failed', error });
        expect(h.snapshot.isDirty).toBe(true);
        expect(h.execute).toHaveBeenCalledTimes(2);
        expect(h.requests[1]).toMatchObject({ intent: 'explicit' });

        await h.succeed();
        await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
      },
    );

    it('reports an error state until the next save starts', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: transport });

      void h.engine.dispatch('explicit');
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });
    });

    it('treats a rejected execute as an unknown error rather than swallowing it', async () => {
      const h = setup();
      const completion = h.engine.dispatch('explicit');
      const cause = new Error('network down');

      await h.reject(cause);

      await expect(completion).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'network down', cause },
      });
    });
  });

  describe('invariant 7: only explicit and leave saves create revisions', () => {
    it.each<[DispatchIntent, boolean]>([
      ['explicit', true],
      ['leave', true],
      ['autosave', false],
      ['field', false],
      ['publish', false],
      ['revert', false],
    ])('%s requests save_revision=%s', async (intent, saveRevision) => {
      const h = setup();
      void h.engine.dispatch(intent);
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({ intent, saveRevision });
    });
  });

  describe('invariant 10: scheduled saves zero milliseconds and preserve the publish time', () => {
    it('serializes a future scheduled post with a zeroed publish time across saves', async () => {
      const h = setup({
        status: 'scheduled',
        willSchedule: true,
        publishedAt: '2026-09-03T09:30:15.789Z',
      });

      void h.engine.dispatch('explicit');
      await h.succeed();
      void h.engine.dispatch('explicit');
      await h.succeed();

      expect(h.requests).toHaveLength(2);
      for (const request of h.requests) {
        expect(request).toMatchObject({
          status: 'scheduled',
          publishedAt: '2026-09-03T09:30:15.000Z',
        });
      }
    });

    it('compares a past scheduled time after zeroing milliseconds', () => {
      const publishedAt = new Date(NOW + 500).toISOString();
      expect(
        resolveStatus(
          { status: 'scheduled', publishedAt, willPublish: false, willSchedule: true },
          'explicit',
          NOW,
        ),
      ).toBe('scheduled');
      expect(
        resolveStatus(
          { status: 'scheduled', publishedAt, willPublish: false, willSchedule: true },
          'explicit',
          NOW + 1000,
        ),
      ).toBe('published');
    });
  });

  describe('interleavings', () => {
    it('saves a new post immediately on its first edit', () => {
      const h = setup({ id: null, isNew: true });
      void h.engine.dispatch('autosave');

      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        intent: 'autosave',
        status: 'draft',
        snapshot: { id: null },
      });
    });

    it('coalesces an autosave arriving during an in-flight create and rebuilds its payload', async () => {
      const h = setup({ id: null, isNew: true });
      const create = h.engine.dispatch('explicit');
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed({ id: 'post-1' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        intent: 'autosave',
        snapshot: { id: 'post-1', isNew: false, version: 2 },
      });

      await h.succeed();
      await expect(create).resolves.toMatchObject({ kind: 'saved' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
    });

    it('coalesces a debounced autosave that fires during a slow explicit save', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({ intent: 'autosave', snapshot: { version: 2 } });
    });

    it('lets an explicit save cancel a pending autosave debounce and supersede it', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(1000);

      const explicit = h.engine.dispatch('explicit');
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({ intent: 'explicit' });

      await h.succeed();
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
    });

    it('waits for an in-flight save on leave, then saves once with a revision', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ intent: 'leave', saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('lets publish win the pending slot over a queued autosave', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      h.edit();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'autosave',
      });

      h.patch({ willPublish: true });
      const publish = h.engine.dispatch('publish');
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'publish',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        intent: 'publish',
        status: 'published',
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(publish).resolves.toMatchObject({ kind: 'saved' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('halts permanently on a 404 for a known post id', async () => {
      const h = setup();
      const failing = h.engine.dispatch('explicit');
      h.edit();
      void h.engine.dispatch('autosave');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'halted' });
      await expect(failing).resolves.toEqual({ kind: 'failed', error: notFound });

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
      await expect(h.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
    });

    it('crashes on a 404 for a post that has no id yet', async () => {
      const h = setup({ id: null, isNew: true });
      void h.engine.dispatch('explicit');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'crashed' });
      await expect(h.engine.dispatch('field')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
    });

    it.each([validation, hostLimit])(
      'suppresses background saves after a $kind error until the snapshot changes',
      async (error) => {
        const h = setup();
        void h.engine.dispatch('explicit');
        await h.fail(error);
        expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error });

        await expect(h.engine.dispatch('autosave')).resolves.toEqual({
          kind: 'dropped',
          reason: 'suppressed',
        });
        await expect(h.engine.dispatch('field')).resolves.toEqual({
          kind: 'dropped',
          reason: 'suppressed',
        });
        await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
        expect(h.execute).toHaveBeenCalledTimes(1);

        void h.engine.dispatch('explicit');
        expect(h.execute).toHaveBeenCalledTimes(2);
        await h.fail(error);

        h.edit();
        void h.engine.dispatch('autosave');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(h.execute).toHaveBeenCalledTimes(3);
        expect(h.requests[2]).toMatchObject({ intent: 'autosave', snapshot: { version: 2 } });
      },
    );

    it('keeps autosaving after a transport error', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ intent: 'autosave' });
    });

    it('forces a timed save after 60s of continuous editing', async () => {
      const h = setup();
      const autosaves: Promise<unknown>[] = [];
      for (let second = 0; second < 60; second += 1) {
        h.edit();
        autosaves.push(h.engine.dispatch('autosave'));
        await vi.advanceTimersByTimeAsync(1000);
      }

      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        intent: 'timed',
        status: 'draft',
        saveRevision: false,
        snapshot: { version: 61 },
      });

      await h.succeed();
      const completions = await Promise.all(autosaves);
      expect(completions).toHaveLength(60);
      for (const completion of completions) {
        expect(completion).toMatchObject({ kind: 'saved' });
      }
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('skips a background save that finds the post clean at execution time', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      h.patch({ isDirty: false });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('notifies subscribers of every transition until they unsubscribe', async () => {
      const h = setup();
      const seen: SaveEngineState[] = [];
      const unsubscribe = h.engine.subscribe((state) => seen.push(state));

      void h.engine.dispatch('explicit');
      await h.succeed();
      expect(seen).toEqual([{ kind: 'saving', intent: 'explicit' }, { kind: 'idle' }]);
      expect(h.states).toEqual(seen);

      unsubscribe();
      void h.engine.dispatch('explicit');
      expect(seen).toHaveLength(2);
    });

    it('dispose cancels timers and settles every outstanding dispatch', async () => {
      const h = setup();
      const explicit = h.engine.dispatch('explicit');
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      h.engine.dispose();
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'disposed' });

      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'dropped',
        reason: 'disposed',
      });
      await expect(h.engine.leaveRequested()).resolves.toBe('proceed');
      expect(h.engine.getState()).toEqual({ kind: 'disposed' });
    });
  });

  describe('leave outcomes', () => {
    it('asks for confirmation when the in-flight save it waited for fails', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('asks for confirmation when the leave save replacing an armed autosave fails', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('autosave');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ intent: 'leave' });

      await h.fail(transport);
      await expect(decision).resolves.toBe('confirm');
    });

    it('shares one leave save across concurrent leave requests', async () => {
      const h = setup();
      const first = h.engine.leaveRequested();
      const second = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      await expect(first).resolves.toBe('proceed');
      await expect(second).resolves.toBe('proceed');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('re-runs a leave save interrupted by re-auth and then proceeds', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'leave' });

      h.engine.reauthSucceeded();
      await flush();
      expect(h.requests[1]).toMatchObject({ intent: 'leave', saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('asks for confirmation when re-auth is abandoned during a leave save', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      await h.fail(sessionInvalid);

      h.engine.reauthAbandoned();
      await expect(decision).resolves.toBe('confirm');
      expect(h.engine.getState()).toEqual({
        kind: 'error',
        intent: 'leave',
        error: sessionInvalid,
      });
    });
  });

  describe('re-auth outcomes', () => {
    it.each<DispatchIntent>(['publish', 'revert'])(
      'never auto-fires a %s after re-auth; it resolves needs-retry',
      async (intent) => {
        const h = setup(
          intent === 'revert' ? { status: 'published', publishedAt: PAST } : { willPublish: true },
        );
        const completion = h.engine.dispatch(intent);
        await h.fail(sessionInvalid);

        h.engine.reauthSucceeded();
        await flush();
        await expect(completion).resolves.toEqual({ kind: 'needs-retry' });
        expect(h.execute).toHaveBeenCalledTimes(1);
        expect(h.engine.getState()).toEqual({ kind: 'idle' });
      },
    );

    it('settles every waiter with the session error when re-auth is abandoned', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);
      const explicit = h.engine.dispatch('explicit');
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      h.engine.reauthAbandoned();
      await expect(field).resolves.toEqual({ kind: 'failed', error: sessionInvalid });
      await expect(explicit).resolves.toEqual({ kind: 'failed', error: sessionInvalid });
      await expect(autosave).resolves.toEqual({ kind: 'failed', error: sessionInvalid });
      expect(h.engine.getState()).toEqual({
        kind: 'error',
        intent: 'field',
        error: sessionInvalid,
      });

      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      void h.engine.dispatch('explicit');
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('ignores reauthAbandoned when nothing is waiting on re-authentication', () => {
      const h = setup();
      h.engine.reauthAbandoned();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });
  });

  describe('coalescing and state reporting', () => {
    it('lets a contradictory revert replace a pending publish and marks the publish superseded', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      h.patch({ willPublish: true });
      const publish = h.engine.dispatch('publish');
      const revert = h.engine.dispatch('revert');

      await expect(publish).resolves.toEqual({ kind: 'superseded', by: 'revert' });
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'revert',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({ intent: 'revert', status: 'draft' });
      await h.succeed();
      await expect(revert).resolves.toMatchObject({ kind: 'saved' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('emits each state once even when several timers arm', () => {
      const h = setup();
      void h.engine.dispatch('autosave');
      h.edit();
      void h.engine.dispatch('autosave');
      h.edit();
      void h.engine.dispatch('autosave');

      expect(h.states).toEqual([{ kind: 'debouncing' }]);
    });

    it('keeps an error state while a dropped-clean autosave passes through', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);

      const autosave = h.engine.dispatch('autosave');
      h.patch({ isDirty: false });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: transport });
    });

    it('surfaces a throwing snapshot port as an unknown failure', async () => {
      const h = setup();
      const cause = new Error('snapshot exploded');
      h.throwNextSnapshot(cause);

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'snapshot exploded', cause },
      });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toMatchObject({ kind: 'error', intent: 'explicit' });
    });

    it('tolerates listeners that dispatch or unsubscribe during notification', () => {
      const h = setup();
      const seen: string[] = [];
      const unsubscribe = h.engine.subscribe((state) => {
        seen.push(state.kind);
        if (state.kind === 'saving') {
          unsubscribe();
          void h.engine.dispatch('field');
        }
      });
      h.engine.subscribe((state) => seen.push(`other:${state.kind}`));

      void h.engine.dispatch('explicit');

      expect(seen).toEqual(['saving', 'other:pending-coalesced', 'other:pending-coalesced']);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'field',
      });
    });
  });
});
