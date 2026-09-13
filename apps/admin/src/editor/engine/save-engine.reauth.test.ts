import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS, TIMED_SAVE_INTERVAL_MS, type DispatchIntent } from './save-engine';
import { dispatchAny, flush, PAST, sessionInvalid, setup } from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('session expiry loses nothing', () => {
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
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(autosave).resolves.toMatchObject({ kind: 'saved' });
      await expect(laterAutosave).resolves.toMatchObject({ kind: 'saved' });
      expect(h.snapshot.isDirty).toBe(false);
    });

    it('lets a higher-priority intent queued during re-auth carry the frozen save', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);

      const explicit = h.engine.dispatch('explicit');
      expect(h.execute).toHaveBeenCalledTimes(1);

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'explicit' }, saveRevision: true });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
      await expect(field).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
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

    it.each<DispatchIntent>(['publish', 'schedule', 'revert'])(
      'asks before discarding a clean %s command frozen behind re-auth',
      async (intent) => {
        const h = setup({
          isDirty: false,
          ...(intent === 'revert' ? { status: 'published', publishedAt: PAST } : {}),
        });
        void dispatchAny(h.engine, intent);
        await h.fail(sessionInvalid);

        expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent });
        await expect(h.engine.leaveRequested()).resolves.toBe('confirm');
        expect(h.execute).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('re-auth outcomes', () => {
    it.each<DispatchIntent>(['publish', 'schedule', 'revert'])(
      'never auto-fires a %s after re-auth; it resolves needs-retry',
      async (intent) => {
        const h = setup(intent === 'revert' ? { status: 'published', publishedAt: PAST } : {});
        const completion = dispatchAny(h.engine, intent);
        await h.fail(sessionInvalid);

        h.engine.reauthSucceeded();
        await flush();
        await expect(completion).resolves.toEqual({ kind: 'needs-retry' });
        expect(h.execute).toHaveBeenCalledTimes(1);

        // A dirty draft resumes autosaving on its own; a published post has nothing to resume.
        if (intent === 'revert') {
          expect(h.engine.getState()).toEqual({ kind: 'idle' });
          await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
          expect(h.execute).toHaveBeenCalledTimes(1);
        } else {
          expect(h.engine.getState()).toEqual({ kind: 'debouncing' });
          await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
          expect(h.execute).toHaveBeenCalledTimes(2);
          expect(h.requests[1]).toMatchObject({
            command: { kind: 'autosave' },
            target: { status: 'draft' },
          });
        }
      },
    );

    it('never auto-fires a publish queued while a background save was frozen', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);
      const publish = h.engine.dispatch('publish', { newsletter: 'weekly' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'field' },
        target: { status: 'draft', publishedAt: null },
      });

      await h.succeed();
      await expect(field).resolves.toMatchObject({ kind: 'saved', executedAs: 'field' });
      expect(h.snapshot.status).toBe('draft');
    });

    it('re-runs a frozen explicit rider on its own but never the publish it coalesced into', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      const rider = h.engine.dispatch('explicit');
      const publish = h.engine.dispatch('publish');
      await h.succeed();
      expect(h.requests[1]).toMatchObject({ command: { kind: 'publish' }, saveRevision: true });

      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'publish' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(h.requests[2]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'draft' },
        saveRevision: true,
      });

      await h.succeed();
      await expect(rider).resolves.toMatchObject({ kind: 'saved', executedAs: 'explicit' });
    });

    it('judges re-auth by the resolved effect: a frozen revert whose post is already a draft re-runs', async () => {
      const h = setup({ status: 'published', publishedAt: PAST });
      const revert = h.engine.dispatch('revert');
      await h.fail(sessionInvalid);

      h.patch({ status: 'draft' });
      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'revert' },
        target: { status: 'draft', publishedAt: PAST },
      });

      await h.succeed();
      await expect(revert).resolves.toMatchObject({ kind: 'saved', executedAs: 'revert' });
    });

    it('never double-creates a new post whose publish needs retry after re-auth', async () => {
      const h = setup({ id: null, updatedAt: null });
      const publish = h.engine.dispatch('publish');
      await h.fail(sessionInvalid);
      const explicit = h.engine.dispatch('explicit');

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'explicit' },
        target: { status: 'draft' },
        snapshot: { id: null },
      });
      expect(h.engine.getState()).toEqual({ kind: 'saving', intent: 'explicit' });

      await h.succeed();
      await expect(explicit).resolves.toMatchObject({ kind: 'saved' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.maxConcurrent()).toBe(1);
    });

    it('resumes a new post’s autosave after a failed publish without a concurrent create', async () => {
      const h = setup({ id: null, updatedAt: null });
      void h.engine.dispatch('publish');
      await h.fail(sessionInvalid);

      h.engine.reauthSucceeded();
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
      });

      await h.succeed();
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.maxConcurrent()).toBe(1);
    });

    it('re-saves rider content folded into a publish that needs retry', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      const publish = h.engine.dispatch('publish');

      await h.succeed();
      expect(h.requests[1]).toMatchObject({ command: { kind: 'publish' } });
      await h.fail(sessionInvalid);
      expect(h.engine.getState()).toEqual({ kind: 'reauth-pending', intent: 'publish' });

      h.engine.reauthSucceeded();
      await flush();
      await expect(publish).resolves.toEqual({ kind: 'needs-retry' });
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(h.requests[2]).toMatchObject({
        command: { kind: 'autosave' },
        target: { status: 'draft' },
        snapshot: { version: 2 },
      });

      await h.succeed();
      await expect(autosave).resolves.toMatchObject({ kind: 'saved', executedAs: 'autosave' });
    });

    it('re-arms the autosave when the snapshot cannot be read after re-auth', async () => {
      const h = setup();
      void h.engine.dispatch('publish');
      await h.fail(sessionInvalid);

      h.throwNextSnapshot(new Error('snapshot exploded'));
      h.engine.reauthSucceeded();
      await flush();
      expect(h.engine.getState()).toEqual({ kind: 'debouncing' });

      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(h.execute).toHaveBeenCalledTimes(2);
      expect(h.requests[1]).toMatchObject({ command: { kind: 'autosave' } });
    });

    it('settles every waiter with the session error when re-auth is abandoned', async () => {
      const h = setup();
      const field = h.engine.dispatch('field');
      await h.fail(sessionInvalid);
      const explicit = h.engine.dispatch('explicit');
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      h.engine.reauthAbandoned();
      await expect(field).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'field',
      });
      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'explicit',
      });
      await expect(autosave).resolves.toEqual({
        kind: 'failed',
        error: sessionInvalid,
        executedAs: 'autosave',
      });
      expect(h.engine.getState()).toEqual({
        kind: 'error',
        intent: 'field',
        error: sessionInvalid,
      });

      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      void h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('ignores reauthAbandoned when nothing is waiting on re-authentication', () => {
      const h = setup();
      h.engine.reauthAbandoned();
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });
  });
});
