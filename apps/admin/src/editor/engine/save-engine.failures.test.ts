import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS, TIMED_SAVE_INTERVAL_MS } from './save-engine';
import {
  BASELINE,
  conflict,
  flush,
  FUTURE,
  hostLimit,
  PAST,
  setup,
  transport,
  unknown,
  validation,
  type Harness,
} from './__test-utils__/engine-harness';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSaveEngine', () => {
  describe('a failed save keeps the post dirty and recoverable', () => {
    it.each([validation, hostLimit, transport, unknown])(
      'surfaces a $kind error to the dispatcher and still runs the pending explicit save',
      async (error) => {
        const h = setup();
        const failing = h.engine.dispatch('field');
        const explicit = h.engine.dispatch('explicit');

        await h.fail(error);
        await expect(failing).resolves.toEqual({ kind: 'failed', error, executedAs: 'field' });
        expect(h.snapshot.isDirty).toBe(true);
        expect(h.execute).toHaveBeenCalledTimes(2);
        expect(h.requests[1]).toMatchObject({ command: { kind: 'explicit' } });

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
        executedAs: 'explicit',
      });
    });

    it('treats a rejected prepare as an unknown error before any IO starts', async () => {
      const h = setup();
      const cause = new Error('invalid candidate');
      h.prepare.mockRejectedValueOnce(cause);

      await expect(h.engine.dispatch('explicit')).resolves.toEqual({
        kind: 'failed',
        error: { kind: 'unknown', message: 'invalid candidate', cause },
        executedAs: 'explicit',
      });
      expect(h.execute).not.toHaveBeenCalled();
      expect(h.engine.getState()).toMatchObject({ kind: 'error', intent: 'explicit' });
    });
  });

  describe('collisions', () => {
    // Two engines over the same post; the fake server accepts only the updated_at it last returned.
    it('gives the second writer a typed conflict that halts its automatic saves until it reloads', async () => {
      const server = { updatedAt: BASELINE };
      async function respond(h: Harness) {
        await flush();
        if (h.nextRequest().snapshot.updatedAt !== server.updatedAt) {
          await h.fail(conflict);
          return;
        }
        server.updatedAt = new Date(Date.parse(server.updatedAt) + 60000).toISOString();
        await h.succeed({ updatedAt: server.updatedAt });
      }
      const first = setup();
      const second = setup();

      void first.engine.dispatch('explicit');
      await respond(first);
      expect(first.snapshot.updatedAt).toBe(server.updatedAt);

      const explicit = second.engine.dispatch('explicit');
      await respond(second);
      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: conflict,
        executedAs: 'explicit',
      });
      expect(second.engine.getState()).toEqual({
        kind: 'conflict',
        intent: 'explicit',
        error: conflict,
      });
      expect(second.snapshot).toMatchObject({ isDirty: true, updatedAt: BASELINE });

      await expect(second.engine.dispatch('autosave')).resolves.toEqual({
        kind: 'dropped',
        reason: 'conflict',
      });
      await expect(second.engine.dispatch('field')).resolves.toEqual({
        kind: 'dropped',
        reason: 'conflict',
      });
      await expect(second.engine.leaveRequested()).resolves.toBe('confirm');

      const retry = second.engine.dispatch('explicit');
      await flush();
      expect(second.execute).toHaveBeenCalledTimes(2);
      await respond(second);
      await expect(retry).resolves.toMatchObject({ kind: 'failed', error: conflict });

      second.patch({ updatedAt: server.updatedAt });
      void second.engine.dispatch('autosave');
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
      expect(second.execute).toHaveBeenCalledTimes(3);
      await respond(second);
      expect(second.engine.getState()).toEqual({ kind: 'idle' });
      expect(second.snapshot).toMatchObject({ isDirty: false, updatedAt: server.updatedAt });
    });

    it('only lifts a conflict for a non-empty replacement collision token', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await h.fail(conflict);

      h.patch({ updatedAt: null });
      expect(h.engine.contentReloaded()).toBe(false);
      expect(h.engine.getState()).toEqual({
        kind: 'conflict',
        intent: 'explicit',
        error: conflict,
      });

      expect(h.engine.contentReloaded('not-a-date')).toBe(false);
      expect(h.engine.getState()).toEqual({
        kind: 'conflict',
        intent: 'explicit',
        error: conflict,
      });

      h.patch({ updatedAt: BASELINE });
      expect(h.engine.contentReloaded()).toBe(false);
      expect(h.engine.getState()).toEqual({
        kind: 'conflict',
        intent: 'explicit',
        error: conflict,
      });

      expect(h.engine.contentReloaded(FUTURE)).toBe(true);
      expect(h.engine.getState()).toEqual({ kind: 'idle' });
    });

    it('drops queued background work on a conflict and keeps the content dirty', async () => {
      const h = setup();
      void h.engine.dispatch('explicit');
      await flush();
      h.edit();
      const autosave = h.engine.dispatch('autosave');

      await h.fail(conflict);
      await expect(autosave).resolves.toEqual({ kind: 'dropped', reason: 'conflict' });
      await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL_MS);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.snapshot).toMatchObject({ isDirty: true, version: 2 });
    });

    it('never auto-retries a pending explicit save against the stale baseline', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      const explicit = h.engine.dispatch('explicit');

      await h.fail(conflict);
      await expect(explicit).resolves.toEqual({ kind: 'dropped', reason: 'conflict' });
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(h.engine.getState()).toEqual({ kind: 'conflict', intent: 'field', error: conflict });

      void h.engine.dispatch('explicit');
      await flush();
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('drains a publish with the updated_at the preceding save reconciled', async () => {
      const h = setup();
      void h.engine.dispatch('field');
      const publish = h.engine.dispatch('publish');

      await h.succeed({ updatedAt: '2026-09-02T12:30:00.000Z' });
      expect(h.requests[1]).toMatchObject({
        command: { kind: 'publish' },
        snapshot: { updatedAt: '2026-09-02T12:30:00.000Z' },
      });

      await h.succeed();
      await expect(publish).resolves.toMatchObject({ kind: 'saved', executedAs: 'publish' });
    });

    it('fails a past-scheduled explicit save whose changed publish time the server rejects', async () => {
      const h = setup({ status: 'scheduled', publishedAt: PAST });
      const explicit = h.engine.dispatch('explicit');
      await h.fail(validation);

      await expect(explicit).resolves.toEqual({
        kind: 'failed',
        error: validation,
        executedAs: 'explicit',
      });
      expect(h.snapshot).toMatchObject({ isDirty: true, status: 'scheduled', publishedAt: PAST });
      expect(h.engine.getState()).toEqual({ kind: 'error', intent: 'explicit', error: validation });
    });
  });
});
