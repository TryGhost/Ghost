import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS } from './save-engine';
import { flush, PAST, sessionInvalid, setup, transport } from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('save-on-leave fires at most once and only for dirty drafts', () => {
    it('saves a dirty draft with unrevisioned changes exactly once, with a revision, then proceeds', async () => {
      const h = setup();
      const decision = h.engine.leaveRequested();
      await flush();

      expect(h.requests).toHaveLength(1);
      expect(h.requests[0]).toMatchObject({
        command: { kind: 'leave' },
        target: { status: 'draft' },
        saveRevision: true,
      });

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
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

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

    it('re-reads the post after the in-flight save and asks for confirmation when it is still dirty', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('explicit');
      const decision = h.engine.leaveRequested();
      await flush();

      h.edit();
      await h.succeed();
      expect(h.snapshot.isDirty).toBe(true);
      await expect(decision).resolves.toBe('confirm');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('asks for confirmation when the leave save replacing an armed autosave fails', async () => {
      const h = setup({ changedSinceLastRevision: false });
      void h.engine.dispatch('autosave');
      const decision = h.engine.leaveRequested();
      await flush();
      expect(h.requests[0]).toMatchObject({ command: { kind: 'leave' } });

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
      expect(h.requests[1]).toMatchObject({ command: { kind: 'leave' }, saveRevision: true });

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
});
