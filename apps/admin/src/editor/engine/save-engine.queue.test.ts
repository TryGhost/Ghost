import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOSAVE_DEBOUNCE_MS,
  createSaveEngine,
  TIMED_SAVE_INTERVAL_MS,
  type PostStatus,
  type SaveEngineState,
  type SaveOutcome,
  type SaveSnapshot,
} from './save-engine';
import {
  BASE,
  flush,
  FUTURE,
  hostLimit,
  idleSlug,
  notFound,
  PAST,
  sessionInvalid,
  setup,
  transport,
  validation,
} from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('background saves never change status', () => {
    it('persists a field change on a draft pinned to draft without a revision', async () => {
      const h = setup({ publishedAt: PAST });

      void h.engine.dispatch('field');
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'field', requiresRevision: false },
        target: { status: 'draft', publishedAt: PAST },
        saveRevision: false,
      });
    });

    it.each<PostStatus>(['published', 'scheduled', 'sent'])(
      'drops field and autosave intents for a %s post with a typed reason',
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
      const h = setup();
      const publish = h.engine.dispatch('publish');
      const field = h.engine.dispatch('field');

      await h.succeed();

      expect(h.snapshot.status).toBe('published');
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'not-draft' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('single flight: payloads are built at execution time and coalescing loses nothing', () => {
    it('runs one save at a time and builds each payload from the snapshot current at execution', async () => {
      const h = setup();
      const first = h.engine.dispatch('explicit');
      await flush();
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
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        snapshot: { version: 3 },
      });

      await h.succeed();
      await expect(first).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(second).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(third).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
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
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });
    });
  });

  describe('interleavings', () => {
    it('saves a new post immediately on its first edit', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('autosave');
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'autosave' });
      await flush();

      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
        snapshot: { id: null },
      });
    });

    it('coalesces an autosave arriving during an in-flight create and rebuilds its payload', async () => {
      const h = setup({ id: null, updatedAt: null });
      const create = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { id: 'post-1', version: 2 },
      });

      await h.succeed();
      await expect(create).resolves.toMatchObject({ kind: 'saved' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
    });

    it('coalesces a debounced autosave that fires during a slow explicit save', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'autosave',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });
    });

    it('lets an explicit save cancel a pending autosave debounce and supersede it', async () => {
      const h = setup();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(1000);

      const explicit = h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.requests[0]).toMatchObject({ command: { kind: 'explicit' } });

      await h.succeed();
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('waits for an in-flight save on leave, then saves once with a revision', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      await h.succeed();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

      await h.succeed();
      await expect(decision).resolves.toBe('proceed');
    });

    it('lets publish win the pending slot over a queued autosave', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'autosave',
      });

      const publish = h.engine.dispatch('publish');
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'field',
        pending: 'publish',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'publish' },
        target: { status: 'published' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('halts permanently on a 404 for a known post id', async () => {
      const h = setup();
      const failing = h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'halted' });
      await expect(failing).resolves.toEqual({
        kind: 'failed',
        error: notFound,
        executedAs: 'explicit',
      });
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'halted' });

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
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('explicit');

      await h.fail(notFound);
      expect(h.engine.getState()).toEqual({ kind: 'crashed' });
      await expect(h.engine.dispatch('field')).resolves.toEqual({
        kind: 'dropped',
        reason: 'halted',
      });
    });

    it.each([validation, hostLimit])(
      'suppresses background saves after a $kind error on a draft save until the snapshot changes',
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
        await flush();
        expect(h.execute).toHaveBeenCalledTimes(2);
        await h.fail(error);

        h.edit();
        void h.engine.dispatch('autosave');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(h.execute).toHaveBeenCalledTimes(3);
        expect(h.requests[2]).toMatchObject({
          command: { kind: 'autosave' },
          snapshot: { version: 2 },
        });
      },
    );

    it('scopes host-limit suppression to the failing operation: a publish limit never halts autosave', async () => {
      const h = setup();
      const publish = h.engine.dispatch('publish');
      await h.fail(hostLimit);
      await expect(publish).resolves.toMatchObject({ kind: 'failed', error: hostLimit });

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
    });

    it('keeps autosaving after a transport error', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(transport);

      void h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
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
        command: { kind: 'timed' },
        target: { status: 'draft' },
        saveRevision: false,
        snapshot: { version: 61 },
      });

      await h.succeed();
      const completions = await Promise.all(autosaves);
      expect(completions).toHaveLength(60);
      for (const completion of completions) {
        expect(completion).toMatchObject({ kind: 'saved', executedAs: 'timed' });
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

    it('skips a background save that finds the post clean after slug work settled', async () => {
      const h = setup();
      const release = h.holdSlugWork();
      const field = h.engine.dispatch('field');
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'field' });

      h.patch({ isDirty: false });
      await release();
      await expect(field).resolves.toEqual({ kind: 'dropped', reason: 'clean' });
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
      await flush();
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

  describe('coalescing and state reporting', () => {
    it('lets a later revert supersede only the pending publish and keeps its riders', async () => {
      const h = setup({ status: 'scheduled', publishedAt: FUTURE });
      void h.engine.dispatch('explicit');
      const rider = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      const revert = h.engine.dispatch('revert');

      await expect(publish).resolves.toEqual({ kind: 'superseded', by: 'revert' });
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'revert',
      });

      await h.succeed();
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'revert', requiresRevision: true },
        target: { status: 'draft', publishedAt: null, emailOnly: false },
        saveRevision: true,
      });
      await h.succeed();
      await expect(revert).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
      await expect(rider).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
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
        executedAs: 'explicit',
      });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toMatchObject({ kind: 'error', intent: 'explicit' });
    });

    it('resolves a background dispatch as failed when the snapshot port throws', async () => {
      const h = setup();
      const cause = new Error('snapshot exploded');
      h.throwNextSnapshot(cause);

      await expect(h.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'snapshot exploded', cause },
        executedAs: 'autosave',
      });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('asks for confirmation when the snapshot port throws during a leave decision', async () => {
      const h = setup();
      h.throwNextSnapshot(new Error('snapshot exploded'));
      await expect(h.engine.leaveRequested()).resolves.toBe('confirm');

      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' } });
      h.throwNextSnapshot(new Error('snapshot exploded'));
      await h.succeed();
      await expect(decision).resolves.toBe('confirm');
    });

    it('lets a leave decision through once the engine is disposed mid-wait', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(1);

      h.engine.dispose();
      await expect(decision).resolves.toBe('proceed');
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

      expect(seen).toEqual(['saving', 'other:pending-coalesced']);
      expect(h.engine.getState()).toEqual({
        kind: 'pending-coalesced',
        intent: 'explicit',
        pending: 'field',
      });
    });

    it('reports a throwing listener without interrupting the others', () => {
      const h = setup();
      const failure = new Error('listener exploded');
      const seen: SaveEngineState[] = [];
      h.engine.subscribe(() => {
        throw failure;
      });
      h.engine.subscribe((state) => seen.push(state));

      void h.engine.dispatch('explicit');

      expect(h.listenerErrors).toEqual([failure]);
      expect(seen).toEqual([{ kind: 'saving', intent: 'explicit' }]);
    });

    it('still saves when the onStateChange port throws, and reports it', async () => {
      const failure = new Error('state port exploded');
      const reported: unknown[] = [];
      const snapshot = { ...BASE, status: 'published', publishedAt: PAST } as SaveSnapshot;
      const engine = createSaveEngine({
        getSnapshot: () => snapshot,
        slug: idleSlug,
        prepare: (request) => Promise.resolve(request),
        execute: (prepared) =>
          Promise.resolve<SaveOutcome>({
            ok: true,
            result: { id: prepared.snapshot.id!, status: 'published', updatedAt: FUTURE },
          }),
        reconcile: () => {},
        onStateChange: () => {
          throw failure;
        },
        onListenerError: (error) => reported.push(error),
      });

      await expect(engine.dispatch('explicit')).resolves.toMatchObject({ kind: 'saved' });
      expect(engine.getState()).toEqual({ kind: 'idle' });
      expect(reported).toEqual([failure, failure]);
    });

    it('re-runs a frozen explicit after a superseded publish while the winning revert needs retry', async () => {
      const h = setup({ status: 'scheduled', publishedAt: FUTURE });
      const explicit = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      const revert = h.engine.dispatch('revert');
      await expect(publish).resolves.toEqual({ kind: 'superseded', by: 'revert' });

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'explicit' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(revert).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'scheduled', publishedAt: FUTURE },
      });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });
  });
});
